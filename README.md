# Sleeping Dog Ai

Quiet intelligence for serious teams. A calm, multi-tenant AI workspace.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · RunPod vLLM**.

## What's inside

- **Marketing landing page** — `/`
- **Auth** — magic link + Google OAuth via Supabase (`/login`, `/auth/callback`)
- **Onboarding** — workspace creation (`/onboarding`)
- **Dashboard** — workspace list + chat entry point (`/dashboard`)
- **Chat** — streaming chat against a RunPod vLLM serverless endpoint (`/dashboard/chat`)
- **Postgres + RLS** — `profiles`, `workspaces`, `workspace_members`, `chat_threads`, `chat_messages`, all workspace-scoped

## Local development

```bash
cp .env.example .env.local
# Fill in RUNPOD_ENDPOINT_ID, RUNPOD_API_KEY, RUNPOD_MODEL_NAME
npm install
npm run dev          # http://localhost:3000
```

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase publishable key |
| `NEXT_PUBLIC_SITE_URL` | client | Used for OAuth redirect URLs |
| `RUNPOD_ENDPOINT_ID` | **server only** | Your RunPod serverless endpoint ID |
| `RUNPOD_API_KEY` | **server only** | RunPod API key (never exposed to the browser) |
| `RUNPOD_MODEL_NAME` | server | Model identifier vLLM is serving (e.g. `meta-llama/Llama-3.1-8B-Instruct`) |
| `RUNPOD_BASE_URL` | server (optional) | Override; defaults to `https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/openai/v1` |

## Deploy to Fly.io

1. Install [flyctl](https://fly.io/docs/flyctl/install/) and authenticate: `flyctl auth login`.
2. From the project root: `flyctl launch --copy-config --no-deploy` (accept defaults; the included `fly.toml` already names the app `sleeping-dog-ai`).
3. Set RunPod secrets (these never enter the image):
   ```bash
   flyctl secrets set \
     RUNPOD_ENDPOINT_ID=your-endpoint-id \
     RUNPOD_API_KEY=your-runpod-key \
     RUNPOD_MODEL_NAME=meta-llama/Llama-3.1-8B-Instruct
   ```
4. `flyctl deploy`.
5. In the [Supabase Auth URL config](https://supabase.com/dashboard/project/kvwabkhnhskzzibddslw/auth/url-configuration), add `https://sleeping-dog-ai.fly.dev/auth/callback` to **Redirect URLs**.

### Automatic deploys via GitHub Actions

The repo ships with `.github/workflows/deploy.yml`. To enable:

1. `flyctl tokens create deploy -x 999999h --name "github-actions"` → copy the token.
2. In GitHub repo settings → Secrets → Actions, add `FLY_API_TOKEN` with that value.
3. Pushes to `main` will auto-deploy.

## Database schema

Migrations applied to Supabase project `kvwabkhnhskzzibddslw`:

- `init_profiles_workspaces_members_rls` — profiles + workspaces + workspace_members with RLS
- `chat_threads_and_messages` — chat tables, workspace-scoped via `is_workspace_member()` / `is_workspace_admin()`

## Architecture notes

- **Cookie-based sessions** via `@supabase/ssr` — middleware refreshes the JWT on every request and gates `/dashboard*` and `/onboarding`.
- **RunPod proxy** at `/api/chat` keeps the API key server-side and relays the OpenAI-compatible SSE stream straight to the browser.
- **RLS everywhere** — every table enforces workspace membership at the database, not the app layer.
