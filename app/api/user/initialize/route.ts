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

    const defaultPlan: PlanType = "free";
    const defaultWordLimit = getWordLimit(defaultPlan);

    // Use upsert to handle race conditions atomically
    // If user exists, return existing data; if not, create with free plan
    const { data: userData, error: upsertError } = await supabaseServer
      .from("users")
      .upsert({
        id: userId,
        email: email || "",
        plan: defaultPlan,
        word_limit: defaultWordLimit,
        words_used: 0,
      }, {
        onConflict: "id", // Use id as primary key for conflict detection
        ignoreDuplicates: false, // Return the existing or new row
      })
      .select()
      .single();

    if (upsertError) {
      console.error("API: Failed to initialize user - detailed:", {
        message: upsertError.message,
        code: upsertError.code,
        details: upsertError.details,
        hint: upsertError.hint,
      });
      return Response.json(
        { error: "Failed to initialize user", code: upsertError.code },
        { status: 500 }
      );
    }

    if (!userData) {
      console.error("API: Upsert succeeded but no data returned");
      return Response.json(
        { error: "Failed to retrieve user data" },
        { status: 500 }
      );
    }

    console.log("API: User initialized successfully:", {
      userId: userData.id,
      plan: userData.plan,
      email: userData.email,
    });

    return Response.json({
      success: true,
      user: userData,
      isNew: userData.plan === defaultPlan, // Might not be reliable, but indicates fresh initialization
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
