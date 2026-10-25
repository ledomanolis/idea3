# Idea3

Next.js + Supabase app, deployed on Vercel. Same setup as idea1.

- Sign-in: email magic link (`app/login`)
- Database schema: `supabase/` (run each file in the Supabase SQL Editor, in order)
- Environment variables: see `.env.local.example`
- A daily Vercel cron (`vercel.json` → `/api/keepalive`) stops the free Supabase project pausing
