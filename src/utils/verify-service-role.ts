/**
 * Utility to verify service role configuration
 * Run this to diagnose RLS issues
 */

import { supabaseAdmin } from '../config/supabase';
import { config } from '../config';
import logger from './logger';

export async function verifyServiceRoleSetup() {
  const results = {
    serviceRoleKeySet: !!config.supabase.serviceRoleKey,
    serviceRoleKeyLength: config.supabase.serviceRoleKey?.length || 0,
    serviceRoleKeyPrefix: config.supabase.serviceRoleKey?.substring(0, 30) || 'NOT SET',
    canQueryUsers: false,
    canQueryDocuments: false,
    canInsertTest: false,
    errors: [] as string[],
  };

  try {
    // Test 1: Can query users table
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      results.errors.push(`Cannot query users: ${usersError.message}`);
    } else {
      results.canQueryUsers = true;
    }

    // Test 2: Can query documents table
    const { error: docsError } = await supabaseAdmin
      .from('documents')
      .select('id')
      .limit(1);
    
    if (docsError) {
      results.errors.push(`Cannot query documents: ${docsError.message}`);
    } else {
      results.canQueryDocuments = true;
    }

    // Test 3: Try to insert a test record (then delete it)
    // We'll use a table that should exist and has minimal constraints
    const testData = {
      title: 'RLS_TEST_' + Date.now(),
      project_id: '00000000-0000-0000-0000-000000000000' as any, // Dummy UUID
      company_id: '00000000-0000-0000-0000-000000000000' as any, // Dummy UUID
      uploaded_by: '00000000-0000-0000-0000-000000000000' as any, // Dummy UUID
      file_url: 'test',
      file_type: 'test',
      file_size: 0,
    };

    const { data: insertData, error: insertError } = await (supabaseAdmin.from('documents') as any)
      .insert(testData)
      .select('id')
      .single();

    if (insertError) {
      results.errors.push(`Cannot insert test document: ${insertError.message} (Code: ${insertError.code})`);
      if (insertError.code === '42501' || insertError.message?.includes('row-level security')) {
        results.errors.push('RLS is blocking service role operations!');
      }
    } else {
      results.canInsertTest = true;
      // Clean up test record
      if (insertData?.id) {
        await supabaseAdmin.from('documents').delete().eq('id', insertData.id);
      }
    }

  } catch (error: any) {
    results.errors.push(`Verification failed: ${error.message}`);
  }

  return results;
}

// Export a function to log verification results
export async function logServiceRoleStatus() {
  const status = await verifyServiceRoleSetup();
  
  logger.info('Service Role Verification', {
    ...status,
    recommendation: status.canInsertTest 
      ? 'Service role is configured correctly'
      : 'Service role may not be configured correctly. Check SUPABASE_SERVICE_ROLE_KEY and run migration 027_permanent_fix_service_role_rls.sql'
  });

  return status;
}



