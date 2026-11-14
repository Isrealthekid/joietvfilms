import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import publicConfig from './public-config.json';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || publicConfig.supabaseUrl;
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || publicConfig.supabasePublishableKey;
export const mediaApiUrl = (process.env.NEXT_PUBLIC_MEDIA_API_URL || publicConfig.mediaApiUrl).replace(/\/$/, '');
export const isConfigured = Boolean(supabaseUrl && supabaseKey);
let client: SupabaseClient | undefined;

export function getSupabase() {
  if (!isConfigured) throw new Error('The film database has not been connected yet.');
  client ??= createClient(supabaseUrl, supabaseKey);
  return client;
}

// Public gallery requests never reuse an administrator's session.
export function getPublicSupabase() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
