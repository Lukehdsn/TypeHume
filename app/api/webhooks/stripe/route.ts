import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getWordLimit, PlanType } from "@/lib/plans";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Stripe webhook request received");
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("❌ Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
      console.log("✅ Webhook signature verified, event type:", event.type);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Get user ID and plan from metadata
      const userId = session.client_reference_id;
      const plan = session.metadata?.plan as PlanType;
      const billingPeriod = session.metadata?.billingPeriod;

      console.log("Webhook - checkout.session.completed event received", {
        userId,
        plan,
        billingPeriod,
        metadata: session.metadata,
      });

      if (!userId || !plan) {
        console.error("Missing userId or plan in webhook metadata", {
          userId,
          plan,
          metadata: session.metadata,
        });
        return NextResponse.json(
          { error: "Invalid metadata" },
          { status: 400 }
        );
      }

      try {
        // Fetch user's current subscription before updating
        const { data: userData, error: fetchError } = await supabase
          .from("users")
          .select("stripe_subscription_id")
          .eq("id", userId)
          .maybeSingle();

        if (fetchError) {
          console.error("❌ Error fetching user subscription ID:", {
            message: fetchError.message,
            code: fetchError.code,
          });
          // Continue anyway, just won't cancel old subscription
        }

        const oldSubscriptionId = userData?.stripe_subscription_id;
        const newSubscriptionId = session.subscription as string;

        // Cancel old subscription if this is an upgrade (different subscription IDs)
        if (oldSubscriptionId && oldSubscriptionId !== newSubscriptionId) {
          try {
            console.log("🗑️ Cancelling old subscription:", oldSubscriptionId);
            await stripe.subscriptions.update(oldSubscriptionId, {
              cancel_at_period_end: true,
            });
            console.log("✅ Old subscription cancelled successfully:", oldSubscriptionId);
          } catch (cancelErr: any) {
            // Log error but don't fail - old subscription might already be cancelled
            console.warn("⚠️ Could not cancel old subscription:", {
              subscriptionId: oldSubscriptionId,
              message: cancelErr.message,
            });
          }
        }

        // Update user's plan in database
        const wordLimit = getWordLimit(plan);
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = newSubscriptionId;

        console.log("📝 Attempting to update user plan in Supabase", {
          userId,
          plan,
          wordLimit,
          stripeCustomerId,
          stripeSubscriptionId,
          oldSubscriptionCancelled: oldSubscriptionId && oldSubscriptionId !== newSubscriptionId,
        });

        console.log("🔐 Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log("🔐 Service role key exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

        const { error: updateError, data } = await supabase
          .from("users")
          .update({
            plan,
            word_limit: wordLimit,
            words_used: 0, // Reset word count on upgrade
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            billing_period: billingPeriod || "monthly", // Save billing period (monthly or annual)
          })
          .eq("id", userId);

        if (updateError) {
          console.error("❌ Error updating user plan in Supabase:", {
            error: updateError,
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
          });
          return NextResponse.json(
            { error: "Failed to update user plan", details: updateError.message },
            { status: 500 }
          );
        }

        console.log("✅ User plan updated successfully", {
          userId,
          plan,
          data,
        });
        console.log(
          `✅ User ${userId} upgraded to ${plan} plan (${billingPeriod})`
        );
      } catch (err) {
        console.error("❌ Exception in checkout.session.completed handler:", err);
        throw err;
      }
    }

    // Handle invoice.payment_succeeded for subscription renewals
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`✅ Payment succeeded for invoice: ${invoice.id}`);

      // Only process renewal payments (not initial invoices)
      const subscriptionId = (invoice as any).subscription as string | undefined;
      if (invoice.billing_reason === "subscription_cycle" && subscriptionId) {
        try {

          // Find user with this subscription
          const { data: userData, error: fetchError } = await supabase
            .from("users")
            .select("id, plan, word_limit")
            .eq("stripe_subscription_id", subscriptionId)
            .maybeSingle();

          if (fetchError) {
            console.error("❌ Error fetching user for renewal:", {
              subscriptionId,
              error: fetchError.message,
            });
            return NextResponse.json({ received: true });
          }

          if (userData) {
            // Reset word usage for subscription renewal
            const { error: updateError } = await supabase
              .from("users")
              .update({
                words_used: 0, // Reset words on successful renewal
              })
              .eq("id", userData.id);

            if (updateError) {
              console.error("❌ Error resetting words on renewal:", {
                userId: userData.id,
                error: updateError.message,
              });
            } else {
              console.log(`✅ Words reset for user ${userData.id} on subscription renewal`);
            }
          }
        } catch (err) {
          console.error("❌ Exception in invoice.payment_succeeded handler:", err);
        }
      }
    }

    // Handle customer.subscription.updated for mid-cycle plan changes
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`📝 Subscription updated: ${subscription.id}`);

      try {
        // Find user with this subscription
        const { data: userData } = await supabase
          .from("users")
          .select("id, plan")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (userData && subscription.items.data[0]?.plan.metadata?.plan_type) {
          const newPlan = subscription.items.data[0].plan.metadata.plan_type as PlanType;
          const newWordLimit = getWordLimit(newPlan);

          // Update user's plan if it changed
          const { error: updateError } = await supabase
            .from("users")
            .update({
              plan: newPlan,
              word_limit: newWordLimit,
              words_used: 0, // Reset on plan change
            })
            .eq("id", userData.id);

          if (updateError) {
            console.error("❌ Error updating user on subscription change:", {
              userId: userData.id,
              error: updateError.message,
            });
          } else {
            console.log(`✅ User ${userData.id} plan updated to ${newPlan}`);
          }
        }
      } catch (err) {
        console.error("❌ Exception in customer.subscription.updated handler:", err);
      }
    }

    // Handle customer.subscription.deleted when subscription ends
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`⚠️ Subscription deletion event received:`, {
        subscriptionId: subscription.id,
        status: subscription.status,
        canceledAt: subscription.canceled_at,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });

      try {
        // IMPORTANT: Only downgrade if user explicitly cancelled (not if subscription just ended)
        // Only process if cancel_at_period_end is true (user initiated cancellation)
        if (!subscription.cancel_at_period_end) {
          console.log(`ℹ️ Subscription ${subscription.id} was deleted but not by user cancellation (cancel_at_period_end=false). Not downgrading.`);
          return NextResponse.json({ received: true });
        }

        // Find user with this subscription
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (userData) {
          console.log(`📝 Downgrading user ${userData.id} due to explicit subscription cancellation`);

          // Downgrade user to free plan
          const freeWordLimit = getWordLimit("free");
          const { error: updateError } = await supabase
            .from("users")
            .update({
              plan: "free",
              word_limit: freeWordLimit,
              words_used: 0,
              stripe_subscription_id: null,
              stripe_customer_id: null,
            })
            .eq("id", userData.id);

          if (updateError) {
            console.error("❌ Error downgrading user on subscription deletion:", {
              userId: userData.id,
              error: updateError.message,
            });
          } else {
            console.log(`✅ User ${userData.id} downgraded to free plan after subscription deletion`);
          }
        }
      } catch (err) {
        console.error("❌ Exception in customer.subscription.deleted handler:", err);
      }
    }

    // Handle invoice.payment_failed for payment failures
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`❌ Payment failed for invoice: ${invoice.id}`);

      try {
        const subscriptionId = (invoice as any).subscription as string | undefined;
        if (subscriptionId) {

          // Find user and notify/log for manual intervention
          const { data: userData } = await supabase
            .from("users")
            .select("id, email")
            .eq("stripe_subscription_id", subscriptionId)
            .maybeSingle();

          if (userData) {
            // Log failed payment attempt - in production, send email notification here
            console.warn(`⚠️ Payment failed for user ${userData.id} (${userData.email}). Subscription: ${subscriptionId}`);
            // TODO: Send payment failure email to user
            // TODO: Consider downgrading after N retries
          }
        }
      } catch (err) {
        console.error("❌ Exception in invoice.payment_failed handler:", err);
      }
    }

    console.log("✅ Webhook processed successfully, returning response");
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
