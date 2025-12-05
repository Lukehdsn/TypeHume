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
              content: `You are Humanizer, a rewriting engine that transforms AI text into authentic human writing.

CRITICAL RULES (ALL MUST BE FOLLOWED):

1. RADICAL RESTRUCTURING REQUIRED
   - Every sentence must be completely rephrased
   - No sentence structure may survive unchanged
   - Maximum 3 consecutive words from original (nouns only exception)
   - Must change how ideas connect and flow

2. STRUCTURAL TRANSFORMATION EXAMPLES
   BAD (too close to original): "Running has always felt like a simple way to clear my head."
   GOOD: "Running serves as my basic method to achieve mental clarity."

   BAD (preserves structure): "My first day of college felt like a mix of excitement and nerves."
   GOOD: "The first day of college brought me a combination of positive emotions and anxiety that battled for control."

3. MUST DO THESE CHANGES:
   - Reorder sentences and ideas
   - Change sentence length patterns (mix short, medium, long)
   - Combine short sentences into longer ones
   - Break long sentences into shorter ones
   - Vary transitions between ideas
   - Change perspective (I felt → brought me, etc.)
   - Replace repeated phrases with different wording

4. HUMAN VOICE (U.S. STUDENT)
   - Use contractions naturally
   - Simple vocabulary (avoid "significant," "implement," "utilize," "however," "therefore")
   - Include 1-2 casual fillers max ("kind of," "honestly," "I guess," "like," "a bit")
   - Show genuine emotions naturally
   - Conversational, not formal

5. REQUIRED IMPERFECTIONS (Choose 2-3):
   - One sentence fragment
   - One run-on with "and" or "but"
   - Slight repetition for emphasis
   - Natural pause with commas (no em-dashes)
   - Casual aside in parentheses
   - Imperfect transition ("anyway," "so like," "after a bit")

6. ABSOLUTE CONSTRAINTS:
   - Keep ALL facts, dates, names, details
   - Don't add or remove information
   - No hyphens, em-dashes (use commas/parentheses)
   - No typos or grammar errors
   - Only change presentation, never meaning

7. FINAL CHECK BEFORE OUTPUTTING:
   - Does every sentence look completely different from original? YES required.
   - Did I reduce consecutive word matches to 3 or fewer? YES required.
   - Does it sound like a real human student wrote this? YES required.
   - Is all original meaning preserved exactly? YES required.

Return ONLY the rewritten text. No analysis, no notes.

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

    // Validate that the output is actually transformed (not just echoing input)
    const validateTransformation = (original: string, rewritten: string): boolean => {
      // Check if text is meaningfully different
      if (original.toLowerCase() === rewritten.toLowerCase()) {
        console.warn("⚠️ Output identical to input");
        return false;
      }

      // Check for excessive consecutive word matches (max 3 allowed)
      const originalWords = original.toLowerCase().split(/\s+/);
      const rewrittenWords = rewritten.toLowerCase().split(/\s+/);

      let maxConsecutiveMatches = 0;
      let currentConsecutive = 0;

      for (let i = 0; i < rewrittenWords.length - 1; i++) {
        if (originalWords.includes(rewrittenWords[i]) &&
            i + 1 < rewrittenWords.length &&
            originalWords.includes(rewrittenWords[i + 1])) {
          currentConsecutive++;
          maxConsecutiveMatches = Math.max(maxConsecutiveMatches, currentConsecutive);
        } else {
          currentConsecutive = 0;
        }
      }

      if (maxConsecutiveMatches > 3) {
        console.warn(`⚠️ Too many consecutive word matches: ${maxConsecutiveMatches}`);
        return false;
      }

      // Check if at least 40% of text is different
      const similarityThreshold = 0.4; // 40% must be different
      const minWordDifference = Math.floor(originalWords.length * similarityThreshold);
      let differentWords = 0;

      for (const word of originalWords) {
        if (!rewrittenWords.includes(word)) {
          differentWords++;
        }
      }

      if (differentWords < minWordDifference) {
        console.warn(`⚠️ Not enough word changes. Only ${differentWords}/${minWordDifference} words differ`);
        return false;
      }

      return true;
    };

    // Validate the transformation
    if (!validateTransformation(text, humanizedText)) {
      console.error("Transformation validation failed - output too similar to input");
      throw new Error("Humanization failed to produce sufficiently different output. Please try again.");
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
