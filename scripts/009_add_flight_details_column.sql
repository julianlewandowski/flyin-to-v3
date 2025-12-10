-- ============================================================================
-- ADD FLIGHT DETAILS COLUMN - DATABASE MIGRATION
-- ============================================================================
-- This script adds a JSONB column to store extended flight details from SerpAPI
-- including segments, layovers, aircraft type, departure/arrival times, etc.
--
-- Run this in your Supabase SQL Editor to update your database.
-- ============================================================================

-- Add flight_details JSONB column to flights table
ALTER TABLE public.flights
ADD COLUMN IF NOT EXISTS flight_details JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.flights.flight_details IS 'Extended flight data from SerpAPI including segments, layovers, aircraft, times, etc.';

-- Create an index for querying flight details (optional, for performance)
CREATE INDEX IF NOT EXISTS flights_flight_details_idx 
  ON public.flights 
  USING gin (flight_details);

-- ============================================================================
-- VERIFICATION QUERY (Optional)
-- ============================================================================
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'flights' AND column_name = 'flight_details';
-- ============================================================================






