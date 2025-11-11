import { z } from "zod";

/**
 * Validation schemas for API requests
 */

// Humanize endpoint validation
export const HumanizeRequestSchema = z.object({
  text: z.string().min(1, "Text is required").max(5000, "Text cannot exceed 5000 characters"),
  userId: z.string().min(1, "User ID is required"),
});

export type HumanizeRequest = z.infer<typeof HumanizeRequestSchema>;

// Checkout endpoint validation
export const CheckoutRequestSchema = z.object({
  plan: z.enum(["free", "starter", "pro", "premium"]).catch("premium"),
  billingPeriod: z.enum(["monthly", "annual"]).catch("monthly"),
  userId: z.string().min(1, "User ID is required"),
});

export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

// User initialization validation
export const UserInitializeRequestSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export type UserInitializeRequest = z.infer<typeof UserInitializeRequestSchema>;

// User fetch validation
export const UserFetchRequestSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export type UserFetchRequest = z.infer<typeof UserFetchRequestSchema>;

// Upgrade subscription validation
export const UpgradeSubscriptionRequestSchema = z.object({
  plan: z.enum(["free", "starter", "pro", "premium"]).catch("premium"),
});

export type UpgradeSubscriptionRequest = z.infer<typeof UpgradeSubscriptionRequestSchema>;

/**
 * Utility function to safely parse and validate requests
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      return { data: null, error: errors };
    }

    return { data: parsed.data as T, error: null };
  } catch (error) {
    return { data: null, error: "Invalid JSON in request body" };
  }
}
