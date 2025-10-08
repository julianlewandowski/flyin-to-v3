-- Create holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destinations TEXT[] NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "holidays_select_own"
  ON public.holidays FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "holidays_insert_own"
  ON public.holidays FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "holidays_update_own"
  ON public.holidays FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "holidays_delete_own"
  ON public.holidays FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS holidays_user_id_idx ON public.holidays(user_id);
CREATE INDEX IF NOT EXISTS holidays_created_at_idx ON public.holidays(created_at DESC);
