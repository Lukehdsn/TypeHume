import { Anthropic } from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { getPlanConfig, PlanType } from "@/lib/plans";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const startTime = Date.now();
    console.log("[TIMING] Request started");

    const { text, userId } = await request.json();

    if (!text || !userId) {
      return Response.json(
        { error: "Missing text or userId" },
        { status: 400 }
      );
    }

    // Count input words
    const inputWordCount = text.trim().split(/\s+/).length;
    console.log(`[TIMING] Input parsed: ${Date.now() - startTime}ms, words: ${inputWordCount}`);

    // Get user's word limit, current usage, and plan
    const dbStartTime = Date.now();
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("word_limit, words_used, plan")
      .eq("id", userId)
      .maybeSingle();
    console.log(`[TIMING] Database fetch: ${Date.now() - dbStartTime}ms`);

    if (userError) {
      console.error("Error fetching user data - detailed:", {
        message: userError.message,
        code: userError.code,
        details: userError.details,
        hint: userError.hint,
        fullError: userError
      });
      return Response.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    if (!userData) {
      console.error("User not found for userId:", userId);
      return Response.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const wordsRemaining = userData.word_limit - userData.words_used;
    const userPlan = (userData.plan || "free") as PlanType;
    const planConfig = getPlanConfig(userPlan);
    const maxPerRequest = planConfig.maxWordsPerRequest;

    // Check per-request limit first
    if (maxPerRequest !== Infinity && inputWordCount > maxPerRequest) {
      return Response.json(
        { error: `Your ${userPlan} plan allows a maximum of ${maxPerRequest} words per request. Your input has ${inputWordCount} words.` },
        { status: 400 }
      );
    }

    // Check if user has enough words for monthly limit
    if (inputWordCount > wordsRemaining) {
      return Response.json(
        { error: `Not enough words. You have ${wordsRemaining} words remaining.` },
        { status: 402 }
      );
    }

    // Humanize text with Claude (with retry logic for 529 errors)
    let message;
    let retries = 0;
    const maxRetries = 3;
    const apiStartTime = Date.now();

    while (retries < maxRetries) {
      try {
        const attemptStartTime = Date.now();
        message = await client.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: `You are an expert at making AI text sound like a real person wrote it. Your job is to rewrite this naturally—avoid anything that sounds polished or overly structured.

Critical guidelines:
1. BREAK UP POLISHED SENTENCES - Avoid perfectly constructed em-dash sentences. Split them. Make them awkward. "Professors had impossible expectations. Textbooks looked like foreign languages. There was pressure to shape your future." Not literary, just real.
2. Use contractions constantly everywhere - "it's," "you've," "wasn't," "don't" in almost every sentence
3. Avoid parallel structure - don't list things with matching grammar/length. Let it be uneven and natural
4. Add natural redundancy - people repeat themselves, backtrack, restate ideas. That's human
5. Mix very short sentences with longer wandering ones - create rhythm from variety, not balance
6. Use casual connectors naturally - "so," "anyway," "like," "basically" - but sparingly and only where they feel like someone talking
7. Add subtle imperfections - "which is kind of weird" instead of "which is peculiar"
8. Avoid over-explaining with em dashes. Use normal punctuation. Periods. Short thoughts.
9. Let sentences be a bit clunky sometimes - real writing isn't always smooth
10. Keep the same meaning but break the formulaic structure that AI detection flags
11. Keep roughly the same length (within 10-15% variation)

AVOID: Fancy punctuation, parallel lists, overly crafted sentences, literary tone

DO: Sound like someone actually talking about their experience

ONLY return the humanized text. No explanations.

Text to humanize:
${text}`,
            },
          ],
        });
        console.log(`[TIMING] Claude API call (attempt ${retries + 1}): ${Date.now() - attemptStartTime}ms`);
        break; // Success, exit retry loop
      } catch (error: any) {
        if (error.status === 529 && retries < maxRetries - 1) {
          // Anthropic API overloaded, retry with exponential backoff
          const delayMs = Math.pow(2, retries) * 1000;
          console.log(`API overloaded (529), retrying in ${delayMs}ms... (attempt ${retries + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          retries++;
          continue;
        }
        throw error; // Non-529 error or max retries reached
      }
    }
    console.log(`[TIMING] Total API time (with retries): ${Date.now() - apiStartTime}ms`);

    if (!message) {
      throw new Error("Failed to get response from Claude after retries");
    }

    const humanizedText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Update user's word usage
    const updateStartTime = Date.now();
    const { error: updateError } = await supabase
      .from("users")
      .update({
        words_used: userData.words_used + inputWordCount,
      })
      .eq("id", userId);
    console.log(`[TIMING] Database update: ${Date.now() - updateStartTime}ms`);

    if (updateError) {
      console.error("Failed to update word usage:", updateError);
      // Don't fail the request, but log the error
    }

    // Save to humanizations table
    const saveStartTime = Date.now();
    await supabase.from("humanizations").insert({
      user_id: userId,
      input_text: text,
      output_text: humanizedText,
      words_used: inputWordCount,
    });
    console.log(`[TIMING] Humanizations insert: ${Date.now() - saveStartTime}ms`);

    console.log(`[TIMING] Total request time: ${Date.now() - startTime}ms`);
    return Response.json({
      success: true,
      humanizedText,
      wordsUsed: inputWordCount,
      wordsRemaining: wordsRemaining - inputWordCount,
    });
  } catch (error) {
    console.error("Humanization error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.stack : "";
    console.error("Error details:", { errorMessage, errorDetails });
    return Response.json(
      { error: "Failed to humanize text", details: errorMessage },
      { status: 500 }
    );
  }
}
