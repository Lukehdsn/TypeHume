import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PLANS, PlanType } from "@/lib/plans";
import { CheckoutRequestSchema, validateRequest } from "@/lib/validations";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const { data: validatedData, error: validationError } = await validateRequest(
      request,
      CheckoutRequestSchema
    );

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const { plan, billingPeriod, userId } = validatedData!;

    // Don't allow checkout for free plan
    if (plan === "free") {
      return NextResponse.json(
        { error: "Cannot checkout free plan" },
        { status: 400 }
      );
    }

    const planConfig = PLANS[plan as PlanType];
    const price = billingPeriod === "monthly"
      ? planConfig.monthlyPrice
      : planConfig.annualPrice; // annualPrice is already the monthly-equivalent rate

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: billingPeriod === "monthly" ? "subscription" : "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `TextHume ${planConfig.name} Plan`,
              description: `${planConfig.wordLimit === Infinity ? 'Unlimited' : planConfig.wordLimit.toLocaleString()} words per month`,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
            recurring: {
              interval: billingPeriod === "monthly" ? "month" : "year",
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
      client_reference_id: userId,
      metadata: {
        userId,
        plan,
        billingPeriod,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessionUrl: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
