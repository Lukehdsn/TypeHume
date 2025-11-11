# TextHume Database Schema

## Overview

This document describes the PostgreSQL database schema used by TextHume. The database is hosted on Supabase.

**Database URL**: `https://ghksnuggvxqdxerapfhh.supabase.co`

---

## Tables

### `users`

Stores user account information and subscription details.

```sql
CREATE TABLE users (
  -- Authentication
  id TEXT PRIMARY KEY,                    -- Clerk user ID
  email TEXT NOT NULL,                     -- User's email address

  -- Plan & Subscription
  plan TEXT NOT NULL DEFAULT 'free',       -- 'free' | 'starter' | 'pro' | 'premium'
  word_limit INTEGER NOT NULL DEFAULT 500, -- Maximum words per month
  words_used INTEGER NOT NULL DEFAULT 0,   -- Words consumed this month
  billing_period TEXT DEFAULT 'monthly',   -- 'monthly' | 'annual'

  -- Stripe Integration
  stripe_customer_id TEXT UNIQUE,          -- Stripe customer ID
  stripe_subscription_id TEXT UNIQUE,      -- Current active subscription ID

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX idx_users_stripe_subscription_id ON users(stripe_subscription_id);
CREATE INDEX idx_users_email ON users(email);
```

**Columns**:
- `id`: Primary key, references Clerk user ID
- `email`: User's email address
- `plan`: Subscription plan tier (determines word limit)
- `word_limit`: Monthly word allowance (resets on renewal)
- `words_used`: Current month's word consumption
- `billing_period`: 'monthly' or 'annual' (used for pricing display)
- `stripe_customer_id`: Links to Stripe customer account
- `stripe_subscription_id`: Links to current Stripe subscription
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

---

### `humanizations`

Stores history of humanization operations for audit and analytics.

```sql
CREATE TABLE humanizations (
  id BIGSERIAL PRIMARY KEY,

  -- User Reference
  user_id TEXT NOT NULL,                   -- References users(id)

  -- Content
  input_text TEXT NOT NULL,                -- Original AI text
  output_text TEXT NOT NULL,               -- Humanized text

  -- Usage Tracking
  words_used INTEGER NOT NULL,             -- Words consumed for this request

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_humanizations_user_id ON humanizations(user_id);
CREATE INDEX idx_humanizations_created_at ON humanizations(created_at);

-- Foreign Key Constraint
ALTER TABLE humanizations
ADD CONSTRAINT fk_humanizations_user_id
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

**Columns**:
- `id`: Auto-incrementing primary key
- `user_id`: Foreign key to `users.id`
- `input_text`: Original AI-generated text (for audit trail)
- `output_text`: Humanized output
- `words_used`: Number of words consumed
- `created_at`: When the humanization was created

**Data Retention Note**: Consider implementing a retention policy (e.g., delete records older than 90 days) to manage database size and comply with privacy regulations.

---

## Row Level Security (RLS) Policies

Row Level Security must be enabled on both tables to prevent users from accessing other users' data.

### Enable RLS

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on humanizations table
ALTER TABLE humanizations ENABLE ROW LEVEL SECURITY;
```

### Users Table Policies

Users should only be able to read their own row and update certain fields.

```sql
-- Users can read their own row
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own row
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Authenticated users can insert their own row (for initialization)
-- Note: This requires careful handling to prevent unauthorized plan upgrades
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### Humanizations Table Policies

Users should only read their own humanizations.

```sql
-- Users can read their own humanizations
CREATE POLICY humanizations_select_own ON humanizations
  FOR SELECT
  USING (user_id = auth.uid());

-- Server code can insert (via service role key)
-- No policy needed for service role key

-- Users should not be able to insert, update, or delete their own records
-- (All writes go through API with service role key)
```

### Admin/Service Role Access

The service role key (used in backend API routes) bypasses all RLS policies and can:
- Read/write any user's data
- Delete users
- Perform batch operations

**Security Note**: Never expose the service role key to the client. Only use it in server-side code.

---

## Database Triggers

### Auto-update `updated_at` on users table

```sql
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();
```

---

## Backup Strategy

**Status**: Verify that Supabase auto-backups are enabled in project settings.

- **Frequency**: Daily automated backups
- **Retention**: 30 days
- **Restore**: Available via Supabase dashboard

---

## Performance Considerations

### Query Optimization

Key indexes are created on:
- `users.stripe_customer_id` - Used in webhook handlers
- `users.stripe_subscription_id` - Used in webhook handlers
- `users.email` - Used for lookups
- `humanizations.user_id` - Used for user history
- `humanizations.created_at` - Used for retention policies

### Connection Pooling

The application uses Supabase's connection pooler (pgbouncer) for efficient connection management. Ensure the pool size matches expected concurrent load.

---

## Migration History

### Version 1.0 (Initial Schema)
- Created `users` table with plan and subscription fields
- Created `humanizations` table for audit trail
- Enabled RLS on both tables
- Added required indexes

---

## Environment Variables

The database is accessed using these credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ghksnuggvxqdxerapfhh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>        # For client-side reads with RLS
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # For server-side operations
```

**Security**: Never expose the service role key to clients. Keep it only in `.env.local` and Vercel secrets.

---

## Disaster Recovery

In case of database corruption:

1. Use Supabase dashboard to restore from a backup
2. Verify data integrity with a few test queries
3. Check application logs for any errors
4. Notify users if necessary

---

## Future Improvements

- [ ] Implement data retention policy (auto-delete old humanizations)
- [ ] Add audit logging for subscription changes
- [ ] Create stored procedures for complex operations
- [ ] Implement full-text search on humanizations
- [ ] Add analytics tables for reporting
