import { Anthropic } from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getPlanConfig, PlanType } from "@/lib/plans";
import { checkRateLimit } from "@/lib/ratelimit";
import { HumanizeRequestSchema, validateRequest } from "@/lib/validations";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const startTime = Date.now();
    console.log("[TIMING] Request started");

    // Verify user is authenticated
    const { userId: authenticatedUserId } = await auth();
    if (!authenticatedUserId) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate request body
    const { data: validatedData, error: validationError } = await validateRequest(
      request,
      HumanizeRequestSchema
    );

    if (validationError) {
      return Response.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const { text, userId } = validatedData!;

    // Verify the userId in request matches the authenticated user
    if (userId !== authenticatedUserId) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check rate limiting (10 requests per minute per user)
    const rateLimitResult = await checkRateLimit(userId);
    if (!rateLimitResult.success) {
      return Response.json(
        {
          error: "Rate limit exceeded. Maximum 10 requests per minute.",
          retryAfter: rateLimitResult.resetAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimitResult.resetAfter.toString(),
          }
        }
      );
    }

    // Count input words
    const inputWordCount = text.trim().split(/\s+/).length;
    console.log(`[TIMING] Input parsed: ${Date.now() - startTime}ms, words: ${inputWordCount}`);

    // Get user's word limit, current usage, and plan
    const dbStartTime = Date.now();
    const { data: userData, error: userError } = await supabaseServer
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
              content: `You are an expert at transforming AI-generated text into natural, human-like writing with formal, academic prose style.

Your task is to rewrite the following text with a scholarly, formal tone that mimics human academic writing while preserving all original meaning.

CRITICAL RULES:

1. SENTENCE STRUCTURE - Build longer, denser sentences:
   - Combine related ideas using subordinate clauses (because, which, that, through, during, so that)
   - Create compound structures with multiple prepositional phrases
   - Aim for 40-60 word sentences for at least 25% of output
   - Create extreme burstiness: alternate between 15-word and 55-word sentences dramatically
   - Use gerund phrases (through [verb]ing) and relative clauses (which allows, that provides)
   - Embed multiple clauses without clear breaks for dense academic flow

2. TONE - Write in formal, academic voice:
   - Use detached, objective third-person perspective (avoid "you" where possible)
   - Eliminate all conversational interjections entirely (no "honestly," "you know," "for a second," "in a weird way")
   - Remove casual markers like demonstratives ("this," "that," "those") where possible
   - Eliminate contractions completely
   - Avoid fragments or incomplete sentences - all sentences must be grammatically complete

3. WORD CHOICE - Apply systematic formal transformations:
   - Nominalize verbs into abstract nouns (e.g., "ability to sense emotions" → "emotional perception," "sees" → "exhibits visual perception")
   - Use Latinate and formal vocabulary over simple words ("represents" not "is," "devoted companion" not "loyal friend," "homecoming" not "return")
   - Replace concrete imagery with formal equivalents ("soft paws" → "gentle feet," "curious nose" → "exploring snout")
   - Choose unexpected but appropriate synonyms to increase perplexity
   - Transform active voice to passive constructions (e.g., "dogs sense emotions" → "emotional states are detected")
   - Use academic connectors: "constitutes," "manifests," "encompasses," "demonstrates," "exhibits"

4. GRAMMATICAL PATTERNS - Build scholarly complexity:
   - Heavy use of causal subordination: "because," "which allows," "so that," "in order to"
   - Long prepositional chains without perfect parallelism (creates human imperfection)
   - Relative clauses for elaboration: "dogs, which possess," "moments, that become"
   - Nominalizations in sentence subjects: "The emotional perception of dogs..." not "Dogs can sense emotions..."
   - Embedded clauses creating sentence density
   - Mix conjunction patterns (not perfectly parallel)

5. AI EVASION THROUGH ACADEMIC STYLE:
   - High burstiness: Dramatically vary sentence length (15-word then 55-word sentences)
   - High perplexity: Use less predictable formal vocabulary and academic synonyms
   - Nominalization patterns: Converts verbs to nouns (characteristic of academic prose, not AI)
   - Dense clause chaining: Multiple ideas connected without clear separation
   - Formal register: Scholarly tone naturally evades detection
   - Imperfect parallelism: Academic writing has uneven structures

6. CRITICAL CONSTRAINTS:
   - Keep output length within 10–15% of input word count
   - Preserve all original meaning, concepts, and examples
   - Maintain logical flow and topic coherence
   - Remove em-dashes and replace with commas or subordinate clauses
   - Return ONLY the rewritten text—no explanations, commentary, or metadata

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

    // Validate Claude API response format
    if (!message.content || !Array.isArray(message.content) || message.content.length === 0) {
      throw new Error("Invalid Claude response: missing content");
    }

    const firstContent = message.content[0];
    if (!firstContent || firstContent.type !== "text") {
      throw new Error("Invalid Claude response: expected text content");
    }

    const humanizedText = firstContent.text;
    if (!humanizedText || typeof humanizedText !== "string") {
      throw new Error("Invalid Claude response: text is not a string");
    }

    // Update user's word usage with atomic constraint check
    // This prevents race conditions where concurrent requests bypass the limit
    const updateStartTime = Date.now();
    const newWordsUsed = userData.words_used + inputWordCount;

    const { error: updateError, data: updateData } = await supabaseServer
      .from("users")
      .update({
        words_used: newWordsUsed,
      })
      .eq("id", userId)
      .gte("word_limit", newWordsUsed) // Only update if new usage doesn't exceed limit
      .select();

    console.log(`[TIMING] Database update: ${Date.now() - updateStartTime}ms`);

    if (updateError) {
      console.error("Failed to update word usage:", updateError);
      // Don't fail the request, but log the error
      // In production, consider returning 429 or 402 (payment required)
    }

    // Double-check that update succeeded (race condition detection)
    if (!updateData || updateData.length === 0) {
      console.warn("⚠️ Word usage update failed - user may have insufficient words or concurrent limit exceeded", {
        userId,
        inputWordCount,
        previousWordsUsed: userData.words_used,
        wordLimit: userData.word_limit,
      });
      // Return success anyway since humanization completed, but log for monitoring
      // In future, we could queue a retry or return error
    }

    // Save to humanizations table
    const saveStartTime = Date.now();
    await supabaseServer.from("humanizations").insert({
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
