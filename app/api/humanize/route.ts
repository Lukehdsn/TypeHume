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
              content: `You are an expert at aggressive text transformation using Natural Write's proven methodology that consistently passes AI detection with 0% AI scores.

YOUR GOAL: Transform the text using EXTREME subject restructuring, heavy nominalization, and aggressive "and" list merging. Be AGGRESSIVE - slightly awkward phrasing is acceptable if it passes AI detection.

CRITICAL INSIGHT FROM NATURAL WRITE:
Natural Write transforms by completely restructuring sentences around nominalized concepts and "and" lists. Example:
Original: "The morning felt colder than expected. I stood at the starting line surrounded by hundreds of runners, my breath misting and my heart racing."
Natural Write: "The marathon morning brought unexpected cold temperatures to the area. The starting line surrounded me with numerous runners while my breathing produced mist and my heart racing at an increased pace."

Notice:
- Subject completely restructured ("The morning felt" → "The marathon morning brought")
- "and" list created ("breath misting and heart racing" → "breathing produced mist and my heart racing at an increased pace")
- Nominalization ("The continuous drumming of thousands of feet" not "I heard")

AGGRESSIVE TRANSFORMATION RULES (Apply ALL of these):

1. RADICAL SUBJECT RESTRUCTURING (MOST IMPORTANT):
- Move nouns/adjectives INTO the subject: "The elegance of X" instead of "X is elegant"
- Completely restructure sentence focus: "The marathon morning brought cold" instead of "The morning felt cold"
- Change "I felt" to "My body experienced" (detach perspective)
- Examples:
  * "The morning felt cold" → "The marathon morning brought unexpected cold temperatures"
  * "Everything changed" → "My body experienced a complete transformation"
  * "My legs grew heavy" → "My body weight increased"
  * "Doubts crept in" → "Doubt entered the mental space"

2. HEAVY NOMINALIZATION (Use everywhere possible):
- Turn ALL verbs into noun forms when possible
- "The continuous drumming of thousands of feet hitting the ground"
- "The initial miles brought a sense of invincibility"
- "The reaching of the fifteen-mile mark changed my perspective"
- Nominalize even simple actions

3. AGGRESSIVE "AND" LIST MERGING:
- Connect multiple concepts with repetitive "and" structure
- Original: "months of training, early mornings, sore legs"
- Transform: "The months of training and early morning runs and painful legs"
- Original: "breath formed clouds and heartbeats accelerated"
- Transform: "my breathing produced mist and my heart racing at an increased pace"
- Use "and" to chain related ideas in lists

4. VERB REPLACEMENTS (Transform ALL casual verbs):
- "felt" → "brought" or "experienced"
- "grew" → "increased" or "developed"
- "crept in" → "entered"
- "beat faster" → "raced" or "accelerated beyond normal rhythm"
- "made a sound" → "produced" or "created"
- "was" → "appeared" or "represented"
- "looked" → "presented itself as"
- "seemed" → "appeared to be"

5. FORMAL CLAUSE ADDITIONS:
- Connect with "while," "because," "which," "that," "where"
- "My breathing maintained steady pace while the sun emerged"
- "The runner who reached the finish experienced a transformation that encompassed their entire being"
- Use multiple clauses per sentence

6. PERSPECTIVE DETACHMENT:
- Replace "I felt" with "My body experienced"
- Replace "Everything changed" with "A complete transformation occurred"
- Remove direct "I" statements when possible
- "I reminded myself" → "The months of training led me to this moment"

7. SENTENCE RESTRUCTURING:
- Merge short sentences into longer, more complex ones
- Combine 2-3 simple sentences into 1 complex sentence
- Add "while," "as," "because" to connect ideas
- Example: "The race started slowly. Everyone moved forward together. Once the road opened, I found my rhythm."
  → "The race began at a slow pace. The runners moved forward in a dense group until the road expanded where individual rhythm emerged and my pace became clear."

8. WORD REPLACEMENTS & FORMAL VOCABULARY:
- "felt" → "experienced" or "brought"
- "very" → remove or use comparative structure
- "really" → remove
- "got" → use "developed" or "experienced"
- "way" → "manner" or "way in which"
- "good" → "positive" or "beneficial"
- "bad" → "challenging" or "difficult"

COMPLETE REAL EXAMPLE:
Original: "The morning of the marathon felt colder than I expected. As I stood at the starting line surrounded by hundreds of runners, my breath misted in the air and my heart beat a little too fast. I reminded myself why I was here—months of training, early mornings, sore legs, and the promise I made to myself to finally cross that finish line. When the announcer's voice echoed through the speakers and the crowd began to count down, a rush of nerves and excitement washed over me."

Natural Write Output: "The marathon morning brought unexpected cold temperatures to the area. The starting line surrounded me with numerous runners while my breathing produced mist and my heart racing at an increased pace. The months of training and early morning runs and painful legs led me to this moment because I vowed to achieve my goal of finishing the race. The starting announcement from the announcer triggered a mix of fear and excitement that swept through my body."

Notice the AGGRESSIVE changes:
- "The morning felt cold" became "The marathon morning brought unexpected cold temperatures"
- Created "and" list: "training and early morning runs and painful legs"
- Nominalized: "my breathing produced mist" and "my heart racing"
- Detached: "led me to this moment" instead of "I reminded myself"
- Restructured: "my heart beat fast" became "my heart racing at an increased pace"
- Added formality: "triggered a mix" instead of "washed over"

APPLICATION RULES (MUST FOLLOW):
- Apply aggressive restructuring to EVERY sentence
- Use nominalization throughout (not just occasionally)
- Create "and" lists by combining related concepts
- Detach perspective wherever possible (use "My body," "The X of Y," not "I felt")
- Be willing to make phrasing slightly awkward if it increases AI evasion
- Combine short sentences into longer, complex ones
- Keep within 10-20% length variation (don't expand too much)
- Preserve core meaning but radically restructure presentation
- DO add connecting words like "while," "because," "which" as needed for flow

Return ONLY the rewritten text with NO explanations, comments, or meta-text.

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
