# Capital Forge

**Train like an analyst. Think like an investor. Decide like a partner.**

Capital Forge is an institutional AI finance training platform for PE, IB, VC, private credit, public markets, financial modeling, interviews, live-market judgment and recruiter-ready project sharpening.

## Live app

Production alias:

```text
https://capital-forge-deeps3.vercel.app
```

## Shipped layers

### Phase 1

- Responsive Next.js application with institutional dark finance UI
- Dashboard, practice engine, formula vault, Excel vault, interview room, deal simulator, IC mode, journals and admin import
- 1,620 generated practice exercises across 20 finance categories
- MCQ, numerical, formula, direct recall, interview, model-review and judgment formats

### Phase 2

- Supabase client integration
- Email/password sign-in and account creation UI
- Cloud-load and cloud-save logic for user progress
- Local fallback when Supabase env vars are missing
- RLS-secured schema for profiles, state, attempts, bookmarks and imports

### Phase 3

- AI Coach tab
- `/api/coach` endpoint with OpenAI-compatible provider support and local fallback
- Live Markets tab
- `/api/market` endpoint with source-safe demo mode
- `/api/health` endpoint for deployment checks

### World-Class AI Layer

All 25 advanced modules are now represented inside the app and routed through `/api/lab` with safe demo fallback:

1. Recruiter Mode
2. MD Pressure Room
3. Deal Teardown Library
4. Excel Muscle Memory
5. Financial Model Error Hunter
6. IC Memo Builder
7. Would You Invest Game
8. Live News Question Engine
9. Personal Weakness Graph
10. Interview Bank by Firm
11. Deal Math Speed Trainer
12. Investment Journal AI
13. Pitchbook Simulator
14. LBO Paper Test
15. Private Credit Underwriting
16. Founder Call Simulator
17. Red Flag Detector
18. Cap Table & Dilution Simulator
19. Career Path Engine
20. Portfolio Project Tracker
21. Real Filing Reader
22. AI Mentor Personas
23. Bad Answer Rewriter
24. Case Competition Mode
25. Daily Killer Insight

## API key slots

Add these in Vercel Project Settings → Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
AI_API_URL=https://api.openai.com/v1
AI_API_KEY=
AI_MODEL=gpt-4.1-mini
MARKET_DATA_API_URL=
MARKET_DATA_API_KEY=
NEWS_API_URL=
NEWS_API_KEY=
FILINGS_API_URL=
FILINGS_API_KEY=
RESUME_REVIEW_API_URL=
RESUME_REVIEW_API_KEY=
CAPITAL_FORGE_ADMIN_SECRET=
```

## Safe mode

If keys are missing, Capital Forge does not fake live AI, market, news or filing output. It clearly runs deterministic safe-demo feedback and source-safe simulations.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Validate

```bash
npm run ci:check
```

## Supabase activation

Create a dedicated Supabase project named `capital-forge`, run `supabase/schema.sql`, add the Supabase env vars in Vercel, then redeploy.
