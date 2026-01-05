/**
 * Direct insert using Supabase REST API with service role key
 * This bypasses RLS by using the service role key in headers
 */
import { config } from '../config';
import logger from './logger';

export async function insertUserWithServiceRole(userData: {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}) {
  try {
    if (!config.supabase.serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    // Use Supabase REST API with service role key
    const url = `${config.supabase.url}/rest/v1/users`;
    
    logger.info('Attempting REST API insert with service role', {
      url,
      userId: userData.id,
      hasServiceRoleKey: !!config.supabase.serviceRoleKey,
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabase.serviceRoleKey,
        'Authorization': `Bearer ${config.supabase.serviceRoleKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Service role REST API insert failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to insert user: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { data: Array.isArray(data) ? data[0] : data, error: null };
  } catch (error: any) {
    logger.error('Service role REST API insert error', { error: error.message });
    return { data: null, error };
  }
}

