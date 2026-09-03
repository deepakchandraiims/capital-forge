# Capital Forge

**Train like an analyst. Think like an investor. Decide like a partner.**

Phase 1 is a real Next.js demo-mode application for institutional finance practice. It runs without Supabase credentials and is prepared for Phase 2 persistence.

## Phase 1 shipped

- Complete responsive application, not a static landing page
- Institutional dark finance UI
- Dashboard with Finance Rating, XP, streak, skill heatmap, weakest concepts and role readiness
- Practice engine with filters, hints, confidence scoring, bookmarks and local grading
- 1,620 generated practice exercises across 20 finance categories
- MCQ, numerical, formula, direct recall, interview, model-review and judgment formats
- Daily Workout, Weakness Hunt and Challenge Me modes
- Formula Vault and Excel Shortcut Vault
- Interview Room, Deal Simulator, IC Mode, Mistake Journal, Investment Journal and Admin import panel
- Supabase schema placeholders for Phase 2
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

## Deploy on Vercel

Import this repo into Vercel as a Next.js project. No environment variables are required for Phase 1 demo mode. Supabase variables can be added later for Phase 2.

## Phase 2 hooks

Supabase table architecture lives in `supabase/schema.sql`. The current app stores attempts, mastery, bookmarks, imported questions and journals in localStorage; Phase 2 will swap that storage layer to Supabase while preserving the same product flows.
