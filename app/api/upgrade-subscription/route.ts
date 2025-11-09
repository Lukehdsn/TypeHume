import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getWordLimit, PlanType } from "@/lib/plans";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Valid plan types
const VALID_PLANS: PlanType[] = ["free", "starter", "pro", "premium"];

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

    // Parse request body
    const { plan } = await request.json();
    if (!plan) {
      return NextResponse.json(
        { error: "Missing plan" },
        { status: 400 }
      );
    }

    // Validate plan is one of the allowed plans
    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    // Fetch user's current Stripe subscription ID
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
        { error: `Database error: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!userData) {
      console.error("User not found in database for userId:", userId);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent upgrading to the same plan
    if (userData.plan === plan) {
      return NextResponse.json(
        { error: "You are already on the " + plan + " plan" },
        { status: 400 }
      );
    }

    // If user doesn't have a subscription, they need to use checkout instead
    if (!userData.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No existing subscription. Please use checkout.", needsCheckout: true },
        { status: 400 }
      );
    }

    // Get the price ID for the new plan from Stripe
    // For simplicity, we'll use the plan name to construct price ID
    // You should store these in your database or env variables for production
    const priceMap: Record<string, string> = {
      starter: "price_starter_monthly", // Replace with actual Stripe price ID
      pro: "price_pro_monthly",         // Replace with actual Stripe price ID
      premium: "price_premium_monthly", // Replace with actual Stripe price ID
    };

    // For now, we'll update using the plan metadata instead
    // This is a simpler approach that doesn't require storing price IDs

    try {
      // Get the subscription to find the price object
      const subscription = await stripe.subscriptions.retrieve(
        userData.stripe_subscription_id
      );

      if (!subscription) {
        return NextResponse.json(
          { error: "Subscription not found in Stripe" },
          { status: 404 }
        );
      }

      // Get the current item (price) in the subscription
      const currentItem = subscription.items.data[0];
      if (!currentItem) {
        return NextResponse.json(
          { error: "No items in subscription" },
          { status: 400 }
        );
      }

      // Map plans to their Stripe price IDs
      // These should be your actual Stripe price IDs from your dashboard
      const priceIdMap: Record<string, string> = {
        starter: process.env.STRIPE_PRICE_STARTER_MONTHLY || "",
        pro: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
        premium: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || "",
      };

      const priceId = priceIdMap[plan];
      console.log("📋 Upgrade attempt:", {
        plan,
        priceId,
        starterConfigured: !!process.env.STRIPE_PRICE_STARTER_MONTHLY,
        proConfigured: !!process.env.STRIPE_PRICE_PRO_MONTHLY,
        premiumConfigured: !!process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
      });

      if (!priceId) {
        console.error(`No price ID configured for plan: ${plan}`);
        return NextResponse.json(
          { error: "Price not configured for plan. Please contact support." },
          { status: 500 }
        );
      }

      // Retrieve the price to verify it exists
      let newPrice;
      try {
        newPrice = await stripe.prices.retrieve(priceId);
      } catch (err) {
        console.error(`Price ID ${priceId} not found in Stripe:`, err);
        return NextResponse.json(
          { error: "Price configuration error. Please contact support." },
          { status: 500 }
        );
      }

      // Update the subscription with the new price
      const updatedSubscription = await stripe.subscriptions.update(
        userData.stripe_subscription_id,
        {
          items: [
            {
              id: currentItem.id,
              price: newPrice.id,
            },
          ],
          proration_behavior: "create_prorations", // Charge for the difference
        }
      );

      console.log("Subscription updated in Stripe:", {
        subscriptionId: updatedSubscription.id,
        newPrice: newPrice.id,
        plan,
      });

      // Update the database with the new plan
      const wordLimit = getWordLimit(plan as PlanType);
      const { error: updateError, data: updateData } = await supabase
        .from("users")
        .update({
          plan,
          word_limit: wordLimit,
          words_used: 0, // Reset words on upgrade
        })
        .eq("id", userId)
        .select();

      if (updateError) {
        console.error("Error updating user plan in database:", {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          userId,
          plan,
          wordLimit,
        });
        return NextResponse.json(
          { error: "Failed to update plan in database" },
          { status: 500 }
        );
      }

      // Verify the update actually happened
      if (!updateData || updateData.length === 0) {
        console.error("Database update returned no data:", {
          userId,
          plan,
          wordLimit,
        });
        return NextResponse.json(
          { error: "Failed to verify plan update in database" },
          { status: 500 }
        );
      }

      console.log("Successfully updated user in database:", {
        userId,
        newPlan: plan,
        wordLimit,
        wordsReset: 0,
      });

      return NextResponse.json({
        success: true,
        message: `Upgraded to ${plan} plan`,
        plan,
        wordLimit,
      });
    } catch (stripeError: any) {
      console.error("Stripe API error:", {
        message: stripeError.message,
        code: stripeError.code,
        type: stripeError.type,
      });

      // Return safe error message without exposing internal details
      let userMessage = "Failed to update subscription";

      if (stripeError.type === "StripeCardError") {
        userMessage = "Card error: " + stripeError.message;
      } else if (stripeError.type === "StripeInvalidRequestError") {
        userMessage = "Invalid request. Please contact support.";
      } else if (stripeError.type === "StripeAPIError") {
        userMessage = "Stripe service error. Please try again later.";
      }

      return NextResponse.json(
        { error: userMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Upgrade subscription error:", error);
    return NextResponse.json(
      { error: "Failed to upgrade subscription" },
      { status: 500 }
    );
  }
}
