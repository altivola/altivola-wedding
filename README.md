# Hari Bersama (altivola-wedding)

Hari Bersama is a wedding invitation builder. Anyone can pick a theme and build an invitation without an account. An account is needed to keep the draft longer than 3 days and to publish it.

- **Builder:** 17 sections (cover, opening, couple, story, little things, events, countdown, gallery, RSVP and wishes, dress code, gift, film, live stream, photobooth, camera, notes, thank you). Each field can be hidden. Sections can be turned off and dragged into a new order. A live phone and desktop preview shows the theme's samples until the couple fills in their own details.
- **Themes:** six themes with their own envelope, illustrations, photo frames and photobooth frame: Kawung Senja, Sawah Pagi, Kartu Pos, Pasar Malam, Untai Melati, Kertas Warna. The opening scenes use painted WebP artwork in `apps/web/public/wedding/themes/`. The envelopes, ornaments and fallback scenery are SVGs in `apps/web/src/invite/themes/`.
- **Guests:** personal links with the guest's name on the cover, up to three events with a per guest choice of which events they see, CSV import and export, WhatsApp messages from a template, and share links for group chats.
- **Replies:** RSVP with party size, a check-in QR for guests who say yes, and wishes that the couple can hide.
- **Check-in:** QR scanning in the browser, name search, walk-ins, and a queue that keeps scans while the venue has no signal.
- **Photobooth:** guests pick a layout and a theme frame, take three shots on their own phone, and add the strip to a shared album.
- **Disposable camera:** each guest gets a roll of 24 shots with no preview. Five film looks. The couple decides when the album opens.

## What's inside

| Part     | Stack                                                                          |
| -------- | ------------------------------------------------------------------------------ |
| API      | Hono + oRPC, runs on Node or Cloudflare Workers                                |
| Database | Postgres, raw SQL with postgres.js, migrations as plain `.sql` files (dbmate)  |
| Auth     | Better Auth from the starter, optional for the invitation flow                 |
| Jobs     | One `jobs.enqueue()` API: pg-boss on Node, Cloudflare Queues on Workers        |
| API docs | Generated from the code, Scalar UI at `/api`                                   |
| Web      | Vite + React + TanStack Router/Query, Tailwind v4 + shadcn/ui, installable PWA |
| Email    | Mailpit locally, Resend in production                                          |
| Tooling  | pnpm + Turborepo, Biome, Vitest + testcontainers, GitHub Actions, Renovate     |

## Quick start

Needs Node 24+, Docker, and corepack (comes with Node).

```sh
corepack enable
pnpm install
cp .env.example .env
docker compose up -d        # Postgres, migrations, Mailpit
pnpm dev                    # API on :3000, web on :5173
```

Open http://localhost:5173. Enter the event details and one guest per line, publish, and open a guest link to test RSVP. The WhatsApp action opens a message ready to share.

If port 5432 is already taken, set `DB_PORT` in `.env` and use the same port in `DATABASE_URL`.

## Invitation music

Each theme has a default song. The Studio also offers the other recordings, an MP3 upload of up to 1.4 MB with a loop start and end, or no music. Guests start the music by opening the envelope and can pause it.

