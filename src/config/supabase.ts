import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './index';
import { Database } from '../types/database.types';
 
// Service role client (for admin operations, bypasses RLS)
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
 
// Anonymous client (respects RLS)
export const supabaseClient: SupabaseClient<Database> = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey
);
 
// Helper to create client with user's JWT
export const createSupabaseClientWithAuth = (accessToken: string): SupabaseClient<Database> => {
  return createClient<Database>(config.supabase.url, config.supabase.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};
 
export default supabaseAdmin;