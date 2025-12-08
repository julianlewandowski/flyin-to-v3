-- ============================================================================
-- PRICE TRACKING SYSTEM - DATABASE MIGRATION
-- ============================================================================
-- This script adds safe, non-breaking changes for the flight price tracking
-- feature. All fields have safe defaults so existing code continues to work.
--
-- Run this in your Supabase SQL Editor to update your database.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add price tracking fields to holidays table
-- ============================================================================
-- These fields enable per-holiday price tracking configuration
-- All fields have safe defaults to prevent breaking existing functionality

ALTER TABLE public.holidays
ADD COLUMN IF NOT EXISTS price_tracking_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_tracked_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS price_drop_threshold_percent DECIMAL(5, 2) DEFAULT 10.0,
ADD COLUMN IF NOT EXISTS has_active_price_alert BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_price_check TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Create price_drop_alerts table
-- ============================================================================
-- Stores historical price drop alerts for tracked holidays
-- This is separate from the existing alerts table to avoid conflicts

CREATE TABLE IF NOT EXISTS public.price_drop_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_id UUID NOT NULL REFERENCES public.holidays(id) ON DELETE CASCADE,
  old_price DECIMAL(10, 2) NOT NULL,
  new_price DECIMAL(10, 2) NOT NULL,
  percent_drop DECIMAL(5, 2) NOT NULL,
  route_info JSONB,  -- Optional: stores which route dropped in price
  date_info JSONB,   -- Optional: stores which dates produced the drop
  resolved BOOLEAN DEFAULT false,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Enable Row Level Security on price_drop_alerts
-- ============================================================================

ALTER TABLE public.price_drop_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price_drop_alerts
DO $$
BEGIN
  -- SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'price_drop_alerts' 
    AND policyname = 'price_drop_alerts_select_own'
  ) THEN
    CREATE POLICY "price_drop_alerts_select_own"
      ON public.price_drop_alerts FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.holidays
          WHERE holidays.id = price_drop_alerts.holiday_id
          AND holidays.user_id = auth.uid()
        )
      );
  END IF;

  -- INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'price_drop_alerts' 
    AND policyname = 'price_drop_alerts_insert_own'
  ) THEN
    CREATE POLICY "price_drop_alerts_insert_own"
      ON public.price_drop_alerts FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.holidays
          WHERE holidays.id = price_drop_alerts.holiday_id
          AND holidays.user_id = auth.uid()
        )
      );
  END IF;

  -- UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'price_drop_alerts' 
    AND policyname = 'price_drop_alerts_update_own'
  ) THEN
    CREATE POLICY "price_drop_alerts_update_own"
      ON public.price_drop_alerts FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.holidays
          WHERE holidays.id = price_drop_alerts.holiday_id
          AND holidays.user_id = auth.uid()
        )
      );
  END IF;

  -- DELETE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'price_drop_alerts' 
    AND policyname = 'price_drop_alerts_delete_own'
  ) THEN
    CREATE POLICY "price_drop_alerts_delete_own"
      ON public.price_drop_alerts FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.holidays
          WHERE holidays.id = price_drop_alerts.holiday_id
          AND holidays.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Create indexes for performance
-- ============================================================================

-- Index for finding holidays with tracking enabled
CREATE INDEX IF NOT EXISTS holidays_price_tracking_enabled_idx 
  ON public.holidays(price_tracking_enabled) 
  WHERE price_tracking_enabled = true;

-- Index for finding holidays with active alerts
CREATE INDEX IF NOT EXISTS holidays_has_active_price_alert_idx 
  ON public.holidays(has_active_price_alert) 
  WHERE has_active_price_alert = true;

-- Indexes for price_drop_alerts table
CREATE INDEX IF NOT EXISTS price_drop_alerts_holiday_id_idx 
  ON public.price_drop_alerts(holiday_id);

CREATE INDEX IF NOT EXISTS price_drop_alerts_resolved_idx 
  ON public.price_drop_alerts(resolved) 
  WHERE resolved = false;

CREATE INDEX IF NOT EXISTS price_drop_alerts_created_at_idx 
  ON public.price_drop_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS price_drop_alerts_notified_idx 
  ON public.price_drop_alerts(notified) 
  WHERE notified = false;

-- ============================================================================
-- STEP 5: Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.holidays.price_tracking_enabled IS 'When true, this holiday is included in daily price tracking scans';
COMMENT ON COLUMN public.holidays.last_tracked_price IS 'The last recorded lowest price for this holiday';
COMMENT ON COLUMN public.holidays.price_drop_threshold_percent IS 'Percentage drop required to trigger an alert (default 10%)';
COMMENT ON COLUMN public.holidays.has_active_price_alert IS 'True if there is an unresolved price drop alert';
COMMENT ON COLUMN public.holidays.last_price_check IS 'Timestamp of the last automated price check';

COMMENT ON TABLE public.price_drop_alerts IS 'Stores price drop alerts for tracked holidays';
COMMENT ON COLUMN public.price_drop_alerts.route_info IS 'JSON object with origin, destination info for the price drop';
COMMENT ON COLUMN public.price_drop_alerts.date_info IS 'JSON object with departure and return dates for the price drop';
COMMENT ON COLUMN public.price_drop_alerts.resolved IS 'True when user has acknowledged/dismissed the alert';
COMMENT ON COLUMN public.price_drop_alerts.notified IS 'True when email notification has been sent';

-- ============================================================================
-- VERIFICATION QUERIES (Optional - run these to verify the update)
-- ============================================================================

-- Check new columns on holidays table
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'holidays' 
-- AND column_name IN ('price_tracking_enabled', 'last_tracked_price', 'price_drop_threshold_percent', 'has_active_price_alert', 'last_price_check')
-- ORDER BY column_name;

-- Check price_drop_alerts table
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'price_drop_alerts' 
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('holidays', 'price_drop_alerts') 
-- AND indexname LIKE '%price%'
-- ORDER BY indexname;

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- Your database is now ready for the price tracking feature.
-- All changes are backwards-compatible with existing code.
-- ============================================================================

