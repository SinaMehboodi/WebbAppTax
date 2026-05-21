# Mindset — local direct tax management (FR)

Web app implementing the 7-phase customer journey for managing and optimizing
French local direct taxes (Taxe Foncière, CFE). Built on Next.js 16 + Postgres
(Prisma) + Tailwind v4.

This is a PWA-ready, bilingual (FR/EN) web app that supports the three roles
described in the spec — `ADMIN`, `EMPLOYEE` (sales rep / case manager), and
`USER` (client/taxpayer) — and walks each role through their slice of the
journey.

## Quick start

Prerequisites: Node 20+, a Postgres database (Supabase, Neon, local Docker,
etc.).

```bash
# 1. install
npm install

# 2. create .env with at least DATABASE_URL and DIRECT_URL
#    (see .env in the repo — Supabase URLs are already filled in)

# 3. push schema to the DB
npx prisma generate
npx prisma db push

# 4. seed sample data (admin + employees + client + presentation content)
npm run db:seed

# 5. run
npm run dev
```

Default test accounts (password: `password1234`):

| Email                    | Role     | Notes                          |
| ------------------------ | -------- | ------------------------------ |
| admin@example.com        | ADMIN    | Full back-office               |
| samuel@example.com       | EMPLOYEE | "Samuel Duran" sales rep       |
| commercial2@example.com  | EMPLOYEE | Second sales rep               |
| client@example.com       | USER     | Verified, tutorial not yet seen |

## How the 7 phases map to the code

| Phase | Spec content                                | Code entrypoints                                                                                  |
| ----- | ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1     | Sales presentation, QR codes, assisted signup | `src/app/present/**`, `src/app/r/rep/[id]/page.js`, `src/app/signup/**`, `src/app/admin/presentation/**` |
| 2     | Email verification, first-login tutorial, dashboard | `src/app/verify/**`, `src/app/tutorial/**`, `src/app/dashboard/**`                          |
| 3     | Document upload, contract & mandate, e-signature | `src/app/cases/new/**`, `src/app/cases/[id]/sign/**`, `src/app/api/cases/[id]/contract`, `src/lib/docusign.js` |
| 4     | Mission start, additional documents          | Activation in `api/cases/[id]/sign`, requests in `api/cases/[id]/doc-request`, client UI in `cases/[id]/page.js` |
| 5     | Internal analysis & 3-branch decision        | `src/app/admin/cases/[id]/AnalysisForm.js`, `DecisionForm.js`, `api/cases/[id]/analysis`, `api/cases/[id]/decision` |
| 6     | Result, educational tutorial, billing        | `src/app/admin/cases/[id]/ResultForm.js`, `InvoiceActions.js`, `src/app/invoices/[id]/page.js`     |
| 7     | Loyalty, annual reminders, referrals, history | `src/app/cases/page.js` (history), `src/app/referral/**`, `referralCode` in `User`, `AnnualReminder` model |

## Architecture

- **Next.js 16** (App Router, server components by default). Note: middleware
  was renamed to `proxy.js` in Next 16 — there is no proxy.js in this project
  because locale routing is cookie-based rather than URL-prefixed.
- **Prisma 7** with the new driverAdapters preview (`@prisma/adapter-pg`) so
  Postgres connections work cleanly on serverless platforms.
- **Locale**: cookie-based. `src/lib/dictionary.js` reads the `locale` cookie
  (`fr` default) and returns a `t()` function backed by `messages/{fr,en}.json`.
  The user can switch FR/EN via the header.
- **Sessions**: DB-backed (`Session` model). Token stored in an `httpOnly`
  cookie. See `src/lib/session.js`.
- **Storage abstraction** (`src/lib/storage.js`): switch between local
  filesystem and S3 via `STORAGE_PROVIDER=local|s3`. Local writes to
  `./uploads/`. S3 hooks are stubbed — wire `@aws-sdk/client-s3` when ready.
- **E-signature** (`src/lib/docusign.js`): real DocuSign requires
  `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_USER_ID`, `DOCUSIGN_ACCOUNT_ID`.
  Without them the system runs in stub mode where "signing" is a button click
  inside the app. Replace the body of `sendEnvelope()` for production.
- **Email** (`src/lib/email.js`): no SMTP wired in V1 — emails are logged to
  console and persisted to `./outbox/` as JSON so you can read verification
  codes during development. Wire Resend/Postmark/SES when ready.

## Status workflow

A case moves through the following states (see `src/lib/workflow.js`):

```
DRAFT
  → CONTRACT_PREPARING      (auto on upload, staff sees in /admin/inbox)
  → AWAITING_SIGNATURE      (staff posts contract via /admin/cases/[id])
  → SIGNED                  (client signs contract + mandate)
  → ACTIVE                  (case becomes visible to client)
  → AWAITING_DOCUMENTS      (staff requests additional docs)
  → DOCUMENTS_RECEIVED      (client uploads them)
  → ANALYZING               (manual)
  → DECISION_PENDING        (analysis submitted)
  → PROCEEDING / NOT_PROCEEDING / AUDIT_OFFERED  (3-branch decision)
  → ADMIN_RESPONSE
  → RESULT_DELIVERED        (staff records result)
  → INVOICED                (staff issues invoice)
  → PAID                    (staff marks paid)
  → CLOSED + archived
```

