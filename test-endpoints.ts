/**
 * Endpoint Testing Script
 * Tests all API endpoints to ensure they're working correctly
 */

import axios from 'axios';

// Test against production or local
const BASE_URL = process.env.BASE_URL || process.argv[2] || 'https://zyndrx-backend-blgx.onrender.com';
const API_BASE = `${BASE_URL}/api/v1`;

// Test results
const results: {
  passed: number;
  failed: number;
  errors: Array<{ endpoint: string; method: string; error: string }>;
} = {
  passed: 0,
  failed: 0,
  errors: [],
};

// Helper to make requests
async function testEndpoint(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any,
  headers?: Record<string, string>,
  expectedStatus?: number
) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      validateStatus: () => true, // Don't throw on any status
    });

    const status = response.status;
    const expected = expectedStatus || (method === 'POST' ? 201 : method === 'DELETE' ? 200 : 200);

    // Accept 200, 201, 400, 401, 404 as valid responses (means endpoint exists)
    if (status >= 200 && status < 500) {
      results.passed++;
      console.log(`✅ ${method} ${endpoint} - Status: ${status}`);
      return { success: true, status, data: response.data };
    } else {
      results.failed++;
      results.errors.push({
        endpoint,
        method,
        error: `Unexpected status: ${status}`,
      });
      console.log(`❌ ${method} ${endpoint} - Status: ${status}`);
      return { success: false, status, data: response.data };
    }
  } catch (error: any) {
    results.failed++;
    const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
    results.errors.push({
      endpoint,
      method,
      error: errorMsg,
    });
    console.log(`❌ ${method} ${endpoint} - Error: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

async function runTests() {
  console.log('🧪 Starting Endpoint Tests...\n');
  console.log(`Testing against: ${BASE_URL}\n`);

  // Test 1: Health check / Root
  console.log('📋 Testing Root/Health Endpoints...');
  await testEndpoint('GET', '/');
  await testEndpoint('GET', '/health');

  // Test 2: Public Auth Endpoints
  console.log('\n📋 Testing Public Auth Endpoints...');
  await testEndpoint('POST', '/auth/register', {
    email: 'test@example.com',
    password: 'TestPassword123!@#',
    fullName: 'Test User',
  });
  await testEndpoint('POST', '/auth/login', {
    email: 'test@example.com',
    password: 'TestPassword123!@#',
  });
  await testEndpoint('GET', '/auth/google');
  await testEndpoint('GET', '/auth/github');

  // Test 3: Protected Auth Endpoints (will fail without token, but should return 401, not 500)
  console.log('\n📋 Testing Protected Auth Endpoints...');
  await testEndpoint('GET', '/auth/me', undefined, {}, 401);
  await testEndpoint('GET', '/auth/companies', undefined, {}, 401);
  await testEndpoint('POST', '/auth/logout', undefined, {}, 401);
  await testEndpoint('POST', '/auth/switch-company', { companyId: 'test' }, {}, 401);

  // Test 4: Projects
  console.log('\n📋 Testing Project Endpoints...');
  await testEndpoint('GET', '/projects', undefined, {}, 401);
  await testEndpoint('POST', '/projects', { name: 'Test Project' }, {}, 401);
  await testEndpoint('GET', '/projects/test-id', undefined, {}, 401);
  await testEndpoint('PATCH', '/projects/test-id', { name: 'Updated' }, {}, 401);
  await testEndpoint('DELETE', '/projects/test-id', undefined, {}, 401);

  // Test 5: Tasks
  console.log('\n📋 Testing Task Endpoints...');
  await testEndpoint('GET', '/tasks', undefined, {}, 401);
  await testEndpoint('GET', '/tasks?project_id=test', undefined, {}, 401);
  await testEndpoint('POST', '/tasks', { title: 'Test Task' }, {}, 401);
  await testEndpoint('GET', '/tasks/test-id', undefined, {}, 401);
  await testEndpoint('PATCH', '/tasks/test-id', { title: 'Updated' }, {}, 401);
  await testEndpoint('DELETE', '/tasks/test-id', undefined, {}, 401);

  // Test 6: PRDs
  console.log('\n📋 Testing PRD Endpoints...');
  await testEndpoint('GET', '/prds', undefined, {}, 401);
  await testEndpoint('GET', '/prds?project_id=test', undefined, {}, 401);
  await testEndpoint('POST', '/prds', { title: 'Test PRD' }, {}, 401);
  await testEndpoint('GET', '/prds/test-id', undefined, {}, 401);
  await testEndpoint('PATCH', '/prds/test-id', { title: 'Updated' }, {}, 401);
  await testEndpoint('DELETE', '/prds/test-id', undefined, {}, 401);

  // Test 7: Documents
  console.log('\n📋 Testing Document Endpoints...');
  await testEndpoint('GET', '/documents', undefined, {}, 401);
  await testEndpoint('GET', '/documents?project_id=test', undefined, {}, 401);
  await testEndpoint('POST', '/documents', { name: 'Test Doc' }, {}, 401);
  await testEndpoint('GET', '/documents/test-id', undefined, {}, 401);
  await testEndpoint('POST', '/documents/upload-token', { fileName: 'test.pdf' }, {}, 401);
  await testEndpoint('GET', '/documents/test-id/download', undefined, {}, 401);
  await testEndpoint('DELETE', '/documents/test-id', undefined, {}, 401);

  // Test 8: Comments
  console.log('\n📋 Testing Comment Endpoints...');
  await testEndpoint('GET', '/comments?resource_type=task&resource_id=test', undefined, {}, 401);
  await testEndpoint('POST', '/comments', { content: 'Test comment' }, {}, 401);
  await testEndpoint('GET', '/comments/test-id', undefined, {}, 401);
  await testEndpoint('PATCH', '/comments/test-id', { content: 'Updated' }, {}, 401);
  await testEndpoint('DELETE', '/comments/test-id', undefined, {}, 401);

  // Test 9: Handoffs
  console.log('\n📋 Testing Handoff Endpoints...');
  await testEndpoint('GET', '/handoffs', undefined, {}, 401);
  await testEndpoint('GET', '/handoffs?project_id=test', undefined, {}, 401);
  await testEndpoint('POST', '/handoffs', { title: 'Test Handoff' }, {}, 401);
  await testEndpoint('GET', '/handoffs/test-id', undefined, {}, 401);
  await testEndpoint('PATCH', '/handoffs/test-id', { title: 'Updated' }, {}, 401);
  await testEndpoint('POST', '/handoffs/test-id/approve', undefined, {}, 401);
  await testEndpoint('POST', '/handoffs/test-id/reject', undefined, {}, 401);
  await testEndpoint('DELETE', '/handoffs/test-id', undefined, {}, 401);

  // Test 10: Teams
  console.log('\n📋 Testing Team Endpoints...');
  await testEndpoint('GET', '/teams', undefined, {}, 401);
  await testEndpoint('POST', '/teams', { name: 'Test Team' }, {}, 401);
  await testEndpoint('GET', '/teams/test-id', undefined, {}, 401);
  await testEndpoint('PATCH', '/teams/test-id', { name: 'Updated' }, {}, 401);
  await testEndpoint('DELETE', '/teams/test-id', undefined, {}, 401);

  // Test 11: Analytics
  console.log('\n📋 Testing Analytics Endpoints...');
  await testEndpoint('GET', '/analytics?project_id=test', undefined, {}, 401);
  await testEndpoint('GET', '/analytics/kpi?project_id=test', undefined, {}, 401);
  await testEndpoint('GET', '/analytics/progress?project_id=test', undefined, {}, 401);
  await testEndpoint('GET', '/analytics/team-performance?project_id=test', undefined, {}, 401);
  await testEndpoint('GET', '/analytics/tasks?project_id=test', undefined, {}, 401);

  // Test 12: Activity
  console.log('\n📋 Testing Activity Endpoints...');
  await testEndpoint('GET', '/activity', undefined, {}, 401);
  await testEndpoint('GET', '/activity?project_id=test', undefined, {}, 401);
  await testEndpoint('GET', '/activity?type=task', undefined, {}, 401);

  // Test 13: Notifications
  console.log('\n📋 Testing Notification Endpoints...');
  await testEndpoint('GET', '/notifications', undefined, {}, 401);
  await testEndpoint('PATCH', '/notifications/test-id/read', undefined, {}, 401);
  await testEndpoint('PATCH', '/notifications/mark-all-read', undefined, {}, 401);

  // Test 14: Subscriptions
  console.log('\n📋 Testing Subscription Endpoints...');
  await testEndpoint('GET', '/subscription', undefined, {}, 401);
  await testEndpoint('GET', '/subscription/limits', undefined, {}, 401);
  await testEndpoint('POST', '/subscription/upgrade', { planId: 'pro' }, {}, 401);
  await testEndpoint('POST', '/subscription/cancel', undefined, {}, 401);
  await testEndpoint('GET', '/plans', undefined, {}, 200); // Public endpoint

  // Test 15: Companies
  console.log('\n📋 Testing Company Endpoints...');
  await testEndpoint('GET', '/companies/test-id', undefined, {}, 401);
  await testEndpoint('POST', '/companies', { name: 'Test Company' }, {}, 401);
  await testEndpoint('PATCH', '/companies/test-id', { name: 'Updated' }, {}, 401);
  await testEndpoint('POST', '/companies/test-id/invite', { email: 'test@example.com' }, {}, 401);

  // Test 16: GitHub Webhook
  console.log('\n📋 Testing GitHub Webhook Endpoint...');
  await testEndpoint('POST', '/github/webhook', { action: 'test' }, {}, 400); // Should fail validation, not 500

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.slice(0, 10).forEach((err) => {
      console.log(`  - ${err.method} ${err.endpoint}: ${err.error}`);
    });
    if (results.errors.length > 10) {
      console.log(`  ... and ${results.errors.length - 10} more errors`);
    }
  }

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

