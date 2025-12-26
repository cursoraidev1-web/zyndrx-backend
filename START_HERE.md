# Getting Started with Zyndrx Backend

## Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 9.0.0
- **Supabase Account** (for database and authentication)
- **PostgreSQL Database** (via Supabase)

## Quick Start

### 1. Install Dependencies

```bash
cd zyndrx-backend
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `zyndrx-backend` directory:

```bash
# Copy the example file (if it exists) or create manually
```

**Required Environment Variables:**

```env
# Server Configuration
PORT=5000
NODE_ENV=development
API_VERSION=v1

# Supabase (REQUIRED - Get these from your Supabase project settings)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# JWT (REQUIRED - Generate a secure random string, minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=10

# CORS (Comma-separated list of allowed origins)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# GitHub Integration (Optional)
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
GITHUB_APP_ID=your-github-app-id
GITHUB_PRIVATE_KEY=your-github-private-key

# Email (Optional - for password reset, notifications)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@zyndrx.com

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Set Up Supabase

1. **Create a Supabase Project** at https://supabase.com
2. **Get your credentials:**
   - Go to Project Settings → API
   - Copy `URL` → `SUPABASE_URL`
   - Copy `anon public` key → `SUPABASE_ANON_KEY`
   - Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

3. **Run Database Schema:**
   - Go to SQL Editor in Supabase
   - Copy and run the SQL from `src/database/schema.sql`

### 4. Generate JWT Secret

Generate a secure random string for `JWT_SECRET` (minimum 32 characters):

**On Windows (PowerShell):**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

**On Mac/Linux:**
```bash
openssl rand -base64 32
```

**Or use Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:5000` (or your configured PORT).

### 6. Verify It's Working

Open your browser or use curl:

```bash
# Health check
curl http://localhost:5000/health

# API directory
curl http://localhost:5000/
```

You should see:
```json
{
  "success": true,
  "message": "Zyndrx API is running",
  "timestamp": "...",
  "environment": "development"
}
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server (requires build first)
- `npm run lint` - Run ESLint

## Production Deployment

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Set production environment variables:**
   - Set `NODE_ENV=production`
   - Update `ALLOWED_ORIGINS` with your production frontend URL
   - Ensure all required variables are set

3. **Start the server:**
   ```bash
   npm start
   ```

## Troubleshooting

### Error: "Missing or invalid environment variables"
- Check that all required variables are set in your `.env` file
- Ensure `JWT_SECRET` is at least 32 characters
- Verify Supabase credentials are correct

### Error: "Cannot connect to database"
- Verify your Supabase URL and keys are correct
- Check that your Supabase project is active
- Ensure the database schema has been run

### CORS Errors
- Add your frontend URL to `ALLOWED_ORIGINS` in `.env`
- Use comma-separated values for multiple origins: `http://localhost:3000,http://localhost:5173`

### Port Already in Use
- Change `PORT` in `.env` to a different port (e.g., `5001`)
- Or stop the process using port 5000

## Next Steps

1. ✅ Server is running
2. 📖 Read `API_DOCUMENTATION.md` for all available endpoints
3. 🔗 Connect your frontend to `http://localhost:5000/api/v1`
4. 🧪 Test endpoints using Postman, Insomnia, or curl

## API Base URL

Once running, your API will be available at:
- **Development**: `http://localhost:5000/api/v1`
- **Health Check**: `http://localhost:5000/health`

## Need Help?

- Check the `API_DOCUMENTATION.md` file for endpoint details
- Review error messages in the console
- Check Supabase logs in your Supabase dashboard




