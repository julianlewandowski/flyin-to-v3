# Price Tracking Setup Guide - 24 Hour Automation

This guide will help you set up automated price tracking that runs every 24 hours.

## Overview

The price tracking system:
- ✅ Runs automatically every 24 hours (currently scheduled for 8 AM UTC daily)
- ✅ Checks all holidays with `price_tracking_enabled = true`
- ✅ Compares current prices with last tracked prices
- ✅ Creates alerts when prices drop below the threshold (default: 10%)
- ✅ Updates holiday records with new prices

## Current Configuration

### Cron Schedule
The cron job is configured in `frontend/vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/price-check",
      "schedule": "0 8 * * *"  // Runs daily at 8:00 AM UTC
    }
  ]
}
```

**To change the schedule:**
- `0 8 * * *` = Daily at 8 AM UTC (current)
- `0 */24 * * *` = Every 24 hours (not recommended - use daily instead)
- `0 0 * * *` = Daily at midnight UTC
- `0 12 * * *` = Daily at noon UTC

## Setup Steps

### Step 1: Set Up Environment Variables

#### For Local Development

Create or update `frontend/.env.local`:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# SerpAPI (Required for flight search)
SERPAPI_KEY=your_serpapi_key

# OpenAI (Required for date optimization)
OPENAI_API_KEY=your_openai_api_key

# Cron Job Security (Required for production, optional for local)
# Generate using: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
CRON_SECRET=your_random_secret_here
```

#### For Production (Vercel)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables (set for **Production** environment):
   - `CRON_SECRET` - Generate a random secret (see below)
   - All other required API keys (Supabase, SerpAPI, OpenAI, etc.)

**Generate CRON_SECRET:**
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 2: Using OpenSSL
openssl rand -base64 32

# Option 3: Using PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Step 2: Enable Price Tracking for Holidays

Price tracking must be enabled per holiday. Follow these steps:

#### Step 2a: Find Your Holiday IDs

First, run this query in Supabase SQL Editor to see all your holidays:

```sql
SELECT 
  id,
  name,
  origin,
  destinations,
  start_date,
  end_date,
  price_tracking_enabled
FROM holidays
ORDER BY created_at DESC;
```

This will show you all your holidays with their UUIDs (the `id` column).

#### Step 2b: Enable Tracking

**Option A: Enable for a specific holiday**
```sql
-- Replace 'YOUR-HOLIDAY-UUID-HERE' with the actual UUID from Step 2a
-- Example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
UPDATE holidays 
SET 
  price_tracking_enabled = true,
  price_drop_threshold_percent = 10.0  -- Alert when price drops 10% or more
WHERE id = 'YOUR-HOLIDAY-UUID-HERE';
```

**Option B: Enable for ALL holidays**
```sql
-- This enables tracking for all your holidays
UPDATE holidays 
SET 
  price_tracking_enabled = true,
  price_drop_threshold_percent = 10.0
WHERE price_tracking_enabled IS NULL OR price_tracking_enabled = false;
```

**Note:** Holiday IDs are UUIDs (like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`), not simple text. You must use the actual UUID from your database.

See `scripts/enable_price_tracking.sql` for a complete script with all these queries.

#### Option B: Via API (if you have an endpoint)
Check if there's an API endpoint at `/api/holidays/{id}/price-tracking/enable`

### Step 3: Verify Database Schema

Make sure your database has the required columns. Run this SQL in your Supabase SQL Editor:

```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'holidays' 
AND column_name IN (
  'price_tracking_enabled',
  'last_tracked_price',
  'price_drop_threshold_percent',
  'has_active_price_alert',
  'last_price_check'
);

-- If missing, run the migration script
-- See: scripts/008_add_price_tracking.sql
```

### Step 4: Test the Cron Endpoint Locally

Before deploying, test the endpoint:

```bash
# Start your development server
cd frontend
npm run dev

# In another terminal, test the endpoint
curl http://localhost:3000/api/cron/price-check?secret=your_cron_secret
```

