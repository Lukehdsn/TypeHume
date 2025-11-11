import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring - sample 10% of transactions in production
  tracesSampleRate: 0.1,

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Server-side specific settings
  beforeSend(event) {
    // Don't send errors from local development
    if (process.env.NODE_ENV === "development") {
      return null;
    }

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

  // Additional context
  integrations: [
    Sentry.Replay({
      // Mask all text content, but keep media playback
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],
});
