# Capital Forge

**Train like an analyst. Think like an investor. Decide like a partner.**

Capital Forge is an institutional finance training platform for PE, IB, VC, private credit, public markets, financial modeling, interviews and investment judgment.

## Live app

Production alias:

```text
https://capital-forge-deeps3.vercel.app
```

## Phase 1 shipped

- Complete responsive Next.js application, not a static landing page
- Institutional dark finance UI
- Dashboard with Finance Rating, XP, streak, skill heatmap, weakest concepts and role readiness
- Practice engine with filters, hints, confidence scoring, bookmarks and local grading
- 1,620 generated practice exercises across 20 finance categories
- MCQ, numerical, formula, direct recall, interview, model-review and judgment formats
- Formula Vault and Excel Shortcut Vault
- Interview Room, Deal Simulator, IC Mode, Mistake Journal, Investment Journal and Admin import panel
- Vercel-ready config and GitHub Actions CI

## Phase 2 shipped

- Supabase client integration using `@supabase/supabase-js`
- Email/password sign-in and account creation UI
- Cloud-load and cloud-save logic for user progress
- Local fallback when Supabase env vars are missing
- RLS-secured schema for profiles, state, attempts, bookmarks and question imports

## Phase 3 shipped

- AI Coach tab for IC-style answer review
- `/api/coach` endpoint with OpenAI-compatible provider support and local fallback
- Live Markets tab for market-driven training prompts
- `/api/market` endpoint with source-safe demo mode when no market provider is configured
- Backup/export workflow for progress data
- Extended Supabase schema for AI coach reviews, market challenges and learning exports
- Production-readiness checklist for Vercel env vars and database activation

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Validate content

```bash
npm run validate:content
```

Expected result:

```bash
Capital Forge content OK: 20 categories / 1620 questions.
```

## Environment variables

Demo mode works without environment variables. Add these when activating cloud features:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
AI_API_URL=
AI_API_KEY=
AI_MODEL=
MARKET_DATA_API_URL=
MARKET_DATA_API_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Supabase activation

Recommended: create a fresh Supabase project named `capital-forge`. Then run:

```sql
-- contents of supabase/schema.sql
```

After running the schema, add the publishable Supabase URL/key to Vercel and redeploy. The app will then move from local browser storage to cloud persistence after sign-in.

## Current architecture

The project intentionally keeps Phase 3 as a safe hybrid:

- Without keys: complete local demo mode
- With Supabase keys and schema: cloud auth + progress persistence
- With AI provider keys: real AI coaching
- With market provider keys: live market challenge feed

This keeps the app live and usable while advanced integrations are attached progressively.
