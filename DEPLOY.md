# Deploying Vertex AutoCare on Coolify

## How it runs

```
            Internet (HTTPS)
                  │
     Coolify proxy (Traefik): TLS certificates, domain routing
                  │
   ┌──────────────┴───────────────────────── docker-compose.yml ─┐
   │  app      Next.js server (non-root), port 3000                │
   │           • applies database migrations on every start        │
   │           • /api/health checked every 30s (restarts if bad)   │
   │                  │                                            │
   │  db       PostgreSQL 17, data in volume "postgres-data"       │
   │                  │  (private network only, no public port)    │
   │  backup   pg_dump every 24h → volume "backups", keeps 14 days │
   └──────────────────────────────────────────────────────────────┘
```

- Only the app is reachable from the internet, through Coolify's proxy. The database has no public port.
- The app container holds no data. Leads, settings, users and everything else live in PostgreSQL, so the app can be rebuilt or redeployed at any time.
- Logs are capped at 50 MB per container.

## First deploy

1. Push this project to a Git repository (GitHub, GitLab, Gitea...).
2. In Coolify: **Projects → your project → + New → Private Repository** (or Public), choose the repo and branch.
3. **Build Pack: Docker Compose**. Compose file: `/docker-compose.yml`.
4. Under **Environment Variables**, set:
   - `SITE_URL`: your public address, e.g. `https://www.vertexautocare.com` (no trailing slash). **Required.**
   - Coolify generates `SERVICE_PASSWORD_POSTGRES`, `SERVICE_PASSWORD_ADMIN` and `SERVICE_PASSWORD_64_OGSECRET` for you. Leave them alone.
   - Optional: `RESEND_API_KEY`, `NOTIFY_FROM`, `TWILIO_*` for new-lead alerts; `LEAD_DISTRIBUTION`, `LEAD_POST_URL`, `LEAD_POST_API_KEY` for lead buyers.
5. On the **app** service, set the **Domain** to the same address as `SITE_URL` (for example `https://www.vertexautocare.com`). Point the domain's DNS A record at your server first so Coolify can get the HTTPS certificate.
6. Click **Deploy**. The first build takes a few minutes.
7. Open `https://your-domain/admin` and sign in with user `admin` and the value of `SERVICE_PASSWORD_ADMIN` (shown in Coolify's environment variables). This creates the owner account. Then go to **My account** and turn on two-factor sign-in.
8. Open **System health** in the admin panel and work through anything it flags (placeholder phone/email/license, partners, alerts, analytics).

## Updating

Push to the branch and click **Redeploy** (or turn on Coolify's automatic deploy on push). Database changes are applied automatically when the new container starts. The site is briefly unavailable while the new container starts.

When you change the database schema during development:

```bash
npm run db:migrate -- --name short_description   # creates prisma/migrations/<timestamp>_short_description
```

Commit the new migration folder. The server applies it on the next deploy.

## Backups

- The `backup` service writes `vertex-YYYY-MM-DD-HHMM.dump` every 24 hours (change with `BACKUP_EVERY_HOURS`) and keeps 14 days (`BACKUP_KEEP_DAYS`).
- These dumps sit on the same server. **Also copy them off the server.** Either point Coolify's S3 backup storage at them, or run a daily `rsync`/`rclone` of the volume to another machine or bucket. Find the volume path with `docker volume ls | grep backups`.

Restore a backup (overwrites the current database):

```bash
# on the server; container names are shown in Coolify or by `docker ps`
docker exec -it <backup-container> sh
ls /backups
pg_restore --clean --if-exists -d "$PGDATABASE" /backups/vertex-2026-10-01-0300.dump
```

Then restart the app service.

## Running without Coolify

Any server with Docker:

```bash
cp .env.production.example .env      # fill in every empty value
docker compose up -d --build
```

Put a reverse proxy with HTTPS (Caddy, Nginx, Traefik) in front of port 3000. Admin sign-in cookies are HTTPS-only in production.

## Local development

```bash
npm install
cp .env.example .env     # then set ADMIN_PASSWORD and OG_SECRET
npm run db:up            # PostgreSQL in Docker on localhost:5432
npm run db:deploy        # create the tables
npm run dev
```

## Good to know

- **One app container.** Sign-in lockouts and form rate limits are kept in the app's memory, which is correct for one container. To run several app containers, move them to Redis first.
- **Server size.** 2 GB RAM is comfortable (the build needs about 1.5 GB). The app itself uses about 150–250 MB.
- **Changing the domain.** Update `SITE_URL` and the domain in Coolify, then restart. No rebuild needed.
- **TrustedForm.** `NEXT_PUBLIC_TRUSTEDFORM_ENABLED` is built into the browser code, so it needs a redeploy (rebuild) to change.
