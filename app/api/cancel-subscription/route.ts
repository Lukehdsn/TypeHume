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
      console.log("Attempting to cancel Stripe subscription:", {
        subscriptionId: subId?.substring(0, 20),
        subscriptionIdFull: subId,
        subscriptionIdLength: subId?.length,
        subscriptionIdType: typeof subId,
        stripeKeyExists: !!process.env.STRIPE_SECRET_KEY,
        stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
      });

      // Cancel the Stripe subscription (at period end)
      let updatedSubscription: Stripe.Subscription;
      try {
        console.log("About to call stripe.subscriptions.update with:", {
          id: subId,
          params: { cancel_at_period_end: true },
        });

        updatedSubscription = await stripe.subscriptions.update(subId!, {
          cancel_at_period_end: true,
        });

        console.log("stripe.subscriptions.update succeeded");
      } catch (stripeErr: any) {
        console.error("🔴 Stripe subscriptions.update failed:", {
          subscriptionId: userData.stripe_subscription_id?.substring(0, 20),
          message: stripeErr?.message,
          statusCode: stripeErr?.statusCode,
          type: stripeErr?.type,
          param: stripeErr?.param,
          code: stripeErr?.code,
          fullError: JSON.stringify(stripeErr, Object.getOwnPropertyNames(stripeErr)),
          errorKeys: Object.keys(stripeErr || {}),
          errorName: stripeErr?.name,
          errorString: String(stripeErr),
        });
        throw stripeErr;
      }

      console.log("✅ Subscription cancelled in Stripe:", {
        subscriptionId: userData.stripe_subscription_id,
        userId,
        periodEnd: (updatedSubscription as any).current_period_end,
      });

      // Update database: mark as canceling but KEEP paid plan until period ends
      const periodEndTimestamp = (updatedSubscription as any).current_period_end;
      console.log("Period end timestamp from Stripe:", {
        timestamp: periodEndTimestamp,
        type: typeof periodEndTimestamp,
        isValid: periodEndTimestamp && !isNaN(periodEndTimestamp),
      });

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
        console.error("Error updating cancellation status:", updateError);
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
