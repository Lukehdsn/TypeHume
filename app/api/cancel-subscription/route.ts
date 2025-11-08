import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getWordLimit } from "@/lib/plans";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user's Stripe subscription ID
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("stripe_subscription_id, plan")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching user from Supabase:", {
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
      });
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has an active subscription to cancel
    if (!userData.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription to cancel" },
        { status: 400 }
      );
    }

    // Check if already on free plan
    if (userData.plan === "free") {
      return NextResponse.json(
        { error: "Already on free plan" },
        { status: 400 }
      );
    }

    try {
      // Cancel the Stripe subscription (at period end)
      await stripe.subscriptions.update(userData.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      console.log("Subscription cancelled in Stripe:", {
        subscriptionId: userData.stripe_subscription_id,
        userId,
      });

      // Update database: downgrade to free plan
      const freeWordLimit = getWordLimit("free");
      const { error: updateError } = await supabase
        .from("users")
        .update({
          plan: "free",
          word_limit: freeWordLimit,
          words_used: 0,
          stripe_subscription_id: null,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating user plan in database:", updateError);
        return NextResponse.json(
          { error: "Failed to update plan in database" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Subscription cancelled successfully",
        plan: "free",
        wordLimit: freeWordLimit,
      });
    } catch (stripeError: any) {
      console.error("Stripe API error:", {
        message: stripeError.message,
        code: stripeError.code,
        type: stripeError.type,
      });

      // Return safe error message
      let userMessage = "Failed to cancel subscription";

      if (stripeError.type === "StripeInvalidRequestError") {
        userMessage = "Subscription not found. It may already be cancelled.";
      } else if (stripeError.type === "StripeAPIError") {
        userMessage = "Stripe service error. Please try again later.";
      }

      return NextResponse.json(
        { error: userMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
