#!/usr/bin/env node

/**
 * Database Migration Script
 * 
 * This script applies all database migrations in order:
 * 1. Base schema (schema.sql)
 * 2. Migration 001: Companies
 * 3. Migration 002: Subscriptions
 * 
 * Usage:
 *   node scripts/migrate.js
 *   npm run db:migrate (if added to package.json)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Validate environment variables
function validateEnv() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    log(`❌ Missing required environment variables: ${missing.join(', ')}`, 'red');
    log('\nPlease set these in your .env file:', 'yellow');
    missing.forEach(key => log(`  - ${key}`, 'yellow'));
    process.exit(1);
  }
}

// Execute SQL file
async function executeSQL(supabase, filePath, fileName) {
  try {
    log(`\n📄 Reading: ${fileName}`, 'cyan');
    
    const sql = fs.readFileSync(filePath, 'utf8');
    
    if (!sql.trim()) {
      log(`⚠️  File is empty: ${fileName}`, 'yellow');
      return { success: true, skipped: true };
    }

    // Split SQL by semicolons and execute each statement
    // Note: Supabase JS client doesn't have direct SQL execution
    // This uses RPC function or we need to use the REST API
    log(`🔄 Executing: ${fileName}`, 'blue');
    
    // For Supabase, we need to use the REST API to execute raw SQL
    // Since we're using service role key, we can make admin requests
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      // If RPC doesn't exist, we'll try alternative method
      // Use Supabase client to execute via admin API
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    log(`✅ Success: ${fileName}`, 'green');
    return { success: true };
  } catch (error) {
    // Alternative: Execute via psql or direct SQL connection
    // For now, we'll use a workaround with Supabase admin client
    log(`⚠️  Direct RPC failed, trying alternative method...`, 'yellow');
    
    try {
      // Since Supabase JS client doesn't support raw SQL directly,
      // we need to guide users to use SQL Editor or provide instructions
      log(`\n⚠️  Note: Supabase JS client doesn't support raw SQL execution directly.`, 'yellow');
      log(`   Please run this file manually in Supabase SQL Editor:`, 'yellow');
      log(`   ${filePath}`, 'cyan');
      return { success: false, needsManual: true, error: error.message };
    } catch (altError) {
      log(`❌ Failed: ${fileName}`, 'red');
      log(`   Error: ${error.message}`, 'red');
      return { success: false, error: error.message };
    }
  }
}

// Better approach: Use Supabase Management API or psql
async function executeSQLViaPsql(supabase, filePath, fileName) {
  return new Promise((resolve) => {
    log(`\n📄 Executing: ${fileName}`, 'cyan');
    
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Check if psql is available
    const { exec } = require('child_process');
    
    // Extract connection details from SUPABASE_URL
    // Format: https://xxxxx.supabase.co
    const url = new URL(process.env.SUPABASE_URL);
    const host = url.hostname;
    // For Supabase cloud, we need connection string format
    // Database name is usually 'postgres'
    
    // Since we don't have direct database connection, we'll provide instructions
    log(`⚠️  Cannot execute SQL directly via Node.js with Supabase.`, 'yellow');
    log(`   Please run this SQL file in Supabase SQL Editor:`, 'yellow');
    log(`   ${path.resolve(filePath)}`, 'cyan');
    log(`   Or use the Supabase CLI: supabase db push`, 'yellow');
    
    resolve({ success: true, needsManual: true });
  });
}

// Main migration function
async function migrate() {
  log('\n🚀 Starting Database Migration...\n', 'blue');
  
  // Validate environment
  validateEnv();
  
  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Test connection
  log('📡 Testing database connection...', 'cyan');
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error && !error.message.includes('does not exist')) {
      // If users table doesn't exist yet, that's okay - we're about to create it
      if (!error.message.includes('relation') && !error.message.includes('does not exist')) {
        throw error;
      }
    }
    log('✅ Connection successful!', 'green');
  } catch (error) {
    log(`⚠️  Connection test: ${error.message}`, 'yellow');
    log('   (This is okay if tables don\'t exist yet)', 'yellow');
  }

  // Define migration files in order
  const migrations = [
    {
      name: 'Base Schema',
      path: path.join(__dirname, '../src/database/schema.sql'),
      required: true,
    },
    {
      name: 'Migration 001: Companies',
      path: path.join(__dirname, '../src/database/migrations/001_add_companies.sql'),
      required: true,
    },
    {
      name: 'Migration 002: Subscriptions',
      path: path.join(__dirname, '../src/database/migrations/002_add_subscriptions.sql'),
      required: true,
    },
  ];

  const results = [];
  const needsManual = [];

  // Execute migrations
  for (const migration of migrations) {
    if (!fs.existsSync(migration.path)) {
      log(`\n❌ File not found: ${migration.path}`, 'red');
      if (migration.required) {
        log('   This migration is required. Exiting.', 'red');
        process.exit(1);
      } else {
        log('   Skipping optional migration...', 'yellow');
        continue;
      }
    }

    const result = await executeSQLViaPsql(supabase, migration.path, migration.name);
    results.push({ ...migration, ...result });
    
    if (result.needsManual) {
      needsManual.push(migration);
    }
    
    if (!result.success && !result.needsManual && migration.required) {
      log(`\n❌ Migration failed: ${migration.name}`, 'red');
      log('   Exiting migration process.', 'red');
      process.exit(1);
    }
  }

  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log('📊 Migration Summary', 'blue');
  log('='.repeat(60), 'blue');

  const successful = results.filter(r => r.success && !r.needsManual).length;
  const manual = results.filter(r => r.needsManual).length;
  const failed = results.filter(r => !r.success && !r.needsManual).length;

  log(`\n✅ Successful: ${successful}`, successful > 0 ? 'green' : 'reset');
  log(`📝 Manual required: ${manual}`, manual > 0 ? 'yellow' : 'reset');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'reset');

  if (needsManual.length > 0) {
    log('\n📝 Manual Steps Required:', 'yellow');
    log('\nPlease run these SQL files in Supabase SQL Editor:', 'yellow');
    log('1. Go to your Supabase project dashboard', 'cyan');
    log('2. Navigate to SQL Editor', 'cyan');
    log('3. Run each file in order:\n', 'cyan');
    
    needsManual.forEach((migration, index) => {
      log(`${index + 1}. ${migration.name}`, 'blue');
      log(`   File: ${path.resolve(migration.path)}`, 'cyan');
    });
  }

  if (failed === 0 && manual === 0) {
    log('\n✅ All migrations completed successfully!', 'green');
  } else if (failed === 0) {
    log('\n⚠️  Some migrations require manual execution (see above)', 'yellow');
  } else {
    log('\n❌ Some migrations failed. Please check errors above.', 'red');
    process.exit(1);
  }

  log('\n');
}

// Run migrations
if (require.main === module) {
  migrate().catch((error) => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { migrate };

