# Fix Supabase Environment Variable Error Message

## Problem
The error message "Supabase not configured. Please check your environment variables." doesn't tell you which specific variable is missing.

## Solution
Update your `supabase.js` file (or wherever you initialize Supabase) to check each environment variable individually and provide a specific error message.

---

## Code Fix

### Current Code (Line 57 in supabase.js):
```javascript
// ❌ BEFORE - Generic error
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase not configured. Please check your environment variables.');
}
```

### Fixed Code:
```javascript
// ✅ AFTER - Specific error messages
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check each variable individually
if (!supabaseUrl && !supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Missing environment variables:\n' +
    '  - VITE_SUPABASE_URL\n' +
    '  - VITE_SUPABASE_ANON_KEY\n\n' +
    'Please add these to your .env.local file.'
  );
}

if (!supabaseUrl) {
  throw new Error(
    'Supabase URL is missing. Please set VITE_SUPABASE_URL in your .env.local file.\n' +
    'Example: VITE_SUPABASE_URL=https://your-project.supabase.co'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Supabase anon key is missing. Please set VITE_SUPABASE_ANON_KEY in your .env.local file.\n' +
    'Example: VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...'
  );
}
```

---

## Complete Example (Full supabase.js file)

```javascript
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Detailed error checking
if (!supabaseUrl && !supabaseAnonKey) {
  const errorMessage = `
❌ Supabase is not configured!

Missing environment variables:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY

To fix:
1. Create or edit .env.local in your project root
2. Add these variables:
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here

3. Restart your development server
  `;
  throw new Error(errorMessage);
}

if (!supabaseUrl) {
  throw new Error(
    '❌ Missing VITE_SUPABASE_URL\n\n' +
    'Please add to .env.local:\n' +
    'VITE_SUPABASE_URL=https://your-project.supabase.co'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    '❌ Missing VITE_SUPABASE_ANON_KEY\n\n' +
    'Please add to .env.local:\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key-here'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
```

---

## Alternative: Helper Function for Better Error Messages

```javascript
import { createClient } from '@supabase/supabase-js';

/**
 * Get environment variable with helpful error message
 */
function getEnvVar(name, example = '') {
  const value = import.meta.env[name];
  
  if (!value) {
    const exampleText = example ? `\nExample: ${name}=${example}` : '';
    throw new Error(
      `❌ Missing environment variable: ${name}\n\n` +
      `Please add to your .env.local file:${exampleText}\n\n` +
      `Then restart your development server.`
    );
  }
  
  return value;
}

// Get environment variables with helpful errors
const supabaseUrl = getEnvVar(
  'VITE_SUPABASE_URL',
  'https://your-project.supabase.co'
);

const supabaseAnonKey = getEnvVar(
  'VITE_SUPABASE_ANON_KEY',
  'eyJhbGciOiJIUzI1NiIs...'
);

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
```

---

## Your Current Environment Variables

Based on your backend `.env` file, you should have:

```env
# Frontend .env.local file
VITE_SUPABASE_URL=https://rlzdtlfabtqicofrrxnc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsemR0bGZhYnRxaWNvZnJyeG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NDE5ODMsImV4cCI6MjA4MjExNzk4M30.KZmRsHh3s-WbfksAiLPGMvLeeIyk7Gliw0_C9F6mCiU
VITE_API_URL=http://localhost:5000/api/v1
```

---

## Steps to Fix

1. **Open your frontend `supabase.js` file** (probably in `src/lib/supabase.js` or `src/config/supabase.js`)

2. **Replace the error checking code** with one of the examples above

3. **Make sure your `.env.local` file exists** in your frontend project root with the variables above

4. **Restart your dev server** after adding environment variables

---

## Quick Check: Which Variable is Missing?

Run this in your browser console to check:

```javascript
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set (hidden)' : 'MISSING');
```

This will tell you exactly which one is missing!

