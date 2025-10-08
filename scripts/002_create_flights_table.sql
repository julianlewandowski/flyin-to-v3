-- Create flights table
CREATE TABLE IF NOT EXISTS public.flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_id UUID NOT NULL REFERENCES public.holidays(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  price DECIMAL(10, 2) NOT NULL,
  airline TEXT,
  booking_link TEXT,
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see flights for their own holidays)
CREATE POLICY "flights_select_own"
  ON public.flights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.holidays
      WHERE holidays.id = flights.holiday_id
      AND holidays.user_id = auth.uid()
    )
  );

CREATE POLICY "flights_insert_own"
  ON public.flights FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.holidays
      WHERE holidays.id = flights.holiday_id
      AND holidays.user_id = auth.uid()
    )
  );

CREATE POLICY "flights_update_own"
  ON public.flights FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.holidays
      WHERE holidays.id = flights.holiday_id
      AND holidays.user_id = auth.uid()
    )
  );

CREATE POLICY "flights_delete_own"
  ON public.flights FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.holidays
      WHERE holidays.id = flights.holiday_id
      AND holidays.user_id = auth.uid()
    )
  );

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS flights_holiday_id_idx ON public.flights(holiday_id);
CREATE INDEX IF NOT EXISTS flights_price_idx ON public.flights(price);
CREATE INDEX IF NOT EXISTS flights_departure_date_idx ON public.flights(departure_date);
