# Team AgriSense — AgriSense AI

> Autonomous agricultural advisor that takes a Bangladeshi smallholder farmer from an empty field to a costed, weather-aware season plan, and keeps advising through harvest.
>
> Built for **Bdapps Agentic AI Hackathon** at **IUT 12th ICT Fest** (24-hour build, 24–25 July 2026).

---

## What this submission covers

The interface includes a persistent **English / বাংলা** selector. The chosen language controls the application labels, deterministic demo output, validation/fallback messages, and every agent response. The language is sent explicitly with each chat request, so mixed-language conversation history cannot silently override the farmer's selection. Bangla responses retain the same Markdown headings, bullet lists, recommendations, calculations, caveats, and source detail as English responses.

**Tier 0 — Core (all 8 capabilities implemented and demoed end-to-end):**

| # | Capability | Status | Where to see it |
|---|---|---|---|
| 1 | Conversational intake — collects location, farm size, soil type, water source, budget, target season via targeted follow-ups | ✅ | Chat panel; profile card on right |
| 2 | Live weather grounding — calls real Open-Meteo API for the farmer's location, uses returned values in recommendations | ✅ | Trace panel → `get_weather` (real lat/long + 7-day forecast) |
| 3 | Crop recommendation — ranks ≥3 candidate crops with suitability, water need, risk, profit estimate | ✅ | Answer + trace panel → `recommend_crops` |
| 4 | Season plan — dated calendar from land prep to harvest (sowing window, fertilizer timing, irrigation, weed/pest checks, harvest) | ✅ | Answer + trace panel → `get_crop_calendar` |
| 5 | Financial projection — itemized cost breakdown, expected yield, revenue, net profit, ROI, break-even | ✅ | Answer + trace panel → `compute_financials` |
| 6 | Explained reasoning — every recommendation names the inputs (farmer profile + weather + KB chunks) behind it | ✅ | Answer prose; each rationale cites specific data |
| 7 | Knowledge base with RAG — 1000 verified facts from BARI/BWMRI/BRRI/FAO + structured crop catalog; agent retrieves from it before advising | ✅ | Trace panel → `rag_search` returns scored chunks with source URLs; `get_kb_facts_by_crop` returns all facts for one crop |
| 8 | Visible agent trace — UI exposes every tool call, parameters sent, raw return values | ✅ | Right-side "Visible Agent Trace" panel — click any entry to expand |

**Tier 2 — Ambitious:**

| Capability | Status | Where to see it |
|---|---|---|
| Marketplace and supplier comparison | ✅ | Ask where to buy planned inputs, or run the demo; see Suppliers + Trace tabs |
| Current/historical market intelligence and sell/store/wait recommendation | ✅ | Ask about a commodity price or selling decision; see Market + Trace tabs |

---