- _Gymnopédie No. 1_ by Erik Satie, [recording by Teknopazzo](https://commons.wikimedia.org/wiki/File:Gymnopedie_No._1..ogg), CC0.
- _Can't Take Our Love Away_ by [Josh Woodward](https://freemusicarchive.org/music/Josh_Woodward/Crawford_Street/JoshWoodward-CrawfordStreet-03-CantTakeOurLoveAway/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- _Thinking of You_ by [Kevin MacLeod](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100637), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Studio sign-in

Drafts started without an account get an edit token that stays in the browser (`localStorage`, key `hb-drafts`) and is sent as the `x-draft-token` header. Unclaimed drafts are removed 3 days after they are created, together with their media. After sign-in, the Studio claims the draft for the account.

To enable sign-in, register the callback with Altivola Auth and set the three `ALTIVOLA_AUTH_*` variables in the API environment. For the configured production origin, the callback is `https://wedding.altivola.workers.dev/api/auth/callback/altivola`. Locally, the email magic link goes to Mailpit.

## Deployment status

The Worker config requires a project-specific Hyperdrive ID, queue, runtime secrets, and a D1 database bound as `WEDDING_MEDIA`. D1 stores every upload (photos, songs, photobooth strips and camera shots) under `m/<media id>`, served at `/api/m/<media id>`. Postgres stores invitations, guests, wishes, albums, and accounts. The Node API stores published media in `.wedding-media` by default. Set `WEDDING_MEDIA_DIR` to a persistent directory when running the Node API outside local development.

Apply the photo schema with `pnpm exec wrangler d1 migrations apply
altivola-wedding-media --remote` from `apps/api` before deploying. Use `--local`
for the local Workers runtime. Keep the account on Workers Free to enforce D1's
free limits. Once those limits are reached, D1 operations fail until quota or
storage becomes available.

Pushes to `main` deploy after CI checks when the repository variable `DEPLOY` is
`cloudflare`. CI reads production configuration from the private Altivola
secrets repository, applies Postgres and D1 migrations, and deploys the
Worker with its runtime secrets.

## Commands

| Command                                   | What it does                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`                                | API and web with hot reload                                             |
| `docker compose up -d`                    | Postgres + migrations + Mailpit                                         |
| `docker compose --profile app up --build` | Everything in Docker, like production, on http://localhost:8080         |
| `pnpm lint` / `pnpm format`               | Biome check / fix                                                       |
| `pnpm typecheck`                          | TypeScript in every package                                             |
| `pnpm test`                               | Integration tests against a real Postgres (needs Docker)                |
| `pnpm build`                              | Build the API bundle and the web app                                    |
| `pnpm openapi`                            | Write `apps/api/openapi.json` (CI fails if it is out of date)           |
| `pnpm --filter @app/server dev:worker`    | Run the API in the local Workers runtime                                |
| `pnpm env:pull`                           | Copy `local.env` from the secrets repo (`../secrets/<name>/`) to `.env` |
| `pnpm secrets:push`                       | Upload `prod.env` from the secrets repo to the Worker as secrets        |

## Layout

```
apps/
  api/            @app/server  Hono host: Node entry (src/node.ts), Workers entry (src/cloudflare/)
  web/            @app/web     Vite SPA + PWA
packages/
  api/            @app/api     oRPC router, Zod schemas, raw SQL, job definitions
  db/             @app/db      postgres.js client, migrations/
  auth/           @app/auth    Better Auth config
  ui/             @app/ui      tokens.css (brand colors)
compose.yaml
```

The web app and the API always share one origin: the Vite proxy in dev, nginx in Docker, Workers routes in production. That is why there is no CORS setup and the session cookie just works.

## Common tasks

**Add an API endpoint.** Add a procedure in `packages/api/src/` (see `notes.ts`), put it in the router in `index.ts`, then run `pnpm openapi`. The web app sees the new types right away.

**Add a migration.** Create `packages/db/migrations/<YYYYMMDDHHMMSS>_<name>.sql` with `-- migrate:up` and `-- migrate:down` sections, then `docker compose up migrate`.

**Write a query.** Use the `sql` tagged template. Values in `${...}` are sent as parameters, so never build SQL by joining strings. Result types are written by hand, so cover the query with an integration test (see `packages/api/test/notes.test.ts`).

**Add a background job.** Add its payload type and handler in `packages/api/src/jobs.ts`, then call `context.jobs.enqueue(name, payload)`.

**Add a UI component.** `cd apps/web && pnpm dlx shadcn@latest add <component>`.

**Change Better Auth plugins.** Run `pnpm --filter @app/auth schema` with the database up, and put the new tables or columns in a new migration.

## Using this template for a new project

1. `gh repo create altivola/altivola-<thing> --template altivola/starter --public --clone`
2. Replace `App` in `apps/web/index.html`, `apps/web/vite.config.ts` (PWA manifest), `apps/web/src/routes/root.tsx`, and `apps/api/src/app.ts` (`openapiInfo`).
3. Replace the Worker name, Hyperdrive id, queue name, and `BETTER_AUTH_URL` in `apps/api/wrangler.jsonc` (see Deploy).
4. Delete the notes example once you have your own feature (procedure, migration, test, page).
5. Pick the license: MIT for libraries and CLIs, AGPL for apps people can self host.
6. Turn on the Renovate GitHub app for the repo.

## Deploy

**Self host:** `docker compose --profile app up --build -d` behind a reverse proxy with HTTPS. Set `BETTER_AUTH_URL` to the public URL and use `MAIL_PROVIDER=resend`.

**Cloudflare (free phase):** one Worker serves both the web app (static assets) and the API, so they share one origin on `workers.dev` with no custom domain. Postgres is Neon, reached through Hyperdrive. Live example: https://starter.altivola.workers.dev

First deploy of a new project, from `apps/api`:

1. `pnpm exec wrangler login`
2. Create a Neon project (region closest to your users) and copy its direct connection string (pooling off).
3. `pnpm exec wrangler hyperdrive create <name>-db --caching-disabled --connection-string="<neon url>"` and put the id in `wrangler.jsonc`. Keep caching off: cached reads return stale sessions and break rate limiting.
4. `pnpm exec wrangler queues create <name>-jobs` and use that name in `wrangler.jsonc`.
5. Run the migrations on Neon:
   `docker run --rm -v "$PWD/../../packages/db/migrations:/migrations:ro" -e DATABASE_URL="<neon url>" ghcr.io/amacneil/dbmate:2 --no-dump-schema --migrations-dir /migrations up`
6. Set `BETTER_AUTH_URL` in `wrangler.jsonc` to `https://<worker name>.<your subdomain>.workers.dev`.
7. `pnpm run deploy` (builds the web app, then `wrangler deploy`).
8. Secrets: put them in `../secrets/<name>/prod.env` (a new `BETTER_AUTH_SECRET`, not the local one, plus the OAuth keys), then `pnpm secrets:push` from the repo root.
9. Add `https://<your url>/api/auth/callback/google` and `.../github` to the OAuth apps.

**Automatic deploys:** after the first deploy, every push to `main` runs the `deploy` job in CI once the checks pass: migrations on Neon, Hyperdrive URL, `wrangler deploy`, then Worker secrets. It reads every value from the private secrets repo, so it needs:

- secret `SECRETS_REPO_TOKEN`: set once on the `altivola` org, shared by every repo (the GitHub token `GH_DEPLOY_TOKEN` from `secrets/ci.env`)
- repo variable `DEPLOY=cloudflare` (a new repo from this template does not deploy until it is set)

Changing `prod.env` in the secrets repo starts the same job.

Sign in stays passwordless (magic link or OAuth) because the free Workers plan allows 10 ms of CPU per request, which password hashing goes over. `MAIL_PROVIDER` is `none` until Resend is set up, which hides the email option.

## Brand

Black, yellow `#FAFB03`, and white. Yellow is only used as a fill behind black text (`highlight` class, primary buttons in dark mode), never as text on white. Tokens live in `packages/ui/tokens.css`.
