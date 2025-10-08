-- Create ai_insights table
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_id UUID NOT NULL REFERENCES public.holidays(id) ON DELETE CASCADE,
  insight_text TEXT NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('price_trend', 'best_time', 'alternative_destination', 'general')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see insights for their own holidays)
CREATE POLICY "ai_insights_select_own"
  ON public.ai_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.holidays
      WHERE holidays.id = ai_insights.holiday_id
      AND holidays.user_id = auth.uid()
    )
  );

CREATE POLICY "ai_insights_insert_own"
  ON public.ai_insights FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.holidays
      WHERE holidays.id = ai_insights.holiday_id
      AND holidays.user_id = auth.uid()
    )
  );

CREATE POLICY "ai_insights_delete_own"
  ON public.ai_insights FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.holidays
      WHERE holidays.id = ai_insights.holiday_id
      AND holidays.user_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS ai_insights_holiday_id_idx ON public.ai_insights(holiday_id);
CREATE INDEX IF NOT EXISTS ai_insights_created_at_idx ON public.ai_insights(created_at DESC);