## Tech stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5 + Tailwind CSS 4 + shadcn/ui
- **Database**: SQLite via Prisma ORM (farmer profile + conversation history + trace entries — provides memory across turns)
- **LLM**: OpenAI GPT-4o via the official `openai` npm package, using native tool-calling (`tools` parameter + `tool_calls` in response)
- **Weather API**: [Open-Meteo](https://open-meteo.com) — free, no API key, geocoding + 7-day forecast for Bangladesh districts
- **RAG**: Custom dependency-free TF-IDF retriever over 1000 verified facts from BARI/BWMRI/BRRI/FAO + ~80 structured crop records (no external embedding API — keeps the demo reliable)
- **Agent loop**: Manual ReAct loop using OpenAI's native `tools` parameter — up to 10 iterations per turn

---

## Architecture

```
Farmer message
     ↓
[Prisma] — load farmer profile + last 20 conversation messages
     ↓
[ReAct loop — up to 10 iterations]
   ↻ LLM emits tool_calls (OpenAI native tool calling)
   ↻ Tool registry dispatches to one of:
       • save_profile         — persists farmer fields to SQLite
       • get_weather          — Open-Meteo geocoding + 7-day forecast
       • rag_search           — TF-IDF retrieval over 1080 chunks (1000 verified + 80 structured)
       • get_kb_facts_by_crop — exhaustive retrieval of all facts for one crop
       • recommend_crops      — scores 3+ crops using profile + weather + KB
       • get_crop_calendar    — dated calendar with weather-aware advisories
       • compute_financials   — itemized per-acre costs + ROI + break-even
       • compare_suppliers    — plan-derived quantities ranked against a seeded mock catalog
       • get_market_price_intelligence — live DAM ticker, official history, deterministic decision math
   ↻ Each tool call persisted to TraceEntry table + surfaced in UI trace panel
   ↻ Tool result fed back as role=tool message
   ↻ LLM either calls more tools or emits final answer
     ↓
[Prisma] — save final answer to conversation history
     ↓
Frontend renders chat reply + trace panel updates
```

---

## Real vs mock data — full disclosure

### Real (live external calls)
- **Weather**: `get_weather` tool calls Open-Meteo's geocoding API (`geocoding-api.open-meteo.com`) and forecast API (`api.open-meteo.com`). Every temperature, rainfall, and wind value shown in the trace and cited in recommendations comes from a real HTTP call. No invented forecasts.
- **Bangladesh geocoding**: We use Open-Meteo's `country=BD` filter plus a small alias map (Bogura→Bogra, Jashore→Jessore, Chattogram→Chittagong, Cumilla→Comilla, etc.) so the geocoder reliably resolves Bangladesh district names.
- **Market intelligence**: `get_market_price_intelligence` reads the live DAM headline ticker and the official DAM Graphical Report. Ticker values stay display-only when DAM does not expose their unit/market scope; the agent never silently feeds them into revenue or sell/store math.

### Curated from public sources (in-app knowledge base)
The knowledge base has two layers:

**Layer 1 — Structured crop catalog** (`src/lib/kb/crops.ts`):
12 Bangladesh crops (rice-Aus/Aman/Boro, wheat, maize, potato, mustard, lentil, jute, tomato, brinjal, chili), 5 soil types, and 6 seasons. Each crop record includes:
- Growth stages with day ranges and key actions (sourced from **BARC Fertilizer Recommendation Guide 2018**, **BRRI Adhunik Dhaner Chash 2023**, **BARI crop-specific cultivation guides**)
- Fertilizer doses in kg/acre (BARC FRG 2018)
- Typical yield ranges in maund/acre (BBS Yearbook of Agricultural Statistics)
- Typical farmgate price ranges in BDT/maund (BBS + DAM market reports)
- Major pests and diseases (DAE extension manuals)
- Risk levels and notes

This produces ~80 retrievable chunks.

**Layer 2 — 1000 verified facts from BARI/BWMRI/BRRI/FAO** (`src/lib/kb/verified_facts.ts`, auto-generated from `AgriSense_Verified_1000.csv`):
- **606 facts from BARI** — variety recommendations, fertilizer schedules, crop calendars, pest/disease management for tomato, onion, potato, brinjal (incl. Bt Brinjal), cabbage, mango, coconut, mustard, mungbean, sweet corn, garlic, groundnut, chia, and more
- **239 facts from BWMRI** — wheat varieties (BARI Gom-25 through BARI Gom-33), BWMRI Hybrid Maize, with yield traits, disease resistance, and release history
- **84 facts from BRRI** — rice varieties and cultivation practices
- **71 facts from FAO + FAO AQUASTAT** — irrigation scheduling, crop water needs, crop coefficients, irrigation depths by soil type

Every fact carries:
- `id` (e.g. `verified_0042`)
- `crop`, `category`, `factName`, `value`, `unit`, `context`
- `sourceInstitution`, `sourceTitle`, `sourceUrl` (real clickable URL to the BARI/BWMRI/BRRI/FAO page)
- `verificationStatus: verified_against_visible_official_source`

Total: **113 unique crops across 74 categories** — covers nearly every agronomic question a Bangladeshi farmer could ask.

**Retriever** (`src/lib/kb/rag.ts`):
- TF-IDF over the combined ~1080-chunk corpus (L2-normalized cosine similarity)
- Light stemming (irrigation→irrigate, sandy→sand, loamy→loam, etc.)
- Crop-name synonym expansion (Aman/T. Aman/T. Aman Rice all match; wheat/gom; potato/alu)
- Source diversity cap (max 3 results per source page so one BARI page doesn't dominate)
- Returns top 8 chunks per query with full source URLs

When the agent retrieves a fact, both the trace panel and the final answer's Sources section include the fact ID + source institution + clickable URL — judges can verify every claim against the original BARI/BWMRI/BRRI/FAO page.

### Estimated (computed, not retrieved)
- **Per-acre costs** in `compute_financials`: input rates (fertilizer per kg, labour per day, diesel per litre, irrigation per event) are current 2024–25 Bangladesh market rates encoded in `INPUT_COSTS`. Per-crop quantities (seed rate, fertilizer dose, labour days, irrigation events) are public-guideline midpoints. The final cost = sum of (quantity × rate) for each line item — math is fully inspectable in the trace panel.
- **Revenue**: yield midpoint × price midpoint from the KB. Both numbers come from the KB and are visible in the rag_search trace.
- **ROI, break-even price, break-even yield**: derived arithmetically from the above. The formulas are explicit in `financials.ts`.

### What is NOT real (limitations to disclose)
- **Supplier commercial data is seeded mock data**: supplier identities, offers, prices, stock, ratings, and delivery times are simulated. Location anchors come from the official DAM market directory, while distance is a district-HQ proxy—not farmer-to-shop route distance. Ranking uses disclosed weights: delivered price 35%, distance 25%, delivery time 20%, rating 15%, stock 5%.
- **DAM ticker scope is incomplete**: the live homepage ticker does not visibly resolve unit, market, or price type. It is shown as a headline snapshot only. A sell/store recommendation requires a verified same-unit current price, specific market, price type, future-price assumption, costs, and storage feasibility.
- **Pest/disease predictions** are based on crop + growth stage + rainfall tolerance — not on a real epidemiological model. The advisories are heuristics grounded in extension manual guidance.
- **bdapps Payment Gateway** (Tier 2, 10 points) is **not implemented** in this Tier 0 build. It would be the next addition after this core is stable.

---

## Setup & run

```bash
# 1. Install deps
bun install   # or npm install

# 2. Configure your OpenAI API key
# Edit .env and set OPENAI_API_KEY to your real key (starts with "sk-...")
# Get one at https://platform.openai.com/api-keys
#
# .env should look like:
#   DATABASE_URL=file:/home/z/my-project/db/custom.db
#   OPENAI_API_KEY=sk-your-real-key-here
#   # OPENAI_MODEL=gpt-4o        # optional override; default is gpt-4o

# 3. Push DB schema (SQLite, file-based)
bun run db:push

# 4. Start dev server
bun run dev
# App runs at http://localhost:3000
```

### Environment
- `.env` contains:
  - `DATABASE_URL` — path to the SQLite file (relative path `file:./db/custom.db` for portability)
  - `OPENAI_API_KEY` — **required** for the agent loop to call GPT-4o
  - `OPENAI_MODEL` — optional; defaults to `gpt-4o`. Use `gpt-4o-mini` for cheaper/faster calls, or `gpt-4-turbo` for older deployments.
- No other API keys required — Open-Meteo is free and keyless.

### ⚠️ If you see `403 Country, region, or territory not supported`

OpenAI blocks API calls from certain countries (including Bangladesh). If you're running this from a restricted region:

1. **Use a VPN** to a supported region (US, UK, Singapore, etc.) before starting the dev server. The OpenAI call happens server-side, so the VPN must be on the machine running `npm run dev`.
2. **Or** deploy to a cloud platform in a supported region (Vercel, Railway, Render) and run the agent there.
3. **Or** swap OpenAI for a different LLM provider available in your region (Anthropic Claude, Google Gemini, local Ollama, etc.) — only `src/lib/agent/loop.ts` needs to change. The tool-calling interface is identical.

If the agent gets a 403, it surfaces the error to the chat UI gracefully — you'll see `⚠️ LLM call failed: 403 ...` in the chat. The fix is to make the OpenAI call originate from a supported region.

---

## Try these demo flows

**0. Demo Plan button (no LLM needed — use this when OpenAI is region-blocked):**
Click the **"Demo Plan"** button in the top-right corner. This runs all 6 tools directly (weather, RAG, recommend_crops, calendar, financials) without calling the LLM, and populates all 4 visualization tabs. Perfect for verifying the UI works without an OpenAI key.

**1. Full plan in one shot (best demo flow):**
> "I have 30 decimal in Jashore, loamy soil, tubewell water, Rabi season, budget 25000 taka. Build me a complete plan."

The agent will: save profile → fetch real weather → RAG search (multiple queries) → rank crops → build calendar → compute financials → synthesize grounded answer. The right panel auto-switches to the **Crops** tab when recommendations are ready, then you can click **Calendar** and **Financials** to see dedicated visualizations.

**2. Two-turn flow (demonstrates memory + adaptability):**
> Turn 1: "I have 50 decimal in Bogura, clay soil, canal water, Aman season, budget 15000 taka. What should I plant?"
> Turn 2: "Yes, please go ahead with that crop and give me the full calendar and financials."

**3. Incomplete info (demonstrates missing-info handling):**
> "I want to plant something this season in Mymensingh."
> The agent should ask for: farm size, soil type, water source, budget, and which season.

## UI layout — 4 visualization tabs on the right

The right panel has 4 tabs that auto-populate as the agent runs its tools:

1. **🌾 Crops tab** — Card per recommended crop showing:
   - Rank (#1 with trophy badge for top pick)
   - Crop name + Bengali name
   - Suitability score (0-100) with progress bar
   - Water need badge (Low/Medium/High)
   - Risk level badge (Low/Medium/High)
   - ROI percentage
   - Revenue/cost/profit per acre
   - Rationale (top 3 reasons citing soil, water, weather, KB)
   - Collapsible KB evidence with fact IDs and source URLs

2. **📅 Calendar tab** — Timeline visualization:
   - Crop name + sowing → harvest dates + total days
   - Weather advisories banner (if any)
   - Vertical timeline with day numbers, dates, stage badges, and actions
   - Advisory callouts (e.g. "⚠ Heavy rain forecast — delay urea 2-3 days")

3. **💰 Financials tab** — Full financial projection:
   - Net profit (farm total) with ROI
   - Summary cards: Total cost / Revenue / ROI
   - Break-even analysis: price per maund + yield per acre
   - Itemized cost breakdown table: every line item (NPK, Urea, TSP, MOP, Gypsum, Zinc, Seed, Labour, Irrigation, Land prep, Pest mgmt) with quantity, rate, total
   - Per-acre and farm-total columns
   - Scenario notes (e.g. "Sowing outside optimal window — yield may drop 10-25%")

4. **🔧 Trace tab** — Every tool call with expandable details:
   - Tool name, timestamp, duration, OK/ERROR badge
   - Parameters sent
   - For rag_search: retrieved facts with scores, crop, category, source URLs (clickable)
   - For get_kb_facts_by_crop: verified facts with fact IDs and source URLs
   - Raw return value (full JSON)

---

## File map

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        — POST endpoint that runs the agent
│   │   ├── demo-plan/route.ts   — GET endpoint that runs tools without LLM (for UI testing)
│   │   ├── rag-test/route.ts    — GET endpoint to test RAG retriever directly
│   │   ├── profile/route.ts     — GET farmer profile + conversation history
│   │   └── trace/route.ts       — GET all tool-call trace entries
│   ├── layout.tsx
│   └── page.tsx                 — Chat UI + visible agent trace + profile card
├── lib/
│   ├── db.ts                    — Prisma client singleton
│   ├── kb/
│   │   ├── crops.ts             — Structured KB (12 crops, 5 soils, 6 seasons, input costs)
│   │   ├── verified_facts.ts    — 1000 verified facts from BARI/BWMRI/BRRI/FAO (auto-generated from CSV)
│   │   └── rag.ts               — TF-IDF retriever (stemming + synonyms + source diversity)
│   └── agent/
│       ├── loop.ts              — ReAct loop (OpenAI native tool calling, 10 iterations max)
│       └── tools/
│           ├── registry.ts      — Tool definitions + executor
│           ├── weather.ts       — Open-Meteo geocoding + forecast
│           ├── recommend.ts     — Crop ranking algorithm
│           ├── financials.ts    — Itemized per-acre cost + ROI + break-even
│           └── calendar.ts      — Dated crop calendar with weather advisories
prisma/
└── schema.prisma                — Farmer, Conversation, TraceEntry models
```

---

## Why this is "agentic" and not a chatbot

The five behaviors judges will look for, and where each is implemented:

1. **Tool use** — `get_weather` makes a real Open-Meteo HTTP call every time. Trace panel proves it: latency 1.5–2 s, raw JSON returned with real lat/long and forecast values.
2. **Multi-step planning** — A single farmer request triggers 5–10 dependent tool calls in sequence (save_profile → get_weather → MULTIPLE rag_search calls with different query angles → recommend_crops → get_crop_calendar → compute_financials → optionally get_kb_facts_by_crop for the chosen crop). Each call's output feeds the next.
3. **Handling missing information** — System prompt enforces 6 required intake fields. If any are missing, the LLM is instructed to ask targeted follow-ups and call `save_profile` for any new info — never to guess.
4. **Memory** — Prisma `Farmer` model persists profile across turns; `Conversation` model keeps message history. Profile card on the right shows what the agent remembers.
5. **Explainability** — System prompt requires every recommendation to cite (a) farmer profile inputs, (b) weather data from `get_weather`, (c) KB chunks from `rag_search`. The Sources section of every final answer lists every source used.

---

## Tier 1 status and remaining production limitations

- **Persistent memory is implemented** for farmer profiles, conversations, active season plans, and scenario runs. Browser localStorage restores the same session after closing/reopening; production authentication would be needed to restore it on another device.
- **Proactive forecast checks are implemented** when a farmer returns with an active plan. The app fetches fresh Open-Meteo data, evaluates verified thresholds, persists the check/alerts, and exposes both raw calls in the trace. A production deployment could additionally invoke the same endpoint from a daily scheduler and push SMS notifications.
- **Fertilizer and irrigation scheduling is implemented** with farm-size scaling only for compatible units, context warnings for alternative AEZ/technology records, organic records when available, and inspectable planning costs.
- **Pest/disease risk is implemented** from growth stage plus real temperature, humidity, and rainfall. Missing inputs remain explicitly insufficient; weather never confirms infestation, and chemical labels must be verified locally.
- **Scenario simulation is implemented** for budget, rainfall, selling price, input price, and sowing-date changes. The result shows changed financial/calendar values and discloses assumptions where a verified yield or water-balance response is unavailable.
- **Tier 2 marketplace is implemented** with deterministic package rounding, stock enforcement, total delivered cost, excess quantity, normalized weighted ranking, and plan-derived input quantities. Every mock field is labeled in both tool output and UI.
- **Tier 2 market intelligence is implemented** with a resilient live DAM ticker reader, official historical monthly series, explicit commodity/subgroup matching, and inspectable sell-now/store-or-wait/monitor formulas. Forecasts are assumptions, never guarantees, and incompatible units or price types are not mixed.
- **bdapps Payment Gateway (Tier 2, 10 points)**: Sandbox CaaS API integration for input purchases. Documentation: https://dev.bdapps.com/API_Documentation/bdapps_tap_api.html
- **Bengali language / voice interaction**: Currently English-only. Would require Bengali system prompt + TTS/ASR (e.g. via OpenAI Audio API or a Bengali-specific service).

---

## License

Built during the 24-hour hackathon window. Uses open-source libraries (Next.js, Prisma, React, shadcn/ui, Tailwind, OpenAI Node SDK). Calls OpenAI's GPT-4o API (requires your own key).

Knowledge base data is curated from publicly available Bangladesh government publications (BARC, DAE, BARI, BBS) under fair use for educational purposes.
