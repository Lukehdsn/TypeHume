// Sentry Instrumentation for Next.js
// This file initializes Sentry for the server and client

import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Only initialize if not in development
  if (process.env.NODE_ENV === "production") {
    // Initialize server-side Sentry
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      enabled: process.env.NODE_ENV === "production",

      // Performance monitoring - sample 10% of transactions
      tracesSampleRate: 0.1,

      // Release tracking
      release: process.env.NEXT_PUBLIC_APP_VERSION,

      // Before sending to Sentry, check if we want to include it
      beforeSend(event) {
        // Don't send certain error types
        if (event.exception) {
          const error = event.exception.values?.[0]?.value;

          // Ignore benign errors
          if (
            error?.includes("ERR_INTERNAL_ASSERTION") ||
            error?.includes("ECONNREFUSED") ||
            error?.includes("ETIMEDOUT")
          ) {
            return null;
          }
        }

        return event;
      },
    });
  }
}
