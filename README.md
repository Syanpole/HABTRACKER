# HABTRACK

Habit tracker web app with export to PDF and Excel styled to match the provided monthly template.

This project now includes a database-backed API for cloud save/load by profile + month.

## Local development

1. Install dependencies:
   npm install
2. Start dev server:
   npm run dev
3. Build production bundle:
   npm run build
4. Preview production output:
   npm run preview

## Database

The app uses a Vercel Serverless Function at `api/tracker.js` and stores tracker JSON in Postgres.

Schema is auto-created on first API request:

- Table: `habit_tracker_states`
- Primary key: `(profile, month)`
- Columns: `profile`, `month`, `state` (JSONB), `updated_at`

### Vercel database setup

1. In Vercel, open your project.
2. Add a Postgres database integration (Neon in Vercel Marketplace).
3. Vercel will inject the required environment variables (`POSTGRES_URL` and/or `DATABASE_URL`).
4. Redeploy.

### Local API setup (optional)

If you want API/database locally, create a `.env.local` with your Postgres URL:

POSTGRES_URL=postgres://user:password@host:5432/dbname
DATABASE_URL=postgres://user:password@host:5432/dbname

Then run:

1. npm run dev

If database is not configured, the app still works with local browser storage.

## Deploy on Vercel

### Option 1: Vercel dashboard

1. Push this folder to a Git repository (GitHub/GitLab/Bitbucket).
2. Import the repository in Vercel.
3. Vercel will use:
   - Framework: `vite`
   - Build command: `npm run build`
   - Output directory: `dist`
   - API runtime: `nodejs20.x`
4. Click Deploy.

### Option 2: Vercel CLI

1. Install CLI:
   npm i -g vercel
2. From project root:
   vercel
3. For production deploy:
   vercel --prod

Project settings are defined in `vercel.json`.
