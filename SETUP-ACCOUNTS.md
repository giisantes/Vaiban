# Putting Vaiban online with real accounts

Vaiban uses **Supabase** for accounts and the database, and **Vercel** to host the site. Both have free plans. It takes about 15 minutes.

Without the two Supabase keys, the app still runs in **browser-only mode**: no sign-in, and everything is saved in that browser, the same as during the hackathon.

## 1. Install the new package (once)

In the project folder:

```
npm install
```

This adds `@supabase/supabase-js`. Commit the updated `package-lock.json` afterwards.

## 2. Create the Supabase project

1. Sign up at <https://supabase.com> and click **New project**. Pick a region near your users (e.g. London) and save the database password somewhere safe.
2. Open **SQL Editor → New query** and run these three files, one at a time, in this order (paste in everything from the file, then click **Run**):
   1. `supabase/schema.sql` – the `user_data` table (now used for display settings).
   2. `supabase/migrations/002_allow_settings.sql` – lets settings be saved.
   3. `supabase/migrations/003_shared_boards.sql` – shared boards: boards, tasks, members and invites, with the row-level security rules that decide who sees what. It also moves any projects and tasks already saved into the new tables (the old rows are kept as a backup) and switches on live updates.
   4. `supabase/migrations/004_email_invites.sql` – makes emailed invitation links personal and one-time, and limits how many invitation emails can be sent.
   5. `supabase/migrations/005_prompt_library.sql` – the prompt library and the AI skills library: private items for each user, and shared ones for each board.

   **Already set up before?** Just run the ones you haven't run yet (most likely 005). Run each one only once – running 003 a second time stops with an error saying a table already exists, which is harmless.
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
3. Click **Deploy** and copy the site address, e.g. `https://vaiban.vercel.app`.
4. Back in Supabase, go to **Authentication → URL Configuration**:
   - set **Site URL** to your Vercel address
   - add it under **Redirect URLs**, plus `http://localhost:5173` for local testing

   The confirmation and password-reset emails link back to these addresses.

## 5. Before inviting real people

- **Email sending:** Supabase's built-in email sender only sends a few emails per hour and is meant for testing. For real users, add your own email provider (e.g. Resend, which has a free tier) under **Authentication → Emails → SMTP Settings**.
- **Check the security rules:** sign up two test accounts and confirm neither can see the other's projects. Then share one board: open the invite link in the second account, check it only shows "Ask to join" until you let it in, and that it never shows the first account's other boards.
- **Invitation emails:** set up section 6 below, or "Invite by email" will fall back to giving you the link to send yourself.
- **Security headers:** `vercel.json` already adds them (Content-Security-Policy, no framing, HTTPS only). Leave them in place.
- **Privacy:** you'll be storing people's names and emails, so add a short privacy note saying what you store and why (UK GDPR).

## 6. Invitation emails (the send-invite function)

"Invite by email" emails the person a link that works once, and only for their address. The email is sent by a small **Edge Function** running on Supabase, because it needs your Resend key – and that key must never be in the website's code (anyone can read that).

1. **Resend → API Keys → Create API key.** Name it `vaiban-invites`, permission **Sending access**, domain **guisantes.me**. Copy the key (it starts `re_`); Resend only shows it once.
2. **Supabase → Edge Functions → Deploy a new function → Via Editor.** Name it exactly `send-invite`, replace the example code with everything in `supabase/functions/send-invite/index.ts`, and click **Deploy**.
   - Or from the project folder: `npx supabase login`, then `npx supabase functions deploy send-invite --project-ref <your project ref>`.
3. **Supabase → Edge Functions → Secrets → Add new secret** – add these three:

   | Name | Value |
   |---|---|
   | `RESEND_API_KEY` | the key from step 1 |
   | `SITE_URL` | `https://guisantes.me` (your site's address, no slash at the end) |
   | `INVITE_FROM` | `Vaiban <invites@guisantes.me>` (any address on your verified Resend domain) |

4. Test it: share a board, invite one of your other email addresses, and open the link from that inbox.

**If it doesn't work:**
- *"Automatic invitation emails aren't switched on"* – the function isn't deployed, or isn't called `send-invite`.
- *"Email sending isn't set up yet"* – one of the three secrets is missing.
- *An "Invalid JWT" error in the function's Logs* – open the function's settings and switch JWT verification off (the switch is called something like "Verify JWT"). That's safe here: the function passes your sign-in on to the database, which refuses anyone who isn't signed in and doesn't own the board.
- *"The invitation was saved, but the email couldn't be sent"* – check Resend → Logs (usually the `INVITE_FROM` address isn't on your verified domain).

The function never uses the service_role key, and the link in the email always points at `SITE_URL`.

## What's stored where

| Data | Where | Who can see it |
|---|---|---|
| Email + password | Supabase Auth – the password is hashed with bcrypt, never stored as plain text | Nobody can read the password, not even you |
| Name, display name | Supabase Auth (user metadata) | That user (and you, in the dashboard) |
| Boards (name, description, deliverable links) | `boards` table | Active members of that board |
| Tasks | `tasks` table, one row per task | Active members of that board |
| Who is on which board | `board_members` table | Active members see each other's names; the owner also sees who is waiting |
| Members' email addresses | Supabase Auth only (looked up on request) | The board owner, in the Share window |
| Invites | `board_invites` table | The board owner. Someone with a link sees only the board's name and owner. An emailed link only works for the address it was sent to |
| The Resend key | Supabase Edge Function secrets | Only the send-invite function – never the website |
| Prompts and AI skills | `prompts` and `ai_skills` tables | Private ones: only their author. A board's ones: that board's active members |
| Display settings | `user_data` table | Only that user |
