/**
 * Utility to test if service role is working correctly
 * This helps diagnose RLS issues
 */
import { supabaseAdmin } from '../config/supabase';
import { config } from '../config';
import logger from './logger';

export async function testServiceRoleAccess() {
  try {
    logger.info('Testing service role access...', {
      hasServiceRoleKey: !!config.supabase.serviceRoleKey,
      serviceRoleKeyLength: config.supabase.serviceRoleKey?.length || 0,
      serviceRoleKeyPrefix: config.supabase.serviceRoleKey?.substring(0, 20) || 'N/A',
    });

    // Test 1: Try to insert a test user (will fail if RLS blocks it)
    const testUserId = '00000000-0000-0000-0000-000000000000';
    
    // First, try to delete if exists
    await supabaseAdmin.from('users').delete().eq('id', testUserId);

    // Try to insert
    const { data, error } = await (supabaseAdmin.from('users') as any).insert({
      id: testUserId,
      email: 'test-service-role@example.com',
      full_name: 'Test Service Role',
      role: 'developer',
    }).select().single();

    if (error) {
      logger.error('Service role test FAILED - RLS is blocking insert', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return {
        success: false,
        error: error.message,
        code: error.code,
        message: 'Service role is NOT bypassing RLS. Check SUPABASE_SERVICE_ROLE_KEY configuration.',
      };
    }

    // Clean up test user
    await supabaseAdmin.from('users').delete().eq('id', testUserId);

    logger.info('Service role test PASSED - RLS is being bypassed correctly');
    return {
      success: true,
      message: 'Service role is working correctly and bypassing RLS',
    };
  } catch (err: any) {
    logger.error('Service role test error', { error: err });
    return {
      success: false,
      error: err.message,
      message: 'Failed to test service role access',
    };
  }
}








