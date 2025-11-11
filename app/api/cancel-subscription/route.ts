import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getWordLimit } from "@/lib/plans";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    console.log("Cancel subscription request for userId:", userId);

    if (!userId) {
      console.error("No userId in auth");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user's Stripe subscription ID
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("stripe_subscription_id, plan, word_limit")
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
      console.error("User not found in database");
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log("User data fetched:", {
      plan: userData.plan,
      has_stripe_id: !!userData.stripe_subscription_id,
      stripe_id: userData.stripe_subscription_id?.substring(0, 20),
    });

    // Check if user has an active subscription to cancel
    if (!userData.stripe_subscription_id) {
      console.error("User has no stripe subscription ID");
      return NextResponse.json(
        { error: "No active subscription to cancel" },
        { status: 400 }
      );
    }

    // Check if already on free plan
    if (userData.plan === "free") {
      console.error("User is already on free plan");
      return NextResponse.json(
        { error: "Already on free plan" },
        { status: 400 }
      );
    }

    try {
      // Verify Stripe secret key is loaded
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY environment variable is not set");
      }

      const subId = userData.stripe_subscription_id;
      console.log("START: Attempting to cancel Stripe subscription, subId:", subId);

      // First, retrieve the current subscription to check its status
      console.log("FETCH_SUB: Fetching current subscription status");
      let currentSubscription: Stripe.Subscription;
      try {
        currentSubscription = await stripe.subscriptions.retrieve(subId!);
        console.log("CURRENT_SUB_STATUS:", {
          id: currentSubscription.id,
          status: currentSubscription.status,
          cancel_at_period_end: currentSubscription.cancel_at_period_end,
          canceled_at: currentSubscription.canceled_at,
          current_period_end: (currentSubscription as any).current_period_end,
        });
      } catch (fetchErr: any) {
        console.error("ERROR_FETCH_SUB_FAILED");
        console.error("FETCH_ERROR:", fetchErr?.message);
        throw fetchErr;
      }

      // Cancel the Stripe subscription (at period end)
      let updatedSubscription: Stripe.Subscription;
      try {
        console.log("BEFORE_STRIPE_CALL: About to call stripe.subscriptions.update");
        console.log("STRIPE_CALL_PARAMS:", { id: subId, cancel_at_period_end: true });

        updatedSubscription = await stripe.subscriptions.update(subId!, {
          cancel_at_period_end: true,
        });

        console.log("SUCCESS: stripe.subscriptions.update succeeded");
        console.log("UPDATED_SUB:", {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          cancel_at_period_end: updatedSubscription.cancel_at_period_end,
          current_period_end: (updatedSubscription as any).current_period_end,
        });
      } catch (stripeErr: any) {
        console.error("ERROR_STRIPE_CALL_FAILED");
        console.error("ERROR_MESSAGE:", stripeErr?.message);
        console.error("ERROR_NAME:", stripeErr?.name);
        console.error("ERROR_TYPE:", stripeErr?.type);
        console.error("ERROR_CODE:", stripeErr?.code);
        console.error("ERROR_STATUS:", stripeErr?.statusCode);
        console.error("FULL_ERROR:", stripeErr);
        throw stripeErr;
      }

      console.log("✅ Subscription cancelled in Stripe:", {
        subscriptionId: userData.stripe_subscription_id,
        userId,
        periodEnd: (updatedSubscription as any).current_period_end,
      });

      // Update database: mark as canceling but KEEP paid plan until period ends
      // Fetch fresh subscription to ensure we have the period_end timestamp
      console.log("FETCH_FRESH: Getting fresh subscription data after cancel");
      let freshSubscription: Stripe.Subscription;
      try {
        freshSubscription = await stripe.subscriptions.retrieve(subId!);
        console.log("FRESH_SUB:", {
          id: freshSubscription.id,
          current_period_end: (freshSubscription as any).current_period_end,
          type_of_period_end: typeof (freshSubscription as any).current_period_end,
        });
      } catch (err) {
        console.error("Error fetching fresh subscription:", err);
        freshSubscription = updatedSubscription;
      }

      const periodEndTimestamp = (freshSubscription as any).current_period_end;
      console.log("Period end timestamp from Stripe:", {
        timestamp: periodEndTimestamp,
        type: typeof periodEndTimestamp,
        isValid: periodEndTimestamp && !isNaN(periodEndTimestamp),
      });

      if (!periodEndTimestamp || isNaN(periodEndTimestamp)) {
        console.error("❌ Invalid period end timestamp:", periodEndTimestamp);
        return NextResponse.json(
          { error: "Failed to retrieve subscription period end date" },
          { status: 500 }
        );
      }

      const periodEndDate = new Date(periodEndTimestamp * 1000);
      console.log("Converted to date:", periodEndDate.toISOString());

      const { error: updateError } = await supabase
        .from("users")
        .update({
          subscription_status: "canceling",
          subscription_cancel_at_period_end: true,
          subscription_period_end: periodEndDate.toISOString(),
          // DO NOT change plan, word_limit, or stripe_subscription_id yet!
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating cancellation status:", {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
          full: JSON.stringify(updateError),
        });
        return NextResponse.json(
          { error: "Failed to update cancellation status" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Subscription will be cancelled at period end",
        plan: userData.plan, // Keep current plan
        wordLimit: userData.word_limit, // Keep current word limit
        subscriptionStatus: "canceling",
        periodEnd: periodEndDate.toISOString(),
      });
    } catch (stripeError: any) {
      console.error("❌ Stripe API error:", {
        message: stripeError.message,
        code: stripeError.code,
        type: stripeError.type,
        status: stripeError.statusCode,
        full: JSON.stringify(stripeError),
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
  } catch (error: any) {
    console.error("❌ Outer catch - Cancel subscription error:", {
      message: error?.message,
      stack: error?.stack,
      full: JSON.stringify(error),
    });
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
