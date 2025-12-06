-- ============================================================================
-- COMPLETE SCHEMA UPDATE FOR FLYIN.TO
-- ============================================================================
-- This script brings your Supabase database up to date with the current
-- version of Flyin.to. It's safe to run multiple times (uses IF NOT EXISTS).
--
-- Run this in your Supabase SQL Editor to update your database.
-- ============================================================================

-- ============================================================================
-- STEP 1: Update holidays table with new columns
-- ============================================================================
-- Adds support for AI discovery, flexible date inputs, and trip preferences

ALTER TABLE public.holidays
ADD COLUMN IF NOT EXISTS origins TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS trip_duration_min INTEGER,
ADD COLUMN IF NOT EXISTS trip_duration_max INTEGER,
ADD COLUMN IF NOT EXISTS preferred_weekdays TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS max_layovers INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS use_ai_discovery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_discovery_results JSONB,
ADD COLUMN IF NOT EXISTS last_ai_scan TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Update flights table with new columns
-- ============================================================================
-- Adds support for Airhob integration, price tracking, and provider deep-links

ALTER TABLE public.flights
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'airhob',
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS track_id TEXT,
ADD COLUMN IF NOT EXISTS fare_id TEXT,
ADD COLUMN IF NOT EXISTS referral_link TEXT,
ADD COLUMN IF NOT EXISTS baggage_info JSONB,
ADD COLUMN IF NOT EXISTS layovers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flight_duration TEXT,
ADD COLUMN IF NOT EXISTS old_price DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS deal_url TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT;

-- ============================================================================
-- STEP 3: Create ai_insights table (if it doesn't exist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_id UUID NOT NULL REFERENCES public.holidays(id) ON DELETE CASCADE,
  insight_text TEXT NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('price_trend', 'best_time', 'alternative_destination', 'general')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on ai_insights
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_insights (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ai_insights' 
    AND policyname = 'ai_insights_select_own'
  ) THEN
    CREATE POLICY "ai_insights_select_own"
      ON public.ai_insights FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.holidays
          WHERE holidays.id = ai_insights.holiday_id
          AND holidays.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ai_insights' 
    AND policyname = 'ai_insights_insert_own'
  ) THEN
    CREATE POLICY "ai_insights_insert_own"
      ON public.ai_insights FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.holidays
          WHERE holidays.id = ai_insights.holiday_id
          AND holidays.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'ai_insights' 
    AND policyname = 'ai_insights_delete_own'
  ) THEN
    CREATE POLICY "ai_insights_delete_own"
      ON public.ai_insights FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.holidays
          WHERE holidays.id = ai_insights.holiday_id
          AND holidays.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Create alerts table (if it doesn't exist)
-- ============================================================================
-- For price drop notifications

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_id UUID NOT NULL REFERENCES public.holidays(id) ON DELETE CASCADE,
  flight_id UUID NOT NULL REFERENCES public.flights(id) ON DELETE CASCADE,
  old_price DECIMAL(10, 2) NOT NULL,
  new_price DECIMAL(10, 2) NOT NULL,
  price_drop_percent DECIMAL(5, 2) NOT NULL,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on alerts
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alerts (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'alerts' 
    AND policyname = 'alerts_select_own'
  ) THEN
    CREATE POLICY "alerts_select_own"
      ON public.alerts FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.holidays
          WHERE holidays.id = alerts.holiday_id
          AND holidays.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'alerts' 
    AND policyname = 'alerts_insert_own'
  ) THEN
    CREATE POLICY "alerts_insert_own"
      ON public.alerts FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.holidays
          WHERE holidays.id = alerts.holiday_id
          AND holidays.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Create indexes for performance
-- ============================================================================

-- Indexes for flights table
CREATE INDEX IF NOT EXISTS flights_track_id_idx ON public.flights(track_id);
CREATE INDEX IF NOT EXISTS flights_verified_at_idx ON public.flights(verified_at);
CREATE INDEX IF NOT EXISTS flights_provider_idx ON public.flights(provider);

-- Indexes for ai_insights table
CREATE INDEX IF NOT EXISTS ai_insights_holiday_id_idx ON public.ai_insights(holiday_id);
CREATE INDEX IF NOT EXISTS ai_insights_created_at_idx ON public.ai_insights(created_at DESC);

-- Indexes for alerts table
CREATE INDEX IF NOT EXISTS alerts_holiday_id_idx ON public.alerts(holiday_id);
CREATE INDEX IF NOT EXISTS alerts_notified_idx ON public.alerts(notified);

-- ============================================================================
-- STEP 6: Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.flights.deal_url IS 'Direct deep-link URL to the provider''s booking page';
COMMENT ON COLUMN public.flights.provider IS 'Provider name (e.g., Turkish Airlines, Expedia, Google Flights)';

-- ============================================================================
-- VERIFICATION QUERIES (Optional - run these to verify the update)
-- ============================================================================

-- Check holidays table columns
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'holidays' 
-- ORDER BY ordinal_position;

-- Check flights table columns
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'flights' 
-- ORDER BY ordinal_position;

-- Check if tables exist
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('holidays', 'flights', 'ai_insights', 'alerts')
-- ORDER BY table_name;

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- Your database should now be up to date with the current Flyin.to schema.
-- ============================================================================

