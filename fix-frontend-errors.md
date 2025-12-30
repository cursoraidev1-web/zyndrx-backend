# Frontend Build Error Fixes

## Quick Fix Guide for Your Frontend Errors

Since the files are in your frontend repository, here are the exact fixes you need to apply:

---

## Error 1: DocumentStore.js - Duplicate `deleteConfirmId` (Line 260)

### What to do:
1. Open `src/pages/DocumentStore.js`
2. Search for `deleteConfirmId` (Ctrl+F)
3. You'll find it declared twice
4. Remove one of the declarations

### Example Fix:
```javascript
// ❌ BEFORE (you have this twice):
const [deleteConfirmId, setDeleteConfirmId] = useState(null);

// ✅ AFTER (keep only one):
const [deleteConfirmId, setDeleteConfirmId] = useState(null);
```

**Look for patterns like:**
- Line ~250-260: First declaration
- Line ~260-270: Duplicate declaration (REMOVE THIS ONE)

---

## Error 2: HandoffDetails.js - Syntax Error (Line 187)

### What to do:
1. Open `src/pages/HandoffDetails.js`
2. Go to line 187
3. Check for missing closing braces/brackets/parentheses

### Common Fixes:

**If missing closing brace:**
```javascript
// ❌ BEFORE:
const something = {
  prop: value
  // missing }

// ✅ AFTER:
const something = {
  prop: value
}; // added closing brace
```

**If trailing comma issue:**
```javascript
// ❌ BEFORE:
const obj = {
  prop: value,
  // extra comma without next property

// ✅ AFTER:
const obj = {
  prop: value
  // removed comma
};
```

**If unclosed template literal:**
```javascript
// ❌ BEFORE:
const str = `hello
// missing closing backtick

// ✅ AFTER:
const str = `hello`; // added closing backtick
```

**Quick check:**
- Count opening `{` and match with closing `}`
- Count opening `[` and match with closing `]`
- Count opening `(` and match with closing `)`
- Ensure all strings have closing quotes/backticks

---

## Error 3: DevOpsDashboard.js - `serverMetrics` undefined (Lines 231-232)

### Option A: Add the state variable (if it should exist):

**Add near top of component (with other useState):**
```javascript
const [serverMetrics, setServerMetrics] = useState(null);
```

**Add useEffect to fetch it:**
```javascript
useEffect(() => {
  // Fetch server metrics
  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/server-metrics'); // adjust API endpoint
      const data = await response.json();
      setServerMetrics(data);
    } catch (error) {
      console.error('Failed to fetch server metrics:', error);
    }
  };
  
  fetchMetrics();
}, []);
```

**Then add optional chaining where used (lines 231-232):**
```javascript
// ✅ SAFE - Add optional chaining
{serverMetrics?.something}
{serverMetrics?.another}
```

### Option B: Remove/comment if not needed:

**Comment out lines 231-232:**
```javascript
// {serverMetrics.something}
// {serverMetrics.another}
```

### Option C: Use different variable name:

**If it's actually called something else, check your code for:**
- `metrics`
- `serverData`
- `systemMetrics`
- `dashboardMetrics`

Then replace `serverMetrics` with the correct variable name.

---

## Automated Fix Script

If you want, you can run these PowerShell commands in your frontend directory:

```powershell
# Navigate to your frontend directory first
cd C:\path\to\your\frontend

# Fix 1: Find duplicate deleteConfirmId
Select-String -Path "src/pages/DocumentStore.js" -Pattern "deleteConfirmId" | Select-Object LineNumber, Line

# Fix 2: Check syntax around line 187
Get-Content "src/pages/HandoffDetails.js" | Select-Object -Index 184..190

# Fix 3: Find serverMetrics usage
Select-String -Path "src/pages/dashboards/DevOpsDashboard.js" -Pattern "serverMetrics" | Select-Object LineNumber, Line
```

---

## Step-by-Step Fix Process

1. **Open DocumentStore.js**
   - Search: `deleteConfirmId`
   - Remove duplicate declaration
   - Save

2. **Open HandoffDetails.js**
   - Go to line 187
   - Check for missing `}`, `]`, `)`, or unclosed strings
   - Fix syntax
   - Save

3. **Open DevOpsDashboard.js**
   - Go to lines 231-232
   - Add state: `const [serverMetrics, setServerMetrics] = useState(null);`
   - OR comment out those lines
   - Save

4. **Run build again:**
   ```bash
   npm run build
   ```

---

## If You Need More Help

If you can share the code around these lines, I can provide exact fixes:
- DocumentStore.js around line 260
- HandoffDetails.js around line 187
- DevOpsDashboard.js around lines 231-232

Just paste those sections here and I'll fix them exactly!

