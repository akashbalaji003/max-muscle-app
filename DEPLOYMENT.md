# FitHub Gym — Deployment Guide

## Prerequisites
- Node.js 20.9+
- A [Supabase](https://supabase.com) project
- A [Vercel](https://vercel.com) account (for frontend)

---

## 1. Supabase Setup

### a) Create a project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to your users
3. Note: `Project URL`, `anon key`, `service_role key`

### b) Run the database schema
1. Open **Supabase Dashboard → SQL Editor**
2. Paste the contents of `database/schema.sql`
3. Click **Run** — this creates all tables and seeds exercise data

### c) Create Storage bucket for progress photos
1. Supabase Dashboard → **Storage → New bucket**
2. Name: `progress-photos`
3. Set to **Public** (so image URLs work)
4. Add policy: authenticated users can upload/read their own files

---

## 2. Local Development

```bash
# Clone / navigate to project
cd gym-app

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local
# Fill in your Supabase keys and JWT secret in .env.local

# Run development server
npm run dev
# → Open http://localhost:3000
```

### Required `.env.local` values:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-32-char-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourSecurePassword123
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GYM_NAME=FitHub Gym
```

---

## 3. Deploy to Vercel

### a) Push to GitHub
```bash
git init
git add .
git commit -m "Initial FitHub gym platform"
git remote add origin https://github.com/yourname/fithub-gym.git
git push -u origin main
```

### b) Deploy
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Add **Environment Variables** (same as .env.local)
5. Change `NEXT_PUBLIC_APP_URL` to your Vercel domain (e.g. `https://fithub-gym.vercel.app`)
6. Click **Deploy**

---

## 4. Post-deployment Checklist

- [ ] Visit `https://your-app.vercel.app` — landing page loads
- [ ] Sign up a test user account
- [ ] Log in as admin (`/admin/login`) and add membership
- [ ] Test QR check-in at `/checkin`
- [ ] Log a workout and verify analytics update
- [ ] Generate and download gym QR code from `/admin/qr`
- [ ] Print QR code and mount at gym entrance

---

## 5. Production Tips

### Security
- Rotate `JWT_SECRET` periodically (invalidates all sessions)
- Use strong `ADMIN_PASSWORD` (16+ chars, mixed case/symbols)
- Enable Supabase Row Level Security (RLS) for additional DB protection

### Performance
- Vercel Edge Network handles global CDN automatically
- Supabase free tier supports up to 500 MB DB + 1 GB storage

### Scaling
- For >500 concurrent users: upgrade Supabase to Pro
- Add Redis caching for analytics (optional)

---

## 6. Folder Structure

```
gym-app/
├── database/
│   └── schema.sql          # PostgreSQL schema + seed data
├── src/
│   ├── app/
│   │   ├── (auth)/         # Login/Signup pages (route group)
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (app)/          # Authenticated app pages
│   │   │   ├── dashboard/
│   │   │   ├── workout/
│   │   │   ├── analytics/
│   │   │   ├── leaderboard/
│   │   │   └── progress/
│   │   ├── admin/          # Admin portal
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   └── qr/
│   │   ├── api/            # API route handlers
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   ├── attendance/
│   │   │   ├── exercises/
│   │   │   ├── workout/
│   │   │   ├── analytics/
│   │   │   ├── leaderboard/
│   │   │   ├── progress/
│   │   │   ├── qr/
│   │   │   └── upload/
│   │   ├── checkin/        # QR check-in page (public)
│   │   ├── layout.tsx
│   │   └── page.tsx        # Landing page
│   ├── components/
│   │   ├── ui/             # Button, Input, Card, Badge
│   │   └── layout/         # Sidebar
│   ├── lib/
│   │   ├── auth.ts         # JWT + password utils
│   │   ├── supabase.ts     # DB clients
│   │   └── utils.ts        # Helpers
│   ├── types/
│   │   └── index.ts        # TypeScript interfaces
│   └── proxy.ts            # Auth proxy (Next.js 16 middleware)
├── .env.local              # Environment variables
├── next.config.ts
└── DEPLOYMENT.md
```

---

## 7. Key API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/signup | — | Create user account |
| POST | /api/auth/login | — | Login → sets cookie |
| POST | /api/auth/logout | — | Clear auth cookie |
| GET | /api/auth/me | User | Current user + membership |
| POST | /api/admin/login | — | Admin login |
| POST | /api/admin/membership | Admin | Add/extend membership |
| GET | /api/admin/users | Admin | All members |
| GET | /api/admin/attendance | Admin | Attendance log |
| POST | /api/attendance/checkin | User | Record today's check-in |
| GET | /api/attendance/history | User | My attendance log |
| GET | /api/exercises | — | Exercise catalogue |
| POST | /api/workout | User | Log workout session |
| GET | /api/workout | User | My workout history |
| GET | /api/workout/prs | User | My personal records |
| GET | /api/analytics | User | Analytics data |
| GET | /api/leaderboard | User | PR leaderboard |
| POST | /api/progress | User | Save progress photo |
| GET | /api/progress | User | My progress photos |
| POST | /api/upload | User | Upload image to storage |
| GET | /api/qr | — | Gym check-in QR code |
