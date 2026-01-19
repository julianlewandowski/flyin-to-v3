# Supabase Migration Guide

This guide will help you update your Supabase database to match the current version of Flyin.to.

## Quick Migration (Recommended)

**Run this single script to update everything:**

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `scripts/007_complete_schema_update.sql`
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

This script is **safe to run multiple times** - it uses `IF NOT EXISTS` checks.

## What Gets Updated

### Holidays Table
Adds these new columns:
- `origins` (TEXT[]) - Multiple origin airports
- `trip_duration_min` (INTEGER) - Minimum trip duration in days
- `trip_duration_max` (INTEGER) - Maximum trip duration in days
- `preferred_weekdays` (TEXT[]) - Preferred days of week for travel
- `max_layovers` (INTEGER) - Maximum number of layovers
- `use_ai_discovery` (BOOLEAN) - Enable AI destination discovery
- `ai_discovery_results` (JSONB) - AI-discovered routes
- `last_ai_scan` (TIMESTAMPTZ) - Last AI scan timestamp

### Flights Table
Adds these new columns:
- `source` (TEXT) - Data source (e.g., "airhob", "serpapi")
- `verified_at` (TIMESTAMPTZ) - When flight was verified
- `track_id` (TEXT) - Airhob tracking ID
- `fare_id` (TEXT) - Airhob fare ID
- `referral_link` (TEXT) - Referral/affiliate link
- `baggage_info` (JSONB) - Baggage allowance information
- `layovers` (INTEGER) - Number of layovers
- `flight_duration` (TEXT) - Human-readable flight duration
- `old_price` (DECIMAL) - Previous price for tracking drops
- `deal_url` (TEXT) - **NEW** Direct deep-link to provider booking page
- `provider` (TEXT) - **NEW** Provider name (e.g., "Turkish Airlines", "Expedia")

### New Tables
- `ai_insights` - Stores AI-generated travel insights
- `alerts` - Price drop notifications

## Step-by-Step Migration (Alternative)

If you prefer to run migrations individually, run them in this order:

1. `scripts/001_create_holidays_table.sql` (if holidays table doesn't exist)
2. `scripts/002_create_flights_table.sql` (if flights table doesn't exist)
3. `scripts/003_create_ai_insights_table.sql` (if ai_insights table doesn't exist)
4. `scripts/005_update_schema_for_ai_airhob.sql` (adds new columns + alerts table)
5. `scripts/006_add_deal_url_provider.sql` (adds deal_url and provider columns)

## Verification

After running the migration, verify everything worked:

```sql
-- Check holidays table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'holidays' 
AND column_name IN ('origins', 'trip_duration_min', 'ai_discovery_results')
ORDER BY column_name;

-- Check flights table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'flights' 
AND column_name IN ('deal_url', 'provider', 'source', 'verified_at')
ORDER BY column_name;

-- Check if new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ai_insights', 'alerts')
ORDER BY table_name;
```

## Troubleshooting

### "Column already exists" errors
These are safe to ignore. The migration script uses `IF NOT EXISTS` to prevent errors.

### "Policy already exists" errors
The script checks for existing policies before creating them, so this shouldn't happen. If it does, you can safely ignore it.

### Missing tables
If you get errors about missing `holidays` or `flights` tables, run the base table creation scripts first:
- `scripts/001_create_holidays_table.sql`
- `scripts/002_create_flights_table.sql`

## Rollback

If you need to rollback (remove the new columns), you can run:

```sql
-- Remove new columns from holidays (WARNING: This will delete data!)
ALTER TABLE public.holidays
DROP COLUMN IF EXISTS origins,
DROP COLUMN IF EXISTS trip_duration_min,
DROP COLUMN IF EXISTS trip_duration_max,
DROP COLUMN IF EXISTS preferred_weekdays,
DROP COLUMN IF EXISTS max_layovers,
DROP COLUMN IF EXISTS use_ai_discovery,
DROP COLUMN IF EXISTS ai_discovery_results,
DROP COLUMN IF EXISTS last_ai_scan;

-- Remove new columns from flights (WARNING: This will delete data!)
ALTER TABLE public.flights
DROP COLUMN IF EXISTS source,
DROP COLUMN IF EXISTS verified_at,
DROP COLUMN IF EXISTS track_id,
DROP COLUMN IF EXISTS fare_id,
DROP COLUMN IF EXISTS referral_link,
DROP COLUMN IF EXISTS baggage_info,
DROP COLUMN IF EXISTS layovers,
DROP COLUMN IF EXISTS flight_duration,
DROP COLUMN IF EXISTS old_price,
DROP COLUMN IF EXISTS deal_url,
DROP COLUMN IF EXISTS provider;

-- Drop new tables (WARNING: This will delete all data!)
DROP TABLE IF EXISTS public.alerts;
-- Note: Don't drop ai_insights if you have data you want to keep
```

## Next Steps

After running the migration:

1. ✅ Verify the migration completed successfully
2. ✅ Update your environment variables if needed
3. ✅ Test the application to ensure everything works
4. ✅ Check that flight searches are saving `deal_url` and `provider` fields















