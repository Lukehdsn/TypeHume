import { supabaseServer } from "@/lib/supabase-server";
import { getWordLimit, PlanType } from "@/lib/plans";
import { UserInitializeRequestSchema, validateRequest } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    // Validate request body
    const { data: validatedData, error: validationError } = await validateRequest(
      request,
      UserInitializeRequestSchema
    );

    if (validationError) {
      return Response.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const { userId, email } = validatedData!;

    console.log("API: Starting user initialization for userId:", userId);

    // First, check if user already exists
    const { data: existingUser, error: fetchError } = await supabaseServer
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("API: Error checking if user exists:", {
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
      });
      return Response.json(
        { error: "Failed to check user status", details: fetchError.message },
        { status: 500 }
      );
    }

    console.log("API: Query result for userId:", userId, {
      found: !!existingUser,
      data: existingUser,
    });

    // If user exists, return their existing data (preserves paid plan, word limits, etc.)
    if (existingUser) {
      console.log("API: User already exists, returning existing data:", {
        userId: existingUser.id,
        plan: existingUser.plan,
        email: existingUser.email,
        wordLimit: existingUser.word_limit,
        subscriptionStatus: existingUser.subscription_status,
      });

      // Check if subscription period has ended but status not updated
      // This is a safety measure in case the webhook doesn't fire
      if (
        existingUser.subscription_status === "canceling" &&
        existingUser.subscription_period_end
      ) {
        const periodEnd = new Date(existingUser.subscription_period_end);
        const now = new Date();

        // If period has ended, downgrade to free
        if (now > periodEnd) {
          console.log(
            "API: Subscription period ended, downgrading user:",
            {
              userId: existingUser.id,
              periodEnd: periodEnd.toISOString(),
              now: now.toISOString(),
            }
          );

          const freeWordLimit = getWordLimit("free");
          const { error: downgradeError } = await supabaseServer
            .from("users")
            .update({
              plan: "free",
              word_limit: freeWordLimit,
              words_used: 0,
              stripe_subscription_id: null,
              subscription_status: "canceled",
              subscription_cancel_at_period_end: false,
              subscription_period_end: null,
            })
            .eq("id", existingUser.id);

          if (downgradeError) {
            console.error(
              "API: Error downgrading expired subscription:",
              downgradeError
            );
          } else {
            console.log(`API: User ${existingUser.id} downgraded after period end`);
          }

          // Return updated user data
          return Response.json({
            success: true,
            user: {
              ...existingUser,
              plan: "free",
              word_limit: freeWordLimit,
              words_used: 0,
              subscription_status: "canceled",
              subscription_cancel_at_period_end: false,
              subscription_period_end: null,
            },
            isNew: false,
          });
        }
      }

      return Response.json({
        success: true,
        user: existingUser,
        isNew: false,
      });
    }

    console.log("API: User not found, will create new user with free plan");

    // User doesn't exist, create them with free plan
    const defaultPlan: PlanType = "free";
    const defaultWordLimit = getWordLimit(defaultPlan);

    const { data: newUser, error: insertError } = await supabaseServer
      .from("users")
      .insert({
        id: userId,
        email: email || "",
        plan: defaultPlan,
        word_limit: defaultWordLimit,
        words_used: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("API: Failed to create new user:", {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
      });
      return Response.json(
        { error: "Failed to create user", code: insertError.code },
        { status: 500 }
      );
    }

    if (!newUser) {
      console.error("API: Insert succeeded but no data returned");
      return Response.json(
        { error: "Failed to retrieve user data" },
        { status: 500 }
      );
    }

    console.log("API: New user created successfully:", {
      userId: newUser.id,
      plan: newUser.plan,
      email: newUser.email,
    });

    return Response.json({
      success: true,
      user: newUser,
      isNew: true,
    });
  } catch (error) {
    console.error("API: User initialization error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "Failed to initialize user", details: errorMessage },
      { status: 500 }
    );
  }
}
