# Putting Vibeboard online with real accounts

Vibeboard uses **Supabase** for accounts and the database, and **Vercel** to host the site. Both have free plans. It takes about 15 minutes.

Without the two Supabase keys, the app still runs in **browser-only mode**: no sign-in, and everything is saved in that browser, the same as during the hackathon.

## 1. Install the new package (once)

In the project folder:

```
npm install
```

This adds `@supabase/supabase-js`. Commit the updated `package-lock.json` afterwards.

## 2. Create the Supabase project

1. Sign up at <https://supabase.com> and click **New project**. Pick a region near your users (e.g. London) and save the database password somewhere safe.
2. Open **SQL Editor → New query**, paste in everything from `supabase/schema.sql`, and click **Run**. This creates the `user_data` table and the row-level security rules that keep each account's data private.
3. Open **Authentication → Sign In / Providers → Email** and check that:
   - **Email** sign-in is enabled
   - **Confirm email** is ON, so people must prove they own the address
   - the minimum password length is **8**
4. Open **Project Settings → API keys** (or **Data API**) and copy two values:
   - the **Project URL** (`https://xxxx.supabase.co`)
   - the **anon / publishable** key

   Never use the **service_role / secret** key in this app. That key bypasses all the security rules.

## 3. Try it on your computer

1. Copy `.env.example` to a new file called `.env.local`.
2. Paste the two values into `.env.local`. This file is git-ignored, so the keys don't get committed.
3. Restart `npm run dev`. You should now see the **Sign in** screen.
4. Create an account, click the link in the confirmation email, and sign in.

## 4. Put it online with Vercel

1. Push to GitHub, then go to <https://vercel.com> → **Add New → Project** and import your repo. Vercel detects Vite automatically.
2. Before clicking Deploy, open **Environment Variables** and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the same values.
3. Click **Deploy** and copy the site address, e.g. `https://vibeboard.vercel.app`.
4. Back in Supabase, go to **Authentication → URL Configuration**:
   - set **Site URL** to your Vercel address
   - add it under **Redirect URLs**, plus `http://localhost:5173` for local testing

   The confirmation and password-reset emails link back to these addresses.

## 5. Before inviting real people

- **Email sending:** Supabase's built-in email sender only sends a few emails per hour and is meant for testing. For real users, add your own email provider (e.g. Resend, which has a free tier) under **Authentication → Emails → SMTP Settings**.
- **Check the security rules:** sign up two test accounts and confirm neither can see the other's projects.
- **Security headers:** `vercel.json` already adds them (Content-Security-Policy, no framing, HTTPS only). Leave them in place.
- **Privacy:** you'll be storing people's names and emails, so add a short privacy note saying what you store and why (UK GDPR).

## What's stored where

| Data | Where | Who can see it |
|---|---|---|
| Email + password | Supabase Auth – the password is hashed with bcrypt, never stored as plain text | Nobody can read the password, not even you |
| Name, display name | Supabase Auth (user metadata) | That user (and you, in the dashboard) |
| Projects, tasks, deliverable links | `user_data` table, one row per user per kind | Only that user (row-level security) |
