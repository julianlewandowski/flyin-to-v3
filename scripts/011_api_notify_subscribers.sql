-- Table for "notify me when API is back" subscribers (SerpAPI credits exhausted).
-- Only server-side API routes use this table (via service role). No RLS policies
-- needed for client access since inserts go through our API.

CREATE TABLE IF NOT EXISTS public.api_notify_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT api_notify_subscribers_email_check CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

CREATE UNIQUE INDEX IF NOT EXISTS api_notify_subscribers_email_idx
  ON public.api_notify_subscribers (LOWER(email));

COMMENT ON TABLE public.api_notify_subscribers IS 'Emails to notify when flight search API (SerpAPI) is back after credits reset.';

-- Only server (service role) should access this table; no client policies.
ALTER TABLE public.api_notify_subscribers ENABLE ROW LEVEL SECURITY;
