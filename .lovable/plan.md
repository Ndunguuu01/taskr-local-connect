# FLEXWORKERS — Implementation Plan

## Important stack note
Your spec asks for Next.js + Express + standalone Postgres/PostGIS + Vercel/Railway. Lovable projects run on **TanStack Start (React 19 + Vite)** with **Lovable Cloud (Supabase)** as the backend. I'll build the same product on this stack:

- Frontend: TanStack Start + Tailwind (equivalent to Next.js App Router)
- Backend: TanStack server functions + Supabase (replaces Express)
- DB: Supabase Postgres — **PostGIS is available**, so `GEOGRAPHY(POINT,4326)`, `ST_DWithin`, `ST_Distance` all work as specified
- Auth: Supabase Auth with email/password + role table (replaces NextAuth/JWT — RLS enforces role access server-side)
- Payments: M-Pesa STK Push via **IntaSend** (Daraja-backed, works from server functions)
- Maps: Google Maps via the Lovable Google Maps connector
- Hosting: published from Lovable (single URL, no Vercel/Railway split needed)

Everything in your feature list is buildable here. If you need literal Next.js/Express repos to self-host, say so and I'll stop — Lovable can't emit that.

## Scope is large — phased build
This is ~10 feature areas. I'll ship in phases so each is usable before moving on. After each phase you can test and redirect.

### Phase 1 — Foundation (this batch)
- Design system (teal primary + neutrals), landing page, auth pages
- Lovable Cloud enabled; schema: `profiles`, `user_roles` (client/tasker/admin), `tasker_profiles`, `jobs`, `bookings`, `reviews`, `messages` — all with PostGIS `location` columns
- RLS policies + `has_role()` security-definer function
- Signup with role selection → routes to client or tasker dashboard shell

### Phase 2 — Jobs & Taskers
- Client: post job with Google Maps location picker, list own jobs by status
- Tasker: create/edit profile with location, skills, hourly rate
- Public tasker profiles + filters (category, radius, price, rating)
- PostGIS nearby search (server function using `ST_DWithin`/`ST_Distance`)
- Job detail page with map embed

### Phase 3 — Bookings, Messaging, Reviews
- Booking flow (apply / book / accept / decline / complete)
- In-app chat per booking (Supabase Realtime)
- 1–5 star reviews, aggregated onto tasker profile
- Notification bell (bookings, messages, payments)

### Phase 4 — Payments
- IntaSend STK Push server function (requires your IntaSend API key + publishable key as secrets)
- Webhook route at `/api/public/intasend-webhook` with signature verification
- Update `bookings.payment_status`, store transaction id, update tasker earnings

### Phase 5 — Admin & polish
- `/admin` route gated by `has_role(user, 'admin')`: users, jobs, bookings, suspend/remove, stats
- Empty states, loading spinners, toasts, mobile QA, SEO metadata, sitemap

## Technical details
- Roles stored in separate `user_roles` table (never on profile) — required to prevent privilege escalation
- All server functions use `requireSupabaseAuth` middleware; admin actions gated by `has_role`
- Nearby search runs as a Postgres RPC (`nearby_taskers(lng, lat, radius_m)`) so PostGIS runs server-side
- Google Maps connector supplies both the browser key (map + Places autocomplete) and gateway key (server geocoding if needed)
- M-Pesa flow: client hits `initiatePayment` server fn → IntaSend STK push → user PIN on phone → IntaSend webhook → booking marked paid

## What I need from you to start
1. **Confirm the stack swap** (TanStack Start + Supabase + IntaSend) is OK, or tell me to stop.
2. **Payments provider**: IntaSend is easiest for M-Pesa STK from Lovable. Flutterwave/Pesapal also possible. Pick one (or say "IntaSend").
3. **Location scope**: Kenya-only default map center, or global?
4. Payment secrets (IntaSend API keys) — I'll request them at Phase 4, not now.

Once you approve, I'll start Phase 1 (design system + landing + auth + schema).
