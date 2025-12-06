-- Add deal_url and provider columns to flights table
-- This migration adds support for deep-link URLs from flight providers

ALTER TABLE public.flights
ADD COLUMN IF NOT EXISTS deal_url TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT;

-- Create index on provider for faster queries
CREATE INDEX IF NOT EXISTS flights_provider_idx ON public.flights(provider);

-- Add comment to columns
COMMENT ON COLUMN public.flights.deal_url IS 'Direct deep-link URL to the provider''s booking page';
COMMENT ON COLUMN public.flights.provider IS 'Provider name (e.g., Turkish Airlines, Expedia, Google Flights)';

