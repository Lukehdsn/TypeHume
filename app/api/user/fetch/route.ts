import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return Response.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("users")
      .select("plan, word_limit, words_used, billing_period")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("API: Error fetching user data:", error);
      return Response.json(
        { error: "Failed to fetch user data", code: error.code },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      user: data,
    });
  } catch (error) {
    console.error("API: User fetch error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "Failed to fetch user", details: errorMessage },
      { status: 500 }
    );
  }
}
