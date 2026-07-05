# Esprey Recipes — one-time setup

The app lives at **recipe.esprey.net**. Same platform as Esprey Tasks: Cloudflare Pages + D1, plus one small worker that makes timers ring your phone. Work through these steps in order — about 20 minutes.

## 1. Push the code to GitHub

In GitHub Desktop: create a new repository from this folder (suggested name `esprey-recipes`), commit, and publish it (keep it **private**).

## 2. Create the database

Cloudflare dashboard → **Storage & Databases → D1 → Create database**. Name it exactly: `esprey-recipes`.

Open the new database's **Console** tab and paste the four `CREATE TABLE` statements from `migrations/001_init.sql` **one at a time**, running each before pasting the next.

Then copy the **Database ID** shown on the database's page and paste it into the chat with Claude — Claude will put it into `timer-worker/wrangler.toml` for you. (Do this before step 5.)

## 3. Create the Pages project

Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the `esprey-recipes` repo.

- Build command: `npm run build`
- Build output directory: `dist`

After the first deploy, go to the project's **Settings**:

**Bindings** (Settings → Bindings → Add):
- D1 database — Variable name `DB`, database `esprey-recipes`

**Variables and Secrets** (Settings → Variables and Secrets, Production):
- `ANTHROPIC_API_KEY` — type **Secret** — your Anthropic API key (same one the tasks app uses)
- `VAPID_PUBLIC_KEY` — type Plaintext — value:
  `BBDttz9srTWK1YgbGasvFDxkHRj-e2L07CL7pJYbE7wxwe1Vjya85ulCmGRf4N0kKVdD00acl8ZIhRVMpTXdjx8`

Then **Deployments → Retry deployment** so the new settings take effect.

## 4. Custom domain + login

- Pages project → **Custom domains → Set up a custom domain** → `recipe.esprey.net`.
- **Cloudflare Access**: add an application for `recipe.esprey.net` with your family's emails on the allow-list — same pattern as tasks.esprey.net.

## 5. Create the timer worker

Dashboard → **Workers & Pages → Create → Worker → Import a repository** → pick the same `esprey-recipes` repo.

- **Root directory**: `timer-worker`  (important — this tells it to build the worker, not the app)
- Deploy command: `npx wrangler deploy`

After it deploys, open the worker → **Settings → Variables and Secrets → Add**:
- `VAPID_PRIVATE_KEY` — type **Secret** — Claude gave you this value in the chat. Never put it in a file.

The worker's schedule (every minute) and its database connection come from `timer-worker/wrangler.toml` automatically — but only after the database ID from step 2 is filled in.

## 6. Phones

On each iPhone: open `recipe.esprey.net` in Safari → log in → Share button → **Add to Home Screen**. Open the app **from the Home Screen icon** and tap **Enable** on the timer-alarms banner. (iPhones only allow notifications for web apps installed on the Home Screen.)

## Out of scope for v1 (agreed — resist the sprawl)

- Photo → pantry inventory (the fridge camera) — v2, the "Cook" screen is already shaped for it
- Kitchen equipment tracking
- Per-person data / separate favourites
- Meal-planning calendar
- Manual recipe entry form (link / photo / invent covers it)
