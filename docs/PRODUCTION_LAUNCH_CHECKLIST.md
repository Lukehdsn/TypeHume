# TextHume Production Launch Checklist

This checklist covers all critical items needed before launching TextHume with real payments and users.

---

## ✅ CRITICAL SECURITY FIXES (COMPLETED)

These issues have been fixed in the codebase:

- [x] **Humanize API Authentication** - Added Clerk auth verification to prevent unauthorized access
- [x] **Rate Limiting** - Implemented 10 requests/minute per user to prevent abuse
- [x] **Annual Pricing Bug** - Fixed calculation that was overcharging by 12x
- [x] **Word Deduction Race Condition** - Added atomic UPDATE with constraint checking
- [x] **User Initialization Race Condition** - Switched to upsert to prevent duplicate keys
- [x] **Stripe Webhook Handlers** - Implemented all missing event handlers:
  - subscription.updated: Handle plan changes
  - subscription.deleted: Downgrade to free
  - invoice.payment_failed: Log failures
  - invoice.payment_succeeded: Reset words on renewal
- [x] **Claude API Response Validation** - Added strict validation before using responses
- [x] **Input Validation** - Added Zod schemas to all API endpoints
- [x] **CORS Protection** - Restricted API access to your domain only

---

## ⚠️ BEFORE GOING LIVE

### 1. Environment Variables Setup

**Status**: Must complete before deploy

Required environment variables in Vercel:

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=xxx
CLERK_SECRET_KEY=xxx
CLERK_WEBHOOK_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=xxx (PRODUCTION KEY, not test)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=xxx (PRODUCTION KEY)
STRIPE_WEBHOOK_SECRET=xxx (for production endpoint)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Anthropic
ANTHROPIC_API_KEY=xxx

# Sentry
NEXT_PUBLIC_SENTRY_DSN=xxx
SENTRY_DSN=xxx
SENTRY_ORG=xxx
SENTRY_PROJECT=xxx
SENTRY_AUTH_TOKEN=xxx

# Rate Limiting (Upstash)
UPSTASH_REDIS_REST_URL=xxx
UPSTASH_REDIS_REST_TOKEN=xxx

# App Config
NEXT_PUBLIC_APP_URL=https://texthume.com
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 2. Rotate API Keys

**Status**: CRITICAL - Do not skip

```bash
# 1. Rotate Clerk keys
#    - Go to Clerk Dashboard → API Keys
#    - Delete old keys, create new production keys
#    - Update CLERK_* env vars in Vercel

# 2. Rotate Stripe keys
#    - Go to Stripe Dashboard → API Keys
#    - Use LIVE keys, not test keys
#    - Add new webhook endpoint (see below)

# 3. Verify Supabase keys
#    - SUPABASE_SERVICE_ROLE_KEY must be kept secret!
#    - Only use in server-side code

# 4. Verify Anthropic key
#    - Use production key if available
#    - Do NOT use development key

# 5. Set up Upstash Redis
#    - Create free account at upstash.com
#    - Create Redis database
#    - Copy UPSTASH_REDIS_REST_* keys
```

### 3. Configure Stripe Webhooks

**Status**: CRITICAL - Payment won't work without this

1. Go to Stripe Dashboard → Webhooks
2. Create endpoint: `https://texthume.com/api/webhooks/stripe`
3. Select these events to receive:
   - ✓ `checkout.session.completed`
   - ✓ `customer.subscription.updated`
   - ✓ `customer.subscription.deleted`
   - ✓ `invoice.payment_succeeded`
   - ✓ `invoice.payment_failed`
4. Copy webhook signing secret
5. Set `STRIPE_WEBHOOK_SECRET` in Vercel (production endpoint secret)

**Verification**:
```bash
# After deployment, test webhook delivery:
1. Go to Stripe Dashboard → Webhooks → endpoint
2. Scroll to "Events" section
3. Verify recent deliveries show "Signed"
4. Click one to see request/response
```

### 4. Set Up Clerk Live Keys

**Status**: CRITICAL - Authentication won't work otherwise

1. Go to Clerk Dashboard → Instances
2. Switch from Development to Production instance
3. Get production API keys
4. Update environment variables in Vercel
5. Test sign-in on production domain

### 5. Configure Sentry

**Status**: Recommended - helps track errors

