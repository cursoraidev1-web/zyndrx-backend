/**
 * CORS Testing Script
 * Tests CORS configuration to ensure frontend can access the API
 */

import axios from 'axios';

const BASE_URL = process.env.BASE_URL || process.argv[2] || 'https://zyndrx-backend-blgx.onrender.com';
const API_BASE = `${BASE_URL}/api/v1`;

// Test origins
const testOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://your-frontend-domain.com',
  'https://zyndrx-frontend.vercel.app',
];

async function testCORS(origin: string) {
  console.log(`\n🧪 Testing CORS for origin: ${origin}`);
  
  try {
    // Test OPTIONS preflight request
    const preflightResponse = await axios({
      method: 'OPTIONS',
      url: `${API_BASE}/auth/me`,
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type',
      },
      validateStatus: () => true,
    });

    console.log(`  OPTIONS Preflight:`);
    console.log(`    Status: ${preflightResponse.status}`);
    console.log(`    Access-Control-Allow-Origin: ${preflightResponse.headers['access-control-allow-origin'] || 'NOT SET'}`);
    console.log(`    Access-Control-Allow-Methods: ${preflightResponse.headers['access-control-allow-methods'] || 'NOT SET'}`);
    console.log(`    Access-Control-Allow-Headers: ${preflightResponse.headers['access-control-allow-headers'] || 'NOT SET'}`);
    console.log(`    Access-Control-Allow-Credentials: ${preflightResponse.headers['access-control-allow-credentials'] || 'NOT SET'}`);

    if (preflightResponse.status === 204 || preflightResponse.status === 200) {
      const allowedOrigin = preflightResponse.headers['access-control-allow-origin'];
      if (allowedOrigin === origin || allowedOrigin === '*') {
        console.log(`  ✅ CORS preflight PASSED for ${origin}`);
        return true;
      } else {
        console.log(`  ❌ CORS preflight FAILED: Origin mismatch`);
        console.log(`     Expected: ${origin}`);
        console.log(`     Got: ${allowedOrigin}`);
        return false;
      }
    } else {
      console.log(`  ❌ CORS preflight FAILED: Unexpected status ${preflightResponse.status}`);
      return false;
    }
  } catch (error: any) {
    console.log(`  ❌ CORS preflight ERROR: ${error.message}`);
    return false;
  }
}

async function testActualRequest(origin: string) {
  try {
    const response = await axios({
      method: 'GET',
      url: `${API_BASE}/plans`, // Public endpoint
      headers: {
        'Origin': origin,
      },
      validateStatus: () => true,
    });

    console.log(`  Actual Request:`);
    console.log(`    Status: ${response.status}`);
    console.log(`    Access-Control-Allow-Origin: ${response.headers['access-control-allow-origin'] || 'NOT SET'}`);
    console.log(`    Access-Control-Allow-Credentials: ${response.headers['access-control-allow-credentials'] || 'NOT SET'}`);

    const allowedOrigin = response.headers['access-control-allow-origin'];
    if (allowedOrigin === origin || allowedOrigin === '*') {
      console.log(`  ✅ Actual request PASSED for ${origin}`);
      return true;
    } else {
      console.log(`  ❌ Actual request FAILED: Origin mismatch`);
      return false;
    }
  } catch (error: any) {
    console.log(`  ❌ Actual request ERROR: ${error.message}`);
    return false;
  }
}

async function runCORSTests() {
  console.log('🧪 Starting CORS Tests...\n');
  console.log(`Testing against: ${BASE_URL}\n`);

  const results = {
    passed: 0,
    failed: 0,
  };

  for (const origin of testOrigins) {
    const preflightPassed = await testCORS(origin);
    const actualPassed = await testActualRequest(origin);
    
    if (preflightPassed && actualPassed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // Test with no origin (should be allowed)
  console.log(`\n🧪 Testing with no origin (mobile apps, Postman, etc.)`);
  try {
    const response = await axios({
      method: 'GET',
      url: `${API_BASE}/plans`,
      validateStatus: () => true,
    });
    console.log(`  Status: ${response.status}`);
    if (response.status === 200) {
      console.log(`  ✅ No-origin request PASSED`);
      results.passed++;
    } else {
      console.log(`  ❌ No-origin request FAILED`);
      results.failed++;
    }
  } catch (error: any) {
    console.log(`  ❌ No-origin request ERROR: ${error.message}`);
    results.failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CORS Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);

  if (results.failed > 0) {
    console.log('\n⚠️  CORS Issues Detected!');
    console.log('   Check your ALLOWED_ORIGINS environment variable.');
    console.log('   Make sure your frontend URL is included.');
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

runCORSTests().catch((error) => {
  console.error('Fatal error running CORS tests:', error);
  process.exit(1);
});


