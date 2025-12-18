# Zyndrx Backend API

> **Project Management & Development Coordination Platform**

A comprehensive backend API for Zyndrx - a platform that brings together product managers, designers, developers, testers, and DevOps engineers in one collaborative space.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Development](#development)
- [Deployment](#deployment)

## ✨ Features

### Core Features
- **Authentication & Authorization** - JWT-based auth with role-based access control (RBAC)
- **PRD Management** - Create, version, approve/reject Product Requirements Documents
- **Project Management** - Manage projects, team members, and permissions
- **Task Tracking** - Kanban-style task boards with assignments and status tracking
- **Notifications** - Real-time notifications for task assignments, PRD approvals, etc.
- **Audit Logging** - Track all critical actions for accountability

### Security Features
- JWT authentication
- Role-based access control (Admin, PM, Developer, QA, DevOps, Designer)
- Rate limiting
- Helmet.js security headers
- Row-level security with Supabase

## 🛠️ Tech Stack

- **Runtime:** Node.js v20+
- **Framework:** Express.js with TypeScript (Strict Mode)
- **Database:** PostgreSQL (Supabase)
- **Authentication:** JWT + Supabase Auth
- **Validation:** Zod
- **Logging:** Winston
- **Security:** Helmet, bcryptjs

## 🚀 Getting Started

### Prerequisites

- Node.js v20 or higher
- npm v9 or higher
- Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zyndrx-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration (see [Environment Variables](#environment-variables))

4. **Set up Supabase database**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `src/database/schema.sql` in Supabase SQL Editor
   - Copy your Supabase URL and keys to `.env`

5. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`

## 📁 Project Structure

```
src/
├── config/              # Configuration files
│   ├── index.ts         # Environment config
│   └── supabase.ts      # Supabase client setup
├── database/            # Database schema and migrations
│   ├── schema.sql       # Complete database schema
│   └── README.md        # Database setup instructions
├── middleware/          # Express middleware
│   ├── auth.middleware.ts      # JWT authentication
│   ├── validation.middleware.ts # Zod validation
│   ├── error.middleware.ts     # Error handling
│   ├── rate-limit.middleware.ts # Rate limiting
│   └── audit.middleware.ts     # Audit logging
├── modules/            # Feature modules
│   ├── auth/           # Authentication
│   ├── projects/       # Project management
│   ├── prd/            # PRD management
│   ├── tasks/          # Task tracking
│   └── notifications/  # Notifications
├── types/              # TypeScript types
│   ├── database.types.ts  # Database types
│   └── express.d.ts       # Express extensions
├── utils/              # Utility functions
│   ├── logger.ts       # Winston logger
│   └── response.ts     # Response handlers
├── app.ts              # Express app setup
└── server.ts           # Server entry point
```

## 📚 API Documentation

### Base URL
```
Production: https://your-domain.com/api/v1
Development: http://localhost:5000/api/v1
```

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login user | Public |
| GET | `/auth/me` | Get current user | Private |
| PUT | `/auth/profile` | Update profile | Private |
| POST | `/auth/logout` | Logout user | Private |

### Project Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/projects` | Create project | Private |
| GET | `/projects` | Get all projects | Private |
| GET | `/projects/:id` | Get project by ID | Private |
| PUT | `/projects/:id` | Update project | Owner |
| DELETE | `/projects/:id` | Delete project | Owner |
| GET | `/projects/:id/members` | Get project members | Private |
| POST | `/projects/:id/members` | Add member | Owner |
| DELETE | `/projects/:id/members/:memberId` | Remove member | Owner |

### PRD Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/prds` | Create PRD | PM, Admin |
| GET | `/prds/:id` | Get PRD by ID | Private |
| GET | `/prds/project/:projectId` | Get project PRDs | Private |
| PUT | `/prds/:id` | Update PRD | PM, Admin |
| POST | `/prds/:id/submit` | Submit for review | PM, Admin |
| POST | `/prds/:id/status` | Approve/Reject PRD | PM, Admin |
| GET | `/prds/:id/versions` | Get version history | Private |
| DELETE | `/prds/:id` | Delete PRD | Creator, Owner |

### Task Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/tasks` | Create task | Private |
| GET | `/tasks/my-tasks` | Get user's tasks | Private |
| GET | `/tasks/:id` | Get task by ID | Private |
| GET | `/tasks/project/:projectId` | Get project tasks | Private |
| PUT | `/tasks/:id` | Update task | Private |
| PATCH | `/tasks/:id/status` | Update status | Private |
| DELETE | `/tasks/:id` | Delete task | Creator, Owner |

### Notification Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/notifications` | Get notifications | Private |
| GET | `/notifications/unread-count` | Get unread count | Private |
| POST | `/notifications/mark-all-read` | Mark all as read | Private |
| PATCH | `/notifications/:id/read` | Mark as read | Private |
| DELETE | `/notifications/:id` | Delete notification | Private |

## 🔐 Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
API_VERSION=v1

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Email Service (Optional)
RESEND_API_KEY=re_your_api_key

# GitHub Integration (Optional)
GITHUB_WEBHOOK_SECRET=your-webhook-secret
```

## 💾 Database Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to be fully initialized

2. **Run Database Schema**
   - Open Supabase Dashboard → SQL Editor
   - Copy contents from `src/database/schema.sql`
   - Execute the script

3. **Configure Storage Buckets** (Optional)
   - Create buckets: `documents`, `avatars`, `project-files`
   - Set appropriate bucket policies

See `src/database/README.md` for detailed instructions.

## 💻 Development

### Available Scripts

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Linting
npm run lint
npm run lint:fix

# Testing (if configured)
npm test
```

### Code Quality

- **TypeScript Strict Mode** - Enabled for maximum type safety
- **ESLint** - Configured with TypeScript rules
- **Consistent Error Handling** - Using custom `AppError` class
- **Logging** - Winston logger with different levels
- **Validation** - Zod schemas for all inputs

## 🚢 Deployment

### Deploy to Railway

1. Create account at [railway.app](https://railway.app)
2. Create new project
3. Connect your GitHub repository
4. Add environment variables from `.env.example`
5. Deploy!

Railway will automatically:
- Install dependencies
- Build TypeScript
- Start the server

### Deploy to Render

1. Create account at [render.com](https://render.com)
2. Create new Web Service
3. Connect your repository
4. Configure:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Add environment variables
6. Deploy!

### Environment Variables for Production

Make sure to set:
- `NODE_ENV=production`
- Strong `JWT_SECRET` (32+ characters)
- Production `SUPABASE_URL` and keys
- Production `ALLOWED_ORIGINS` (your frontend URL)

## 🔒 Security Best Practices

- ✅ JWT tokens with expiration
- ✅ Password hashing with bcrypt
- ✅ Rate limiting on all endpoints
- ✅ Helmet.js for security headers
- ✅ CORS configured properly
- ✅ Row-level security in Supabase
- ✅ Input validation with Zod
- ✅ Audit logging for accountability

## 📝 License

MIT

## 🤝 Contributing

This is a proprietary project. Contact the maintainers for contribution guidelines.

## 📧 Support

For issues and questions, please contact the development team.

---

Built with ❤️ for seamless development collaboration
