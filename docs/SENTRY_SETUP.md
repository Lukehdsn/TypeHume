# Sentry Error Monitoring Setup

This guide explains how to set up Sentry for error tracking and monitoring in production.

## Overview

Sentry automatically catches and reports errors in your application, helping you identify and fix bugs quickly.

## Setup Steps

### 1. Create a Sentry Project

1. Go to [sentry.io](https://sentry.io)
2. Sign up or log in
3. Create a new organization (if you don't have one)
4. Create a new project for Next.js
5. Note your **DSN** (Data Source Name) - looks like: `https://xxxx@xxxx.ingest.sentry.io/12345`

### 2. Add Environment Variables

Add the following to your `.env.local` and Vercel environment variables:

```env
# Client-side Sentry DSN (can be public)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/12345
NEXT_PUBLIC_APP_VERSION=1.0.0

# Server-side Sentry DSN (keep secret)
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/12345

# Sentry build configuration
SENTRY_ORG=your-org-name
SENTRY_PROJECT=texthume
SENTRY_AUTH_TOKEN=<get from Sentry settings>
```

### 3. Get Sentry Auth Token

1. Go to Sentry Settings → Auth Tokens
2. Create a new auth token with `project:releases` scope
3. Copy and save it

### 4. Configure Vercel

1. Go to your Vercel project settings
2. Go to Environment Variables
3. Add all the environment variables from step 2
4. Redeploy your project

## Features Enabled

With this setup, Sentry automatically:

✅ **Error Tracking**
- Catches unhandled exceptions
- Groups similar errors together
- Tracks error frequency and trends

✅ **Performance Monitoring**
- Tracks slow page loads (10% sample rate)
- Monitors API endpoint performance
- Identifies bottlenecks

✅ **Source Maps**
- Automatically uploads source maps on deploy
- Shows meaningful stack traces instead of minified code
- Keeps source maps hidden from public

✅ **Session Replay** (optional)
- Records user sessions leading up to errors
- Helps reproduce bugs
- Masks sensitive data by default

✅ **Error Context**
- Includes user information
- Captures request details
- Shows browser/OS information

## Monitoring Your Errors

### Dashboard

1. Log in to [sentry.io](https://sentry.io)
2. Go to your project dashboard
3. See all errors in real-time
4. Click any error to see:
   - Stack trace
   - Affected users
   - Timeline
   - Related events

### Alerts

Set up alerts to notify you of critical errors:

1. Go to Alerts → New Alert
2. Choose "Issues" as alert type
3. Set conditions (e.g., "More than 10 errors in 5 minutes")
4. Set notification (Email, Slack, etc.)

### Releases

Track which version of your code caused errors:

1. Sentry automatically tracks releases
2. View which errors were introduced in each release
3. Check if fixes actually resolved issues

## Common Errors to Monitor

The system automatically catches:
- API route errors (humanize, checkout, webhooks)
- Database connection errors
- Authentication failures
- Payment processing errors
- Rate limit exceeded events
- Validation errors

## Privacy & Security

⚠️ **Important**:

- Only the DSN is public (NEXT_PUBLIC_*)
- Server-side DSN and auth token should be kept secret
- Source maps are hidden from browsers
- Sensitive data is masked by default
- No user input/text content is captured

## Troubleshooting

### Errors not appearing in Sentry?

1. Check that NEXT_PUBLIC_SENTRY_DSN is set correctly
2. Make sure you're in production (Sentry is disabled in development)
3. Wait a few seconds - there might be a delay
4. Check browser console for any Sentry initialization errors

### Too many errors?

1. Adjust the `beforeSend` function in sentry.*.config.ts
2. Filter out known, expected errors
3. Increase sample rate thresholds

### Source maps not uploading?

1. Verify SENTRY_AUTH_TOKEN is correct
2. Check SENTRY_ORG and SENTRY_PROJECT match your Sentry project
3. Ensure token has `project:releases` scope

## Next Steps

1. **Set up Slack notifications**: Integrate Sentry with Slack for real-time alerts
2. **Configure release tracking**: Link your GitHub repo for better context
3. **Set up team members**: Invite your team to the Sentry project
4. **Configure alert rules**: Set up alerts for critical errors

## Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Release Tracking](https://docs.sentry.io/product/releases/)
- [Sentry Alerts](https://docs.sentry.io/product/alerts/)
