import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serviceClient: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client with the service role key for secure server-side operations.
 * Returns null if environment variables are not configured.
 */
export function getServiceSupabaseClient(): SupabaseClient | null {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  serviceClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serviceClient;
}

/**
 * Returns a Supabase client with the public anon key for safe client/public read operations.
 * Returns null if environment variables are not configured.
 */
export function getPublicSupabaseClient(): SupabaseClient | null {
  if (publicClient) return publicClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  publicClient = createClient(url, anonKey);
  return publicClient;
}
