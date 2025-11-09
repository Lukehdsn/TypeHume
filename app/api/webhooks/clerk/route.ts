import { Webhook } from "svix";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// This endpoint handles Clerk webhook events
export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Clerk webhook request received");

    // Get the webhook secret from environment
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("❌ CLERK_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Get the request body and headers
    const body = await request.text();
    const svixHeaders = {
      "svix-id": request.headers.get("svix-id") || "",
      "svix-timestamp": request.headers.get("svix-timestamp") || "",
      "svix-signature": request.headers.get("svix-signature") || "",
    };

    // Verify the webhook signature using Svix
    let event;
    try {
      const wh = new Webhook(webhookSecret);
      event = wh.verify(body, svixHeaders) as Record<string, any>;
      console.log("✅ Clerk webhook signature verified, event type:", event.type);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle user.deleted event
    if (event.type === "user.deleted") {
      const userId = event.data.id as string;
      console.log("👤 Handling user deletion for userId:", userId);

      try {
        // Fetch user's subscription info from database
        const { data: userData, error: fetchError } = await supabase
          .from("users")
          .select("stripe_subscription_id, stripe_customer_id")
          .eq("id", userId)
          .maybeSingle();

        if (fetchError) {
          console.error("❌ Error fetching user data:", fetchError);
          // Continue anyway, attempt to clean up what we can
        }

        // Cancel their Stripe subscription if they have one
        if (userData?.stripe_subscription_id) {
          try {
            console.log("🗑️ Cancelling Stripe subscription:", userData.stripe_subscription_id);
            await stripe.subscriptions.update(userData.stripe_subscription_id, {
              cancel_at_period_end: true,
            });
            console.log("✅ Stripe subscription cancelled successfully");
          } catch (stripeErr: any) {
            // Subscription might already be cancelled, log but don't fail
            console.warn("⚠️ Could not cancel Stripe subscription:", {
              subscriptionId: userData.stripe_subscription_id,
              message: stripeErr.message,
            });
          }
        }

        // Delete user record from Supabase (optional - cleans up your database)
        const { error: deleteError } = await supabase
          .from("users")
          .delete()
          .eq("id", userId);

        if (deleteError) {
          console.error("❌ Error deleting user from database:", deleteError);
          // Log the error but don't fail the webhook
        } else {
          console.log("✅ User deleted from database:", userId);
        }

        // Delete user's humanization history (optional - for GDPR compliance)
        const { error: historyError } = await supabase
          .from("humanizations")
          .delete()
          .eq("user_id", userId);

        if (historyError) {
          console.warn("⚠️ Could not delete user history:", historyError);
        } else {
          console.log("✅ User history deleted:", userId);
        }

        console.log("✅ User deletion processed successfully:", userId);
      } catch (err) {
        console.error("❌ Exception during user deletion:", err);
        // Return success anyway - webhook should be idempotent
        // Clerk will retry if we return an error
      }
    }

    // Handle other event types as needed
    if (event.type === "user.created") {
      console.log("👤 New user created:", event.data.id);
      // User is automatically created in Supabase on first login via trigger
    }

    console.log("✅ Webhook processed successfully");
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Clerk webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
