-- ============================================================================
-- PRICE TRACKING V2 - DATABASE MIGRATION
-- ============================================================================
-- This migration updates the price tracking schema to support:
-- - Rolling baseline prices (renamed from last_tracked_price)
-- - User inactivity detection (last_viewed_at)
-- - Failure tracking (consecutive_failures)
-- - Tracking disable reasons
--
-- Run this in your Supabase SQL Editor.
-- All changes are backwards-compatible.
-- ============================================================================

-- ============================================================================
-- STEP 1: Rename last_tracked_price to baseline_price
-- ============================================================================
-- This makes the column's purpose clearer: it's the baseline for comparison,
-- NOT the most recent price found.

DO $$
BEGIN
  -- Only rename if the old column exists and new one doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'holidays'
    AND column_name = 'last_tracked_price'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'holidays'
    AND column_name = 'baseline_price'
  ) THEN
    ALTER TABLE public.holidays RENAME COLUMN last_tracked_price TO baseline_price;
    RAISE NOTICE 'Renamed last_tracked_price to baseline_price';
  ELSE
    RAISE NOTICE 'Column rename skipped (already done or source missing)';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add new columns for enhanced price tracking
-- ============================================================================

-- When the baseline was established or last updated (for debugging/display)
ALTER TABLE public.holidays
ADD COLUMN IF NOT EXISTS baseline_set_at TIMESTAMPTZ;

-- Most recent price found (for display, separate from baseline)
ALTER TABLE public.holidays
ADD COLUMN IF NOT EXISTS last_price_found DECIMAL(10, 2);

-- Track consecutive scan failures (disable after 3)
ALTER TABLE public.holidays
ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0;

-- Track when user last viewed this project (for inactivity detection)
ALTER TABLE public.holidays
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- Why tracking was disabled: 'manual', 'inactivity', 'failures', or NULL
ALTER TABLE public.holidays
ADD COLUMN IF NOT EXISTS tracking_disabled_reason TEXT;

-- ============================================================================
-- STEP 3: Backfill baseline_set_at for existing tracked holidays
-- ============================================================================
-- Set baseline_set_at to last_price_check for holidays that already have a baseline

UPDATE public.holidays
SET baseline_set_at = last_price_check
WHERE baseline_price IS NOT NULL
  AND baseline_set_at IS NULL
  AND last_price_check IS NOT NULL;

-- ============================================================================
-- STEP 4: Backfill last_viewed_at for existing tracked holidays
-- ============================================================================
-- Set last_viewed_at to updated_at so existing users don't get immediately
-- flagged as inactive

UPDATE public.holidays
SET last_viewed_at = COALESCE(updated_at, created_at, NOW())
WHERE price_tracking_enabled = true
  AND last_viewed_at IS NULL;

-- ============================================================================
-- STEP 5: Add indexes for new query patterns
-- ============================================================================

-- Index for finding holidays to check for inactivity
CREATE INDEX IF NOT EXISTS holidays_last_viewed_at_idx
  ON public.holidays(last_viewed_at)
  WHERE price_tracking_enabled = true;

-- Index for finding holidays with consecutive failures
CREATE INDEX IF NOT EXISTS holidays_consecutive_failures_idx
  ON public.holidays(consecutive_failures)
  WHERE consecutive_failures > 0;

-- ============================================================================
-- STEP 6: Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.holidays.baseline_price IS 'The baseline price for comparison. Only updated when an alert is sent.';
COMMENT ON COLUMN public.holidays.baseline_set_at IS 'When the baseline price was established or last updated after an alert.';
COMMENT ON COLUMN public.holidays.last_price_found IS 'The most recent price found during scanning (for display purposes).';
COMMENT ON COLUMN public.holidays.consecutive_failures IS 'Number of consecutive failed price scans. Tracking disabled at 3.';
COMMENT ON COLUMN public.holidays.last_viewed_at IS 'When the user last viewed this project. Used for inactivity detection.';
COMMENT ON COLUMN public.holidays.tracking_disabled_reason IS 'Why tracking was disabled: manual, inactivity, or failures. NULL if active.';

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify the migration)
-- ============================================================================

-- Check new columns exist
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'holidays'
-- AND column_name IN ('baseline_price', 'baseline_set_at', 'last_price_found',
--                     'consecutive_failures', 'last_viewed_at', 'tracking_disabled_reason')
-- ORDER BY column_name;

-- Check backfill worked
-- SELECT id, name, baseline_price, baseline_set_at, last_viewed_at
-- FROM public.holidays
-- WHERE price_tracking_enabled = true
-- LIMIT 10;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
