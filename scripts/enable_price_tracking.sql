-- ============================================================================
-- ENABLE PRICE TRACKING FOR HOLIDAYS
-- ============================================================================
-- Run these queries in your Supabase SQL Editor
-- ============================================================================

-- STEP 1: View all your holidays to find the ID you want to track
-- ============================================================================
SELECT 
  id,
  name,
  origin,
  destinations,
  start_date,
  end_date,
  price_tracking_enabled,
  price_drop_threshold_percent
FROM holidays
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 2: Enable price tracking for a specific holiday
-- ============================================================================
-- Replace 'YOUR-HOLIDAY-UUID-HERE' with the actual UUID from Step 1
-- Example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

UPDATE holidays 
SET 
  price_tracking_enabled = true,
  price_drop_threshold_percent = 10.0  -- Alert when price drops 10% or more
WHERE id = 'YOUR-HOLIDAY-UUID-HERE';

-- ============================================================================
-- OPTION 3: Enable price tracking for ALL holidays
-- ============================================================================
-- Use this if you want to track prices for all your holidays

UPDATE holidays 
SET 
  price_tracking_enabled = true,
  price_drop_threshold_percent = 10.0
WHERE price_tracking_enabled IS NULL OR price_tracking_enabled = false;

-- ============================================================================
-- STEP 4: Verify the update
-- ============================================================================
-- Check which holidays now have tracking enabled

SELECT 
  id,
  name,
  price_tracking_enabled,
  price_drop_threshold_percent,
  last_tracked_price,
  last_price_check
FROM holidays
WHERE price_tracking_enabled = true;
