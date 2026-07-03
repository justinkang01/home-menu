# home-menu

A simple menu + order tracker for home cafes. One person hosts, everyone else orders.

## How it works

- **Host** creates a menu and gets a private admin link to manage items and watch orders come in live.
- **Guests** open a public link (or scan the QR code shown on the admin dashboard), enter their name once, browse the menu, and place orders. No accounts, no passwords, no payments — this just tracks who ordered what.
- Orders flow `pending` → `preparing` → `served`. Both the host and each guest see status updates live (via Supabase Realtime), no need to refresh.
- Guests can come back and order more anytime — their browser remembers who they are for that specific menu.

Built for a small scale: works great for a home cafe with up to ~50 guests on a single menu.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) — one app for both the host and guest UI, plus API routes
- [Supabase](https://supabase.com) — Postgres for storage, Realtime for live order updates
- [Tailwind CSS](https://tailwindcss.com) for styling
- [`qrcode.react`](https://github.com/rosskevin/qrcode.react) for the guest-link QR code

There's no traditional accounts/auth system: the host is identified by a secret admin-token URL, and guests by a client-held id stored in `localStorage`. See `supabase/schema.sql` for the full data model and RLS setup.

## Local setup

1. Create a [Supabase](https://supabase.com) project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor — creates the tables, sets up RLS, and enables Realtime.
3. Copy `.env.local.example` to `.env.local` and fill in your Supabase project URL, anon key, and service-role key.
4. `npm install`
5. `npm run dev` and open http://localhost:3000

## Deployment

Deployed on [Railway](https://railway.app). Set the same three env vars from `.env.local` on the Railway service, then either `railway up` or push to `main` if the GitHub repo is connected with autodeploy enabled.
