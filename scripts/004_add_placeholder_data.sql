-- Add placeholder holidays (will be associated with the first user who signs up)
-- Note: Replace 'YOUR_USER_ID' with actual user_id after signing up, or this will use auth.uid()
-- Insert sample holidays
INSERT INTO public.holidays (user_id, name, origin, destinations, start_date, end_date, budget)
VALUES 
  (auth.uid(), 'Summer Europe Trip', 'NYC', ARRAY['Paris', 'Rome', 'Barcelona'], '2025-07-01', '2025-07-15', 3500.00),
  (auth.uid(), 'Southeast Asia Adventure', 'LAX', ARRAY['Bangkok', 'Singapore', 'Bali'], '2025-09-10', '2025-09-25', 2800.00),
  (auth.uid(), 'Weekend in Tokyo', 'SFO', ARRAY['Tokyo'], '2025-06-15', '2025-06-20', 1500.00);
-- Insert sample flights for the holidays
-- Note: We'll use the holiday IDs from the inserted holidays above
WITH holiday_ids AS (
  SELECT id, name FROM public.holidays WHERE user_id = auth.uid()
)
INSERT INTO public.flights (holiday_id, origin, destination, departure_date, return_date, price, airline, booking_link, last_checked)
SELECT 
  h.id,
  'NYC',
  'Paris',
  '2025-07-01',
  '2025-07-08',
  650.00,
  'Air France',
  'https://www.kiwi.com/booking',
  NOW()
FROM holiday_ids h WHERE h.name = 'Summer Europe Trip'
UNION ALL
SELECT 
  h.id,
  'Paris',
  'Rome',
  '2025-07-08',
  '2025-07-12',
  120.00,
  'Ryanair',
  'https://www.kiwi.com/booking',
  NOW()
FROM holiday_ids h WHERE h.name = 'Summer Europe Trip'
UNION ALL
SELECT 
  h.id,
  'Rome',
  'Barcelona',
  '2025-07-12',
  '2025-07-15',
  95.00,
  'Vueling',
  'https://www.kiwi.com/booking',
  NOW()
FROM holiday_ids h WHERE h.name = 'Summer Europe Trip'
UNION ALL
SELECT 
  h.id,
  'LAX',
  'Bangkok',
  '2025-09-10',
  '2025-09-15',
  580.00,
  'Thai Airways',
  'https://www.kiwi.com/booking',
  NOW()
FROM holiday_ids h WHERE h.name = 'Southeast Asia Adventure'
UNION ALL
SELECT 
  h.id,
  'Bangkok',
  'Singapore',
  '2025-09-15',
  '2025-09-20',
  150.00,
  'AirAsia',
  'https://www.kiwi.com/booking',
  NOW()
FROM holiday_ids h WHERE h.name = 'Southeast Asia Adventure'
UNION ALL
SELECT 
  h.id,
  'Singapore',
  'Bali',
  '2025-09-20',
  '2025-09-25',
  180.00,
  'Singapore Airlines',
  'https://www.kiwi.com/booking',
  NOW()
FROM holiday_ids h WHERE h.name = 'Southeast Asia Adventure'
UNION ALL
SELECT 
  h.id,
  'SFO',
  'Tokyo',
  '2025-06-15',
  '2025-06-20',
  850.00,
  'ANA',
  'https://www.kiwi.com/booking',
  NOW()
FROM holiday_ids h WHERE h.name = 'Weekend in Tokyo';

-- Insert sample AI insights
WITH holiday_ids AS (
  SELECT id, name FROM public.holidays WHERE user_id = auth.uid()
)
INSERT INTO public.ai_insights (holiday_id, insight_text, insight_type)
SELECT 
  h.id,
  'Great timing! Summer is peak season in Europe, but booking 3 months in advance should help you secure better prices. Consider flying mid-week for additional savings.',
  'price_trend'
FROM holiday_ids h WHERE h.name = 'Summer Europe Trip'
UNION ALL
SELECT 
  h.id,
  'Your multi-city route is well optimized. The Paris → Rome → Barcelona route follows a logical geographic path, minimizing backtracking and maximizing your time in each city.',
  'route_optimization'
FROM holiday_ids h WHERE h.name = 'Summer Europe Trip'
UNION ALL
SELECT 
  h.id,
  'September is an excellent time to visit Southeast Asia - it''s just after peak monsoon season, so you''ll find fewer crowds and better hotel rates while still enjoying good weather.',
  'seasonal_advice'
FROM holiday_ids h WHERE h.name = 'Southeast Asia Adventure'
UNION ALL
SELECT 
  h.id,
  'Your budget of $2,800 is realistic for this trip. Budget airlines like AirAsia offer great value for regional flights, and accommodation costs are generally lower in September.',
  'budget_analysis'
FROM holiday_ids h WHERE h.name = 'Southeast Asia Adventure'
UNION ALL
SELECT 
  h.id,
  'Tokyo in mid-June is beautiful with pleasant weather before the rainy season. Your 5-day trip is perfect for exploring major districts. Consider getting a JR Pass for unlimited train travel.',
  'destination_tips'
FROM holiday_ids h WHERE h.name = 'Weekend in Tokyo';
