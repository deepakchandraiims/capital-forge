# Capital Forge

**Train like an analyst. Think like an investor. Decide like a partner.**

Capital Forge is an institutional-style finance training platform for accounting, valuation, financial modeling, investment banking, private equity, venture capital, private credit, capital markets, Excel, interviews and investment judgment.

## Phase 2 status

Phase 2 adds Supabase-ready authentication and cloud persistence while preserving the Phase 1 demo-mode fallback.

### What is live in the app

- Complete responsive Next.js application, not a static landing page
- Institutional dark finance UI
- Dashboard with Finance Rating, XP, streak, skill heatmap, weakest concepts and role readiness
- Practice engine with filters, hints, confidence scoring, bookmarks and local grading
- 1,620 generated practice exercises across 20 finance categories
- MCQ, numerical, formula, direct recall, interview, model-review and judgment formats
- Daily Workout, Weakness Hunt and Challenge Me modes
- Formula Vault and Excel Shortcut Vault
- Interview Room, Deal Simulator, IC Mode, Mistake Journal, Investment Journal and Admin import panel
- Supabase tab with email/password sign-in and account creation
- Automatic local persistence and optional Supabase cloud sync
- RLS-secured Supabase schema for user profiles, full app state, attempts, bookmarks and imports
- Vercel-ready config and GitHub Actions CI

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

## Supabase setup

Create or choose a dedicated Supabase project for Capital Forge, then run:

```sql
-- Supabase SQL editor
-- paste and execute supabase/schema.sql
```

Add these variables to Vercel and `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
NEXT_PUBLIC_ENABLE_DEMO_MODE="true"
```

Do **not** expose `SUPABASE_SERVICE_ROLE_KEY` in the browser. The app only uses public/publishable keys client-side and relies on Supabase Row Level Security to restrict each user's rows.

## Persistence model

The app always keeps a local browser backup. When Supabase is configured and the user signs in, it loads/saves the same state to `public.capital_forge_user_state`. Structured tables for attempts, bookmarks and imports are included in the schema for the next persistence-hardening pass.

## Database expansion

The platform is data-driven. Additional question databases can be validated, normalized and imported without rebuilding the product architecture.
