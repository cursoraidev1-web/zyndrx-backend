-- Delete demo user from auth.users and public.users
-- Email: demo@zyndrx.com

-- First, get the user ID (optional, for reference)
-- SELECT id FROM auth.users WHERE email = 'demo@zyndrx.com';

-- Delete from public.users first (if exists) to avoid foreign key issues
DELETE FROM public.users 
WHERE email = 'demo@zyndrx.com';

-- Delete from auth.users
DELETE FROM auth.users 
WHERE email = 'demo@zyndrx.com';

-- Verify deletion
-- SELECT * FROM auth.users WHERE email = 'demo@zyndrx.com';
-- SELECT * FROM public.users WHERE email = 'demo@zyndrx.com';




