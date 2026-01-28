/**
 * Service-role Supabase client for server-side operations that bypass RLS.
 *
 * USE WITH CAUTION: This client has full database access.
 * Only use for:
 * - Cron jobs (no user session available)
 * - Admin operations that need cross-user access
 *
 * For user-facing API routes, use the session-based client from ./server.ts
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

let adminClient: ReturnType<typeof createSupabaseClient> | null = null

export function createAdminClient() {
  // Reuse existing client if already created (singleton pattern)
  if (adminClient) {
    return adminClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. " +
        "This is required for cron jobs and admin operations."
    )
  }

  adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}
