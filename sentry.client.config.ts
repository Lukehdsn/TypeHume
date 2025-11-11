import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions in production

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Before sending to Sentry, check if we want to include it
  beforeSend(event) {
    // Don't send errors from local development
    if (process.env.NODE_ENV === "development") {
      return null;
    }

    // Don't send certain error types
    if (event.exception) {
      const error = event.exception.values?.[0]?.value;
      // Ignore network errors that are expected
      if (error?.includes("NetworkError") || error?.includes("AbortError")) {
        return null;
      }
    }

    return event;
  },
});