Or use a tool like Postman/Insomnia:
- **Method:** GET
- **URL:** `http://localhost:3000/api/cron/price-check?secret=your_cron_secret`
- **Headers:** (optional) `Authorization: Bearer your_cron_secret`

### Step 5: Deploy to Vercel

1. **Push your code to GitHub** (or your connected Git provider)

2. **Vercel will automatically:**
   - Detect the `vercel.json` file
   - Set up the cron job
   - Start running it on the specified schedule

3. **Verify the cron job is active:**
   - Go to Vercel Dashboard → Your Project → **Cron Jobs** tab
   - You should see the `price-check` job listed
   - Check the execution logs to see if it's running

### Step 6: Monitor the Cron Job

#### Check Vercel Logs
1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Click on a deployment → **Functions** tab
3. Look for `/api/cron/price-check` function logs

#### Check Application Logs
The cron job logs important information:
- Number of holidays checked
- Number of alerts created
- Any errors encountered

Look for log entries like:
```
[Cron] Starting daily price check...
[PriceTracker] Starting daily price check job
[PriceTracker] Found X holidays to check
[PriceTracker] Completed: X checked, Y alerts, Z errors
```

## Troubleshooting

### Cron Job Not Running

1. **Check Vercel Cron Jobs Tab**
   - Go to Vercel Dashboard → Project → **Cron Jobs**
   - Verify the job is listed and enabled
   - Check the last execution time

2. **Verify `vercel.json` is in the correct location**
   - Should be in `frontend/vercel.json` (root of your Next.js app)

3. **Check Environment Variables**
   - Ensure `CRON_SECRET` is set in Vercel
   - Verify all required API keys are present

4. **Check Function Logs**
   - Look for 401 Unauthorized errors (authentication issue)
   - Look for 500 errors (code issue)

### Authentication Errors

If you see `401 Unauthorized`:
- Verify `CRON_SECRET` is set in Vercel environment variables
- Make sure it matches what you're using (if testing manually)
- In production, Vercel cron jobs should work automatically

### No Holidays Being Checked

1. **Verify holidays have tracking enabled:**
   ```sql
   SELECT id, name, price_tracking_enabled 
   FROM holidays 
   WHERE price_tracking_enabled = true;
   ```

2. **Check if holidays exist:**
   ```sql
   SELECT COUNT(*) FROM holidays;
   ```

### Price Checks Not Finding Flights

1. **Verify SerpAPI key is valid and has quota**
2. **Check SerpAPI logs for rate limit errors**
3. **Verify holiday has valid origin/destination/date information**

## Manual Testing

You can manually trigger the price check:

```bash
# Using curl
curl -X GET "https://your-app.vercel.app/api/cron/price-check?secret=your_cron_secret"

# Or with Authorization header
curl -X GET "https://your-app.vercel.app/api/cron/price-check" \
  -H "Authorization: Bearer your_cron_secret"
```

## Changing the Schedule

To change when the cron job runs, edit `frontend/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/price-check",
      "schedule": "0 12 * * *"  // Change to noon UTC
    }
  ]
}
```

**Cron Schedule Format:** `minute hour day month weekday`
- `0 8 * * *` = 8:00 AM UTC daily
- `0 */12 * * *` = Every 12 hours
- `0 0 * * *` = Midnight UTC daily

After changing, redeploy to Vercel for changes to take effect.

## Next Steps

1. ✅ Set up environment variables
2. ✅ Enable price tracking for at least one holiday
3. ✅ Deploy to Vercel
4. ✅ Monitor the first few runs
5. ✅ Set up notifications (if desired) for price drops

## Additional Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Supabase Dashboard](https://supabase.com/dashboard)
- Price tracker service: `frontend/lib/services/price-tracker.ts`
- Cron endpoint: `frontend/app/api/cron/price-check/route.ts`
