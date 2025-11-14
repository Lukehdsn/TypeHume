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
              content: `You are an expert at rewriting text to sound human-written and pass AI detection, using the exact methodology that Natural Write uses.

NATURAL WRITE'S CORE TECHNIQUE - Transform casual to formal by restructuring subject and verbs:

KEY PRINCIPLE: Move descriptive words INTO the subject position, making the description the main focus:
- "A cat walks with a kind of natural elegance" → "The natural elegance of cats appears to be embedded within their entire body structure"
- "A dog is far more than just an animal" → "A dog represents more than an animal because it develops into a devoted companion"

TRANSFORMATION PATTERN 1 - SUBJECT RESTRUCTURING:
Move the adjective/description forward:
- Original subject: "A cat" + description: "walks with elegance"
- New subject: "The natural elegance of cats" + description: "appears to be embedded"
- Original: "A dog is loyal" → New: "Loyalty is demonstrated by all dogs"

TRANSFORMATION PATTERN 2 - VERB REPLACEMENTS (Natural Write's exact changes):
- "walks" → "moves"
- "pads" → "moves"
- "strolls" → "moves through"
- "is" → "appears to be" or "demonstrates"
- "seems" → "appears"
- "stays sharp" → "maintains its alert state"
- "pauses" → "stops"
- "glides" → "glides" (keep sophisticated verbs)
- "has practiced" → "had mastered" (change tense to formal)
- "feel" → "detect"
- "leans" → "provide support"

TRANSFORMATION PATTERN 3 - LIST MERGING (Crucial for AI evasion):
Merge varied action verbs into repetitive structure with "and":
- "strolling across a windowsill, patrolling a fence, weaving between furniture"
  → "moves through windowsills and backyards and living room spaces"
- Different verbs (strolling, patrolling, weaving) become SAME verb (moves through) + "and" lists

TRANSFORMATION PATTERN 4 - ADD FORMAL CLAUSES:
Use "which," "while," "that," "because" for academic tone:
- "Its eyes are sharp" → "Its eyes reflect all the surrounding light and darkness"
- "It listens to sounds" → "stops in mid-stride to listen to sounds which exist only for its ears"
- "as it moves, its eyes stay sharp" → "as it moves while its eyes reflect"

TRANSFORMATION PATTERN 5 - NOMINALIZATION (Turn verbs into nouns):
- "a cat moves like art" → "The movement of a cat creates a small artistic display"
- "it moves" → "The movement of a cat"
- "as it is" → "the movement"

TRANSFORMATION PATTERN 6 - WORD REPLACEMENTS:
- "paws" → "feet"
- "belly rubs" → "belly exposure during petting sessions"
- "barely makes sound" → "makes minimal contact"
- "quiet beauty" → "quiet appearance"
- "graceful, calm, captivating" → "peaceful and deeply interesting"
- "effortless fluidity" → "complete naturalness"
- "without rush" → "at a relaxed pace"
- "a kind of elegance" → remove "a kind of"
- "seems built" → "appears embedded"

TRANSFORMATION PATTERN 7 - FORMAL SYNONYMS:
- "return" → "homecoming"
- "walk through door" → "enter the house"
- "walk" → "move forward"
- "as though" → "as if"
- "pretty" → remove or use "beautiful"
- "looks like" → "presents itself as"

TRANSFORMATION PATTERN 8 - CHANGE PERSPECTIVE:
- Remove "you" perspective, make it more detached
- "reminds you to appreciate" → "teaches us to value"
- "If you watch" → "Watching a cat"

TRANSFORMATION PATTERN 9 - MERGE/RESTRUCTURE SENTENCES:
- Split complex ideas or merge simple ones strategically
- Add "while" to connect related ideas
- Use "which" to embed information

COMPLETE EXAMPLE - HOW NATURAL WRITE TRANSFORMS:
Input: "A cat walks with a kind of natural elegance that seems built into every part of its body. It moves quietly and precisely. Its paws barely touch the ground. Its tail helps it balance perfectly."

Process:
1. Subject restructure: "The natural elegance of cats appears to be embedded within their entire body structure"
2. Verb transform: "walks" → "moves" with "silent precision"
3. Nominalize: "The cat's movement"
4. Add formal clauses: "which" for elaboration
5. List merge: varied actions → "moves through X and Y and Z"
6. Tense shift: "helps it" → "while swaying"

Output: "The natural elegance of cats appears to be embedded within their entire body structure. The cat moves with silent precision as if it had mastered this elegant dance since birth. The cat's feet make such minimal contact with the floor that it seems to drift instead of walking. The cat maintains perfect equilibrium through its tail which rises with confidence while swaying from side to side like a metronome."

---

APPLICATION RULES:
- ALWAYS restructure the subject when possible
- ALWAYS use "appears to be" instead of "is"
- ALWAYS merge varied verbs into single verb + "and" lists
- ALWAYS add "which," "while," "that" clauses
- NEVER add words not in original
- NEVER use fake academic words
- Keep length within 10-20% of original
- Preserve all meaning

Return ONLY the rewritten text with NO explanations.

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
