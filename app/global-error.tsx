'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f5f5f5",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "40px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            maxWidth: "500px",
            textAlign: "center",
          }}>
            <h1 style={{
              fontSize: "24px",
              fontWeight: "bold",
              marginBottom: "16px",
              color: "#333",
            }}>
              Something went wrong
            </h1>
            <p style={{
              fontSize: "16px",
              color: "#666",
              marginBottom: "24px",
              lineHeight: "1.5",
            }}>
              We've been notified about this issue and our team is looking into it.
              {error.digest && (
                <div style={{ marginTop: "8px", fontSize: "12px", color: "#999" }}>
                  Error ID: {error.digest}
                </div>
              )}
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 24px",
                backgroundColor: "#7B7EFF",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#6B6EEF")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#7B7EFF")}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