Cases in `DRAFT` and `CONTRACT_PREPARING` are intentionally hidden from the
client per spec Phase 3 §9 ("only after signature can the company […] make
the case visible in the client's space").

## What's stubbed for V1

- **DocuSign** — `src/lib/docusign.js` returns a stub envelope id. The in-app
  signing flow is real (see "E-signature" below), but if you want to push to
  DocuSign / Yousign for a third-party signed timestamp, wire the JWT grant.
- **S3** — see `src/lib/storage.js`. Local FS works out of the box.
- **Annual reminders** — model is in place (`AnnualReminder`) but no cron job
  is wired. Run via a scheduled task or external cron.

## What's wired in production-mode

- **E-signature with audit trail** — `src/lib/pdf.js` builds proper PDF
  contracts and mandates, then `stampSignaturePdf` bakes the signature image
  into the original and appends an "Attestation de signature électronique"
  page with signer name/email, UTC + Europe/Paris timestamp, client IP,
  user-agent, SHA-256 of the source PDF, signature PNG and signed PDF, plus
  the consent flag. The same evidence is also persisted as a structured
  ActivityLog (`action: "signature.audit"`) so the case detail page renders
  a "Trace de signature" timeline with links back to the attestation PDF.
- **PDF generation** — real PDFs (no more `.txt` dumps).
- **Email** — `src/lib/email.js` ships Resend → SMTP → outbox fallback.
  `notify()` (see `src/lib/notifications.js`) resolves i18n keys with the
  recipient's locale before send and renders a branded HTML template.
- **Web Push** — service worker at `public/sw.js`, VAPID-backed
  `src/lib/push.js`, `PushSubscription` Prisma model, `/api/push/subscribe`
  endpoint, and a `PushOptIn` button on the notifications page.
  Configure `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` /
  `VAPID_SUBJECT` in `.env` (sample keys are generated for dev).
- **Live comments** — `CommentStream` polls `/api/cases/[id]/comments` every
  5 s while visible, posts optimistically, and the POST endpoint fires a push
  notification to the other party.
- **Storage** — `src/lib/storage.js` ships local + S3 (also R2/Supabase/MinIO
  via `S3_ENDPOINT`). When `STORAGE_PROVIDER=s3` the document download API
  302-redirects to a 5-min pre-signed URL so we don't proxy big PDFs.
- **Security** — `src/lib/rate-limit.js` in-memory limiter is plugged into
  login (10/min/IP), signup (5/5min/IP), forgot/reset/verify, signature
  (20/min/user) and comments (30/min/user). Every state-changing endpoint
  uses Zod schemas — see `src/app/api/auth/*` and `src/app/api/cases/[id]/sign`.
- **Error pages** — branded `src/app/not-found.js` (404) and
  `src/app/error.js` root error boundary, both with the brand gradient and
  a Retry / Home action.
- **Cron** — `GET /api/cron/reminders` (header `x-cron-secret: $CRON_SECRET`)
  is idempotent and handles invoice D+15/D+30 reminders + Phase 7 annual
  TF/CFE reminders. Wire it to Vercel Cron or any scheduler running once
  per day.
- **PWA install hint** — `src/components/InstallPwaPrompt.js` renders on
  `/notifications`: native install button on Android/desktop Chrome, a
  brief iOS guide on Safari. Auto-hides for 1 day on dismissal and never
  shows when already installed.

## Project layout

```
mindset-app/
├── prisma/
│   ├── schema.prisma            ← full data model for the 7 phases
│   └── seed.js                  ← admin/employee/client + presentation content
├── src/
│   ├── app/
│   │   ├── layout.js            ← root layout (locale-aware <html lang=...>)
│   │   ├── page.js              ← landing page
│   │   ├── manifest.js          ← PWA manifest
│   │   ├── present/             ← Phase 1: tablet presentation
│   │   ├── r/                   ← QR redirects (rep + referral)
│   │   ├── signup/              ← Phase 1: account creation
│   │   ├── login/, verify/, forgot-password/, reset-password/
│   │   ├── tutorial/            ← Phase 2: first-login tutorial
│   │   ├── dashboard/           ← Phase 2: client home
│   │   ├── cases/               ← Phases 3-6: client cases (list, new, detail, sign)
│   │   ├── invoices/            ← Phase 6: client invoices + educational tutorial
│   │   ├── referral/            ← Phase 7: referrals & QR
│   │   ├── notifications/       ← Phase 7
│   │   ├── admin/               ← Staff back-office
│   │   │   ├── page.js          ← workflow board / KPIs
│   │   │   ├── inbox/           ← Phase 3 §4 — new uploads awaiting contract
│   │   │   ├── cases/           ← all cases + per-case workspace
│   │   │   ├── users/           ← user list
│   │   │   └── presentation/    ← locked content management
│   │   └── api/                 ← REST endpoints
│   ├── components/              ← Header, StatusBadge, LocaleSwitcher, …
│   ├── lib/                     ← prisma, session, storage, docusign, …
│   └── messages/{fr,en}.json    ← i18n dictionaries
└── README.md
```

## Roadmap

V1 ships everything in this repo. Likely next milestones:

1. Optional DocuSign / Yousign envelopes (third-party qualified timestamp on
   top of the in-app eIDAS-simple signature).
2. Admin views: filter cases by manager, full-text search, audit-log CSV
   export.
3. Distributed rate limiter (swap `src/lib/rate-limit.js` for Redis/Upstash
   if you scale beyond a single Node process).
4. Test suite: smoke tests for the auth/signature/cron flows (jest + msw or
   playwright).

## License

Private — internal use.
