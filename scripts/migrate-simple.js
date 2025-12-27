#!/usr/bin/env node

/**
 * Simple Database Migration Guide Script
 * 
 * Since Supabase doesn't support direct SQL execution via JS client,
 * this script validates your setup and provides step-by-step instructions.
 * 
 * Usage: node scripts/migrate-simple.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log('\n' + '='.repeat(70), 'blue');
  log('🚀 Zyndrx Database Migration Guide', 'bold');
  log('='.repeat(70), 'blue');
  
  // Check environment variables
  log('\n📋 Step 1: Checking Environment Variables...', 'cyan');
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    log(`❌ Missing: ${missing.join(', ')}`, 'red');
    log('\nPlease add these to your .env file:', 'yellow');
    missing.forEach(key => log(`   ${key}=your-value`, 'yellow'));
    process.exit(1);
  }
  
  log('✅ All environment variables present', 'green');
  
  // Test connection
  log('\n📡 Step 2: Testing Database Connection...', 'cyan');
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Try a simple query (may fail if tables don't exist, that's okay)
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error && !error.message.includes('does not exist') && !error.message.includes('relation')) {
      throw error;
    }
    
    log('✅ Connected to Supabase successfully!', 'green');
  } catch (error) {
    log(`❌ Connection failed: ${error.message}`, 'red');
    log('\nPlease check:', 'yellow');
    log('   1. SUPABASE_URL is correct (no trailing slash)', 'yellow');
    log('   2. SUPABASE_SERVICE_ROLE_KEY is the service_role key (not anon)', 'yellow');
    log('   3. Your Supabase project is active', 'yellow');
    process.exit(1);
  }
  
  // Check migration files
  log('\n📄 Step 3: Checking Migration Files...', 'cyan');
  const migrations = [
    { name: 'Base Schema', file: 'src/database/schema.sql' },
    { name: 'Migration 001: Companies', file: 'src/database/migrations/001_add_companies.sql' },
    { name: 'Migration 002: Subscriptions', file: 'src/database/migrations/002_add_subscriptions.sql' },
  ];
  
  const filesExist = migrations.every(m => {
    const filePath = path.join(process.cwd(), m.file);
    const exists = fs.existsSync(filePath);
    if (!exists) {
      log(`❌ Missing: ${m.file}`, 'red');
    }
    return exists;
  });
  
  if (!filesExist) {
    log('\n❌ Some migration files are missing!', 'red');
    process.exit(1);
  }
  
  log('✅ All migration files found', 'green');
  
  // Instructions
  log('\n' + '='.repeat(70), 'blue');
  log('📝 Step 4: Run Migrations in Supabase SQL Editor', 'bold');
  log('='.repeat(70), 'blue');
  
  log('\nSince Supabase JS client doesn\'t support raw SQL execution,', 'yellow');
  log('please run these SQL files manually in Supabase SQL Editor:\n', 'yellow');
  
  log('1. Go to your Supabase Dashboard:', 'cyan');
  log(`   ${process.env.SUPABASE_URL.replace('https://', 'https://app.supabase.com/project/')}`, 'blue');
  log('\n2. Navigate to: SQL Editor → New Query\n', 'cyan');
  
  log('3. Run these files IN ORDER:\n', 'cyan');
  
  migrations.forEach((migration, index) => {
    const filePath = path.resolve(process.cwd(), migration.file);
    const relativePath = path.relative(process.cwd(), filePath);
    
    log(`   ${index + 1}. ${migration.name}`, 'bold');
    log(`      File: ${relativePath}`, 'blue');
    
    // Show file size
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    log(`      Size: ${sizeKB} KB`, 'cyan');
    
    // Show first few lines as preview
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').slice(0, 3).join('\n      ');
    log(`      Preview: ${lines.substring(0, 60)}...`, 'cyan');
    log('');
  });
  
  log('4. For each file:', 'cyan');
  log('   - Copy the entire contents', 'yellow');
  log('   - Paste into SQL Editor', 'yellow');
  log('   - Click "Run" (or press Ctrl+Enter)', 'yellow');
  log('   - Wait for success message', 'yellow');
  log('');
  
  // Verification query
  log('5. After running all migrations, verify with this query:', 'cyan');
  log('\n   SELECT table_name FROM information_schema.tables', 'blue');
  log('   WHERE table_schema = \'public\' ORDER BY table_name;', 'blue');
  log('\n   You should see: users, projects, companies, subscriptions, etc.\n', 'yellow');
  
  // Quick links
  log('='.repeat(70), 'blue');
  log('🔗 Quick Links:', 'bold');
  log('='.repeat(70), 'blue');
  const projectId = process.env.SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (projectId) {
    log(`\n   SQL Editor: https://app.supabase.com/project/${projectId}/sql/new`, 'cyan');
    log(`   Dashboard:  ${process.env.SUPABASE_URL.replace('https://', 'https://app.supabase.com/project/')}`, 'cyan');
  }
  
  log('\n✅ Setup complete! Run the migrations in SQL Editor to continue.\n', 'green');
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});

