# Century App

Uganda's TikTok-style vendor marketplace. Scroll the feed, follow vendors, message
them on WhatsApp to buy. No payments, no mobile money, no in-app checkout — by design.

This is a real, working product backed by Supabase (Postgres database, auth, and file
storage) and Next.js, built mobile-first so it installs like an app from the browser
(Add to Home Screen) on any phone, no app store required.

## What's already working

- **Roles:** Customer, Vendor, Admin, plus a "No account" browse-only mode
- **Feed:** TikTok-style vertical scroll, autoplay video, image carousels, search
- **Vendor:** store profile (name, location, WhatsApp number), catalog with edit/delete,
  product upload enforcing **2 images OR 1 video per product**
- **Customer:** follow vendors, like/comment (requires an account — "no account" mode can
  only browse and share), tap WhatsApp to message the vendor directly via `wa.me`
- **Admin:** hidden behind **4 taps on the center logo** in the bottom nav, default
  password `admin` (change it immediately — see below), dashboard with stats, vendor
  verification (blue star ⭐), product boosting, and a password-reset queue
- **No payments anywhere** — WhatsApp is the only path from browsing to buying

## 1. Set up your database (required — do this first)

1. Open your Supabase project → **SQL Editor** → New query.
2. Paste the entire contents of `supabase-schema.sql` (in this folder) and click **Run**.
   This creates every table, security policy, and the storage bucket for product photos/videos.
   It's safe to re-run if you ever need to.

This schema was rewritten from an earlier draft to close three real security holes:
admin credentials and password-reset PINs were previously readable (and the admin
password *writable*) by anyone with browser dev tools, and any visitor — no account
needed — could upload to or delete from product storage. Those are fixed now: the admin
account is a real authenticated user, reset requests and profile contact details are
admin-only, and storage uploads/deletes require real ownership.

## 2. Create the admin account (required — do this once)

The admin login isn't a special "mode" — it's a real account, just one your customers
will never see advertised anywhere in the UI (it only appears via the secret 4-tap gesture).

1. Open the app, open the sign-up sheet, and create an account as a **Customer** with:
   - Email: `admin@century.app` (or set your own — see env vars below)
   - Password: `admin` (you'll change this from inside the admin panel)
2. In Supabase → **SQL Editor**, run:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'admin@century.app');
   ```
3. In the app, tap the center logo (between Feed and Manage) **4 times quickly**, enter
   the password, and you're in. Go to **Settings → Change Admin Password** immediately.

## 3. Environment variables

`.env.local` already has your Supabase URL and key filled in. If you used a different
admin email above, also set:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_ADMIN_EMAIL=admin@century.app
```

## 4. Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — resize your browser narrow or open it on your phone to see
the real mobile layout.

## 5. Turn on sign-up methods (optional, do as needed)

Email/password sign-up works immediately with no extra setup. The other two methods need
a quick config step in your Supabase dashboard before they'll work:

- **Phone OTP:** Supabase → Authentication → Providers → Phone. You'll need to connect an
  SMS provider (Twilio, MessageBird, or Vonage) — Supabase walks you through this with a
  free trial credit on most of them.
- **Google sign-in:** Supabase → Authentication → Providers → Google. You'll need a free
  Google Cloud OAuth Client ID/Secret — Supabase's docs link to the exact Google Cloud
  setup screen.

Until you set these up, the Email and Phone *buttons* will be visible but phone/Google
won't complete — so do this before launch if you want all three live.

## 6. Deploy it live

The fastest path:

1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Add the same environment variables from `.env.local` in Vercel's project settings.
4. Click Deploy. You'll get a live URL in about a minute.

Anyone who visits that URL on a phone can tap "Add to Home Screen" and it behaves like
an installed app (manifest + icons are already configured for this).

## 7. Automatic password-reset emails (optional, recommended)

When someone taps "Forgot password," they land in a queue you (the admin) see in
**Manage → Resets**. By default, tapping "Send PIN" reveals a one-time PIN for you to
copy and send yourself — but you can make this fully automatic with a free email account:

1. Sign up at [resend.com](https://resend.com) (free tier: 100 emails/day, no credit card).
2. Get your API key from the Resend dashboard.
3. Add to `.env.local` (and to Vercel's environment variables when you deploy):
   ```
   RESEND_API_KEY=re_your_real_key_here
   RESEND_FROM_EMAIL=Century App <onboarding@resend.dev>
   ```
4. That's it — "Send PIN" will now email the code directly. If it ever fails (e.g. key
   missing or expired), it automatically falls back to showing you the PIN to send manually,
   so this never blocks a user from resetting their password.

**One catch:** Resend's sandbox sender (`onboarding@resend.dev`) can only deliver to the
email address you signed up to Resend with — fine for testing, not for real customers.
To send to *any* customer's inbox, verify your own domain in Resend (Resend → Domains —
takes a few DNS records and a few minutes) and set `RESEND_FROM_EMAIL` to an address on
that domain, e.g. `Century App <noreply@yourdomain.com>`.

## Project structure

```
src/app/page.jsx              — top-level app shell, role-based view switching, the hidden admin gesture
src/app/layout.jsx            — fonts, PWA metadata
src/components/Feed.jsx        — the TikTok-style scroll feed + search
src/components/FeedItem.jsx    — one product card: media, like, comment, share, WhatsApp button
src/components/VendorProfileModal.jsx — the vendor info popup customers see from the feed
src/components/AuthModal.jsx   — sign up / log in (role select → email/phone/Google → vendor setup)
src/components/VendorDashboard.jsx — vendor's own catalog + store profile
src/components/AddProductModal.jsx — product create/edit, enforces the 2-images-or-1-video rule
src/components/AdminDashboard.jsx  — stats, vendor verification, boosting, password resets, settings
src/lib/supabase.js            — every database/auth call the app makes, in one place
src/app/api/send-reset-pin/route.js — server-only route that emails the reset PIN via Resend
supabase-schema.sql            — run this once in Supabase to set up the whole database
```
