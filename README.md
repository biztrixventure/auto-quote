# Auto Insurance Quote Platform (starter)

A working auto insurance quote website for a licensed US agency. It handles the
whole flow: landing page → multi-step quote form → real quotes from partner
carriers → if no quotes, sell the lead → if that fails, send to an agent.

Built with Next.js 15, TypeScript, Tailwind CSS, Prisma, React Hook Form and Zod.

## What's included

- Landing page with ZIP start, how it works, FAQ, license info footer
- 6-step quote form: location, vehicle, driver, history, insurance, contact
  - ZIP → state auto-detect, state rules config (no-fault/PIP notes)
  - Live vehicle models from the free NHTSA vPIC API
  - Validation on every step (client) and again on the server
  - Saves progress, so users who leave can continue later
- TCPA consent capture: exact text, version, IP, user agent, page URL, time
- TrustedForm hook (add the client's snippet), UTM / gclid / fbclid tracking
- Duplicate protection (same phone or email within 24 hours)
- Lead routing: rater → lead distribution → agent follow-up
- Adapter slots for EZLynx, TurboRater, and any lead platform (webhook)
- Results page with quotes, "buy online" or "call to buy"
- Admin dashboard (password protected): stats, leads table, filters, lead
  detail with consent proof, quotes, sales, attribution, history, status
  changes, CSV export
- Audit log of every important action

## Run it locally

Requires Node.js 20 or newer and Docker (for the local PostgreSQL database).

```bash
npm install
cp .env.example .env        # then edit ADMIN_PASSWORD and OG_SECRET
npm run db:up               # starts PostgreSQL on localhost:5432
npm run db:deploy           # creates the tables
npm run dev
```

**Production:** see [DEPLOY.md](DEPLOY.md) (Docker Compose on Coolify: app + PostgreSQL + backups).

Open http://localhost:3000 for the site and http://localhost:3000/admin for
the dashboard (login from ADMIN_USER / ADMIN_PASSWORD).

It starts in **demo mode**: quotes are clearly labelled sample prices, and
leads that get no quotes are "sold" to a demo buyer. To test the no-quote
path, choose "Suspended or revoked" license, or 3+ accidents and 3+ tickets.

## Where things are

```
prisma/schema.prisma                 Database tables
src/lib/site.ts                      Agency name, phone, license text, CONSENT TEXT
src/lib/states.ts                    State list, ZIP→state, state rules
src/lib/validation.ts                All form rules (shared client + server)
src/lib/integrations/rater.ts        Quote providers (demo, EZLynx, TurboRater)
src/lib/integrations/distribution.ts Lead selling (demo, webhook)
src/lib/integrations/router.ts       The routing business rule
src/components/QuoteForm.tsx         The multi-step form
src/components/TrustedForm.tsx       Consent certificate script
src/app/api/leads/route.ts           Receives and saves submissions
src/app/admin/                       Dashboard
src/middleware.ts                    Admin password protection
```

## Connecting the real systems

**Quotes (EZLynx or TurboRater).** Get API docs and test credentials through
the agency's account. Implement `getQuotes()` in the matching class in
`src/lib/integrations/rater.ts`: map `LeadWithRisk` to their request format,
call the API, and map results to `RaterQuote`. Then set `RATER_PROVIDER`.
Put a `bindUrl` on a quote when the carrier supports online buying.

**Lead selling.** Set `LEAD_DISTRIBUTION="webhook"`, `LEAD_POST_URL` and
`LEAD_POST_API_KEY`, then edit `mapLead()` and `parseResponse()` in
`distribution.ts` to match the platform's posting spec. Always test against
the platform's test endpoint first.

**TrustedForm.** Paste the script URL from the client's ActiveProspect account
into `src/components/TrustedForm.tsx` and set
`NEXT_PUBLIC_TRUSTEDFORM_ENABLED="true"`.

## Going to production

1. Switch the database to PostgreSQL: in `prisma/schema.prisma` set
   `provider = "postgresql"`, set `DATABASE_URL`, run `npx prisma migrate dev --name init`
   locally and `npx prisma migrate deploy` on the server.
2. Deploy (Vercel, AWS, Render, etc.) and set all `.env` values there.
3. Replace basic-auth admin with real logins (Auth.js, Clerk or SSO) and
   per-user accounts so the audit log records who did what.
4. For high traffic, move `routeLead()` into a background job queue
   (BullMQ + Redis, or AWS SQS) and poll from the results page.
5. Add Google Ads / Meta conversion tracking on the results page.

## Must be done by the client (not code)

- **Consent text** in `src/lib/site.ts` from their lawyer (TCPA). Change
  `consentVersion` whenever the text changes.
- **Privacy policy and terms** pages (GLBA, CCPA and other state laws).
- **License numbers** shown in the footer as each state requires.
- **State rules** in `src/lib/states.ts` reviewed by compliance.
- **Data security** program (NAIC model law / NYDFS Part 500 where applicable).

## Next features to add

- Multiple drivers and vehicles per quote (tables already support it)
- Data prefill (LexisNexis/Verisk) with FCRA consent screens
- Home insurance and auto+home bundles (`line` field is already on Lead)
- Abandoned-form follow-up emails/SMS (only with valid consent)
- State SEO pages, e.g. `/car-insurance/texas`
- AMS/CRM sync for sold policies
