-- Update holidays table to support AI discovery and flexible inputs
ALTER TABLE public.holidays
ADD COLUMN IF NOT EXISTS origins TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS trip_duration_min INTEGER,
ADD COLUMN IF NOT EXISTS trip_duration_max INTEGER,
ADD COLUMN IF NOT EXISTS preferred_weekdays TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS max_layovers INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS use_ai_discovery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_discovery_results JSONB,
ADD COLUMN IF NOT EXISTS last_ai_scan TIMESTAMPTZ;

-- Update flights table to support Airhob data
ALTER TABLE public.flights
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'airhob',
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS track_id TEXT,
ADD COLUMN IF NOT EXISTS fare_id TEXT,
ADD COLUMN IF NOT EXISTS referral_link TEXT,
ADD COLUMN IF NOT EXISTS baggage_info JSONB,
ADD COLUMN IF NOT EXISTS layovers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flight_duration TEXT,
ADD COLUMN IF NOT EXISTS old_price DECIMAL(10, 2);

-- Create alerts table for price drop notifications
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

-- RLS Policies for alerts
CREATE POLICY "alerts_select_own"
  ON public.alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.holidays
      WHERE holidays.id = alerts.holiday_id
      AND holidays.user_id = auth.uid()
    )
  );

CREATE POLICY "alerts_insert_own"
  ON public.alerts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.holidays
      WHERE holidays.id = alerts.holiday_id
      AND holidays.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS alerts_holiday_id_idx ON public.alerts(holiday_id);
CREATE INDEX IF NOT EXISTS alerts_notified_idx ON public.alerts(notified);
CREATE INDEX IF NOT EXISTS flights_track_id_idx ON public.flights(track_id);
CREATE INDEX IF NOT EXISTS flights_verified_at_idx ON public.flights(verified_at);
