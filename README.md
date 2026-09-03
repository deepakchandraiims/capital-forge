# Capital Forge

**Train like an analyst. Think like an investor. Decide like a partner.**

Capital Forge is an institutional-style finance training platform for accounting, valuation, financial modeling, investment banking, M&A, private equity/LBOs, venture capital, private credit, public markets, fixed income, derivatives, restructuring, Excel, interviews and investment judgment.

## Current primary build

- Next.js 16 + React 19 + TypeScript
- Institutional responsive dashboard and training UI
- 1,620 seeded parameterized exercises across 20 major finance categories
- Adaptive practice, mastery scoring, confidence tracking and spaced review
- Formula Vault and Windows/Mac Excel Shortcut Vault
- Modeling Gym, Interview Room, Investment Committee and Deal Simulator
- Mistake Journal, Investment Journal, Skill Map and Analytics
- Admin JSON/CSV import path for the larger database phase
- Supabase schema, RLS and auth adapters ready to attach later
- AI grading provider abstraction with credential-free local fallback
- Live-market adapter that does not fabricate current information
- Vercel-ready configuration

## Deployment architecture

The repository contains a compressed source bundle plus `materialize.mjs`. `npm install` reconstructs the full application source tree before type-check/build. This keeps the first clean deployment atomic while the working source remains maintained separately for subsequent pushes.

## Supabase later

Copy `.env.example` into your environment, add Supabase credentials, apply the included migration/seed SQL, and redeploy. Until then Capital Forge works in demo mode with local browser persistence.

## Later database expansion

The platform is deliberately data-driven. Additional question databases can be validated, normalized and imported without rebuilding the product architecture.
