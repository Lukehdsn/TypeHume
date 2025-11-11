import { supabaseServer } from "@/lib/supabase-server";
import { getWordLimit, PlanType } from "@/lib/plans";

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json();

    if (!userId) {
      return Response.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    console.log("API: Starting user initialization for userId:", userId);

    // Check if user exists
    console.log("API: Querying for existing user...");
    const { data: existingUser, error: fetchError } = await supabaseServer
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    console.log("API: Query result - existingUser:", existingUser, "fetchError:", fetchError);

    if (fetchError) {
      console.error("API: Error fetching user - detailed:", {
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint,
      });
      return Response.json(
        { error: "Failed to check user", code: fetchError.code },
        { status: 500 }
      );
    }

    if (existingUser) {
      // User already exists, return their data
      console.log("API: User exists, returning data:", existingUser);
      return Response.json({
        success: true,
        user: existingUser,
        isNew: false,
      });
    }

    // User doesn't exist, create them with free plan
    console.log("API: User doesn't exist, creating new user:", userId);
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
      console.error("API: Failed to create user - detailed:", {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
      return Response.json(
        { error: "Failed to create user", code: insertError.code },
        { status: 500 }
      );
    }

    console.log("API: User created successfully:", newUser);
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
