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
        // Update user's plan in database
        const wordLimit = getWordLimit(plan);
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        console.log("📝 Attempting to update user plan in Supabase", {
          userId,
          plan,
          wordLimit,
          stripeCustomerId,
          stripeSubscriptionId,
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
    }

    // Handle customer.subscription.deleted
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`⚠️ Subscription cancelled: ${subscription.id}`);
      // You could downgrade user to free plan here if desired
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