1. Create account at [sentry.io](https://sentry.io)
2. Create new Next.js project
3. Get DSN and auth token
4. Add environment variables (see section 1)
5. Verify errors appear in Sentry dashboard

### 6. Enable Supabase Row Level Security

**Status**: CRITICAL - Prevents data leaks

Run these SQL commands in Supabase SQL Editor:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE humanizations ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own row
CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own row
CREATE POLICY users_insert_own ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can read their own humanizations
CREATE POLICY humanizations_select_own ON humanizations
  FOR SELECT USING (user_id = auth.uid());
```

**Verify RLS is enabled**:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('users', 'humanizations');
-- Should show: (users, true) and (humanizations, true)
```

### 7. Create Database Backups

**Status**: Recommended

1. Go to Supabase Dashboard → Backups
2. Verify daily backups are enabled
3. Save recovery procedures
4. Test restore procedure once

### 8. Set Up Error Logging

**Status**: Recommended - helps debug issues

Already done:
- ✓ Sentry integrated
- ✓ Console logging in API routes
- ✓ Stripe error tracking

Still needed:
- [ ] Set up log aggregation (Datadog, LogRocket, etc.)
- [ ] Configure alerts for critical errors
- [ ] Test error capture

### 9. Performance Testing

**Status**: Recommended

Before launch, test:

```bash
# 1. Load test humanize endpoint
#    - Send 100 concurrent requests
#    - Verify rate limiting works
#    - Check for errors

# 2. Database stress test
#    - Monitor query performance
#    - Ensure connection pooling works
#    - Check for slow queries

# 3. Payment flow test
#    - Complete test checkout
#    - Verify webhook fires
#    - Check database updates
```

### 10. Security Headers

**Status**: Already configured in next.config.js

Verify headers are set:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

Run test:
```bash
curl -I https://texthume.com
# Should show security headers
```

---

## 🧪 TESTING BEFORE LAUNCH

### Checkout Flow

```bash
# 1. Sign in with test account
# 2. Go to /pricing
# 3. Click "Upgrade to [Plan]"
# 4. Use Stripe test card: 4242 4242 4242 4242
# 5. Complete checkout
# 6. Verify:
#    - No errors in browser console
#    - User plan updated in database
#    - No errors in Sentry
#    - Stripe webhook fired successfully
```

### Humanizer Endpoint

```bash
# 1. Sign in
# 2. Go to /app
# 3. Paste text (100+ words)
# 4. Click "Humanize"
# 5. Verify:
#    - Text processes without errors
#    - Words used updates correctly
#    - Word limit enforced properly
#    - Response time < 10 seconds
```

### Rate Limiting

```bash
# 1. Try to send 15 requests in 1 minute
# 2. Verify 11th+ requests return 429
# 3. Check retry-after header
```

### Subscription Renewal

```bash
# 1. Complete checkout
# 2. In Stripe, advance subscription to renewal
# 3. Verify webhook fires
# 4. Check user's words_used reset to 0
# 5. Check database doesn't have errors
```

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] All environment variables added to Vercel
- [ ] Clerk production instance configured
- [ ] Stripe production webhook configured
- [ ] Sentry account created (optional but recommended)
- [ ] Upstash Redis created for rate limiting
- [ ] Supabase RLS policies enabled
- [ ] Database backups tested
- [ ] Security headers verified
- [ ] All endpoints tested locally
- [ ] Payment flow tested end-to-end
- [ ] Error logging verified
- [ ] Performance acceptable
- [ ] Team trained on monitoring

---

## 🚀 LAUNCH SEQUENCE

### 1. Week Before Launch

- [ ] Final security audit
- [ ] Database backup verification
- [ ] Load testing with realistic traffic
- [ ] Team training on monitoring tools
- [ ] Customer support documentation prepared

### 2. Day Before Launch

- [ ] All tests passing
- [ ] Staging environment matches production
- [ ] Runbook prepared for incident response
- [ ] On-call rotation setup
- [ ] Slack alerts configured

### 3. Launch Day

- [ ] Monitor error logs closely
- [ ] Watch for unusual activity
- [ ] Have team available for first 24 hours
- [ ] Track conversion metrics
- [ ] Document any issues for post-mortem

### 4. Post-Launch (Week 1)

- [ ] Monitor for bugs and errors
- [ ] Optimize performance based on real traffic
- [ ] Improve error messages based on user feedback
- [ ] Iterate on pricing if needed

---

## 🆘 TROUBLESHOOTING GUIDE

### Payment Not Working

**Symptoms**: Users can't complete checkout

**Checklist**:
- [ ] Stripe keys are LIVE keys, not test keys
- [ ] Webhook endpoint configured correctly in Stripe
- [ ] No errors in Sentry
- [ ] Check Stripe dashboard → Events for webhook failures
- [ ] Verify Stripe webhook secret matches `STRIPE_WEBHOOK_SECRET`

### Words Not Resetting on Renewal

**Symptoms**: Users can't use words after monthly renewal

**Checklist**:
- [ ] Verify webhook `invoice.payment_succeeded` is firing
- [ ] Check Stripe subscription status (should show active)
- [ ] Verify database trigger/function for word reset
- [ ] Check Sentry for errors during renewal

### Rate Limiting Not Working

**Symptoms**: Users can make unlimited requests

**Checklist**:
- [ ] Upstash credentials are set correctly
- [ ] `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` configured
- [ ] No errors in Sentry about rate limiter
- [ ] Test with curl: `for i in {1..15}; do curl ...; done`

### Database RLS Blocking Legitimate Requests

**Symptoms**: "permission denied" errors even for own data

**Checklist**:
- [ ] RLS policies are created correctly
- [ ] `auth.uid()` matches Clerk user IDs
- [ ] Service role key is used in server-side code only
- [ ] ANON key is only for client-side with RLS policies

---

## 📞 Support & Resources

- **Stripe Issues**: https://stripe.com/docs/troubleshooting
- **Clerk Issues**: https://clerk.com/docs/troubleshooting
- **Supabase Issues**: https://supabase.com/docs/guides/troubleshooting
- **Sentry Issues**: https://docs.sentry.io/troubleshooting/

---

## 🎓 Post-Launch Tasks

Once live and stable:

- [ ] Set up analytics (Mixpanel, Segment, etc.)
- [ ] Implement user feedback collection
- [ ] Create admin dashboard for monitoring
- [ ] Document runbooks for common issues
- [ ] Plan feature roadmap based on usage
- [ ] Set up automated performance testing
- [ ] Create disaster recovery procedures
- [ ] Plan security audit schedule

---

## Summary

**Total Critical Fixes Applied**: 11
- ✅ Authentication
- ✅ Authorization (CORS)
- ✅ Pricing
- ✅ Webhooks
- ✅ Validation
- ✅ Error Tracking
- ✅ Rate Limiting
- ✅ Race Conditions
- ✅ Monitoring
- ✅ Documentation
- ✅ Configuration

**Status**: Ready for production deployment with proper environment variable setup.

**Est. Time to Full Launch**: 2-3 hours
- 30min: Environment variable setup
- 30min: Stripe webhook configuration
- 30min: Testing and verification
- 30min: Final checks and deployment
