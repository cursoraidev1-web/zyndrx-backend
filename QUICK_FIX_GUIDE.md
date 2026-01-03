# QUICK FIX for RLS Error - 3 Steps

## The Error
```
{statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy"}
```

## The Fix (3 Steps)

### Step 1: Run the Migration ⚡

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open file: `backend/src/database/migrations/027_permanent_fix_service_role_rls.sql`
3. Copy **ALL** the contents
4. Paste into SQL Editor
5. Click **Run**

**Expected output**: You should see messages like:
- `✓ service_role exists`
- `Created service_role policy for documents`
- `Created service_role policy for tasks`
- etc.

### Step 2: Set Service Role Key 🔑

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy the **`service_role`** key (the long JWT token)
3. Open `backend/.env`
4. Add/update:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
5. **Save the file**

### Step 3: Restart Backend Server 🔄

```bash
# Stop the server (Ctrl+C if running)
# Then restart:
npm run dev
# or
npm start
```

## Test It ✅

Try the operation that was failing. It should work now!

## Still Not Working?

1. **Check migration ran**: Look in Supabase SQL Editor history
2. **Verify key**: Make sure you copied the `service_role` key (NOT anon key)
3. **Check logs**: Look for `serviceRoleKeySet: true` in backend logs
4. **See full guide**: Read `backend/PERMANENT_RLS_FIX.md` for detailed troubleshooting

---

**That's it! The migration fixes it permanently with multiple layers of protection.**

