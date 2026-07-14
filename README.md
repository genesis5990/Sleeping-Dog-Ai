# Sleeping Dog Ai

Quiet intelligence for serious teams. A calm, multi-tenant AI workspace.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · RunPod vLLM**.

## What's inside

- **Marketing landing page** — `/`
- **Auth** — magic link + Google OAuth via Supabase (`/login`, `/auth/callback`)
- **Onboarding** — workspace creation (`/onboarding`)
- **Dashboard** — workspace list + chat entry point (`/dashboard`)
- **Chat** — streaming chat against a RunPod vLLM serverless endpoint (`/dashboard/chat`)
- **Case Files (RAG)** — upload documents per workspace, retrieved automatically into chat context (`/dashboard/case-files`)
- **Postgres + RLS** — `profiles`, `workspaces`, `workspace_members`, `chat_threads`, `chat_messages`, `documents`, `document_chunks`, all workspace-scoped

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
| `RUNPOD_ENDPOINT_ID` | **server only** | Your RunPod serverless endpoint ID (chat) |
| `RUNPOD_API_KEY` | **server only** | RunPod API key (never exposed to the browser) |
| `RUNPOD_MODEL_NAME` | server | Model identifier vLLM is serving (e.g. `meta-llama/Llama-3.1-8B-Instruct`) |
| `RUNPOD_BASE_URL` | server (optional) | Override; defaults to `https://api.runpod.ai/v2/$RUNPOD_ENDPOINT_ID/openai/v1` |
| `RUNPOD_EMBEDDING_ENDPOINT_ID` | **server only** | RunPod serverless endpoint ID serving the embedding model (Case Files / RAG) |
| `RUNPOD_EMBEDDING_API_KEY` | server (optional) | Falls back to `RUNPOD_API_KEY` if unset — set separately only if the embedding endpoint uses a different key |
| `RUNPOD_EMBEDDING_MODEL_NAME` | server (optional) | Defaults to `BAAI/bge-large-en-v1.5`. Must produce 1024-dim vectors, or update the `vector(1024)` column type in the migration if you use a different model |
| `RUNPOD_EMBEDDING_BASE_URL` | server (optional) | Override; defaults to `https://api.runpod.ai/v2/$RUNPOD_EMBEDDING_ENDPOINT_ID/openai/v1` |

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
- `case_files_documents_and_chunks` — `documents` + `document_chunks` (pgvector, HNSW cosine index), RLS via the same `is_workspace_member()` / `is_workspace_admin()` helpers, plus the `match_document_chunks()` RPC used for retrieval
- `case_files_harden_function_search_path` — pins `search_path` on the new functions per the Supabase security linter

## Case Files (RAG)

Documents uploaded at `/dashboard/case-files` are chunked, embedded via the RunPod embedding endpoint, and stored in `document_chunks` with a per-workspace pgvector index. On every chat message, `/api/chat` embeds the user's latest message, retrieves the most similar chunks for that workspace (`match_document_chunks` RPC, RLS-scoped), and injects them into the model's context as a system message with citation markers. Retrieved sources are streamed back in the `done` SSE event and shown as clickable chips under each assistant reply.

Supported source file types today: `.eml` (parsed with `mailparser`), `.pdf` (parsed with `pdf-parse` v2), `.txt`, `.csv`. Extend `lib/rag/extract.ts` to add more (e.g. `.docx`, `.xlsx` for OneDrive files).

The embedding endpoint is a **separate RunPod serverless endpoint** from the chat endpoint — point it at an embedding model (default assumes `BAAI/bge-large-en-v1.5`, 1024 dimensions) served via an OpenAI-compatible `/v1/embeddings` route (vLLM, Infinity, or TEI all work). If you use a model with a different output dimension, update `EMBEDDING_DIMENSIONS` in `lib/embeddings.ts` and the `vector(1024)` column type in the migration to match.

## Architecture notes

- **Cookie-based sessions** via `@supabase/ssr` — middleware refreshes the JWT on every request and gates `/dashboard*` and `/onboarding`.
- **RunPod proxy** at `/api/chat` keeps the API key server-side and relays the OpenAI-compatible SSE stream straight to the browser.
- **RLS everywhere** — every table enforces workspace membership at the database, not the app layer.
