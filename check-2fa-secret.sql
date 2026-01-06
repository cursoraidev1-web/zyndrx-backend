-- Quick check: Is 2FA secret being saved?
-- Run this AFTER clicking "Enable 2FA" button (which calls setup)

-- Replace 'YOUR_USER_ID' with your actual user ID
-- Get your user ID from: SELECT id, email FROM users WHERE email = 'your@email.com';

SELECT 
  id,
  email,
  two_factor_secret IS NOT NULL as has_secret,
  two_factor_secret_set_at IS NOT NULL as has_timestamp,
  two_factor_secret_set_at,
  is_two_factor_enabled
FROM users
WHERE id = 'YOUR_USER_ID_HERE';

-- Expected after clicking "Enable 2FA":
-- has_secret = true
-- has_timestamp = true
-- two_factor_secret_set_at = recent timestamp

-- If both are false, the setup endpoint UPDATE is failing
-- Check backend logs for the actual error

