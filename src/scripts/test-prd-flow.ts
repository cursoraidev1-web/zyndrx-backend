// src/scripts/test-prd-flow.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const API_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

// FIXED: Added missing closing quote
const TEST_EMAIL = 'admin@zyndrx.com'; 
const TEST_PASSWORD = 'SecurePass123!'; // <--- MAKE SURE THIS IS CORRECT

async function runTest() {
  console.log('🚀 Starting PRD Flow Test...\n');

  // 1. LOGIN
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authError) {
    console.error('❌ Login Failed:', authError.message);
    process.exit(1);
  }

  const TOKEN = authData.session.access_token;
  console.log('✅ Logged in successfully. Token acquired.');

  // 2. CREATE PRD
  console.log('\nTesting: Create PRD (POST /prds)...');
  const createRes = await fetch(`${API_URL}/prds`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      // ⚠️ IMPORTANT: You must replace this with a real Project ID from your database
      project_id: 'REPLACE_WITH_VALID_PROJECT_UUID', 
      title: 'Test PRD for Backend Verification',
      content: {
        features: [
          { name: 'User Authentication', desc: 'Login with Email/Pass' },
          { name: 'File Upload', desc: 'Drag and drop PDF upload' }
        ]
      }
    })
  });

  // FIXED: Cast to 'any' to stop TypeScript from complaining about 'unknown' type
  const createJson = await createRes.json() as any;

  if (!createJson.success) {
    console.error('❌ Create Failed:', createJson);
    process.exit(1);
  }
  
  const PRD_ID = createJson.data.id;
  console.log(`✅ PRD Created! ID: ${PRD_ID}`);

  // 3. APPROVE PRD
  console.log(`\nTesting: Approve PRD (PATCH /prds/${PRD_ID}/status)...`);
  const approveRes = await fetch(`${API_URL}/prds/${PRD_ID}/status`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({ status: 'approved' })
  });

  // FIXED: Cast to 'any' here as well
  const approveJson = await approveRes.json() as any;
  
  if (approveJson.success) {
    console.log('✅ PRD Approved Successfully!');
    console.log('👉 Go check your "tasks" table in Supabase. You should see 2 new tasks created automatically.');
  } else {
    console.error('❌ Approval Failed:', approveJson);
  }
}

runTest();