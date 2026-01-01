# Backend Architecture - MIGRATION COMPLETE

## Current State: Unified Next.js Architecture

**Migration completed on 2026-01-01**

The codebase has been consolidated into a **single Next.js application**. All backend functionality has been migrated from the Python FastAPI backend to TypeScript services within the Next.js App Router.

## Architecture Overview

```
frontend/
├── app/api/                      # API Route handlers
│   ├── ai/
│   │   └── discover-destinations/  # AI destination discovery
│   ├── cron/
│   │   └── price-check/           # Daily price tracking cron
│   ├── flights/
│   │   └── [id]/look/             # Flight fare lookup
│   ├── holidays/
│   │   └── [id]/
│   │       ├── ai-scout/          # AI route discovery
│   │       ├── generate-insights/ # AI insights generation
│   │       ├── search-flights-unified/  # Main flight search
│   │       ├── smart-insights/    # Smart insights (price, weather, alternatives)
│   │       └── price-tracking/    # Price tracking enable/disable
│   └── price-alerts/              # Price alert management
├── lib/
│   ├── services/                  # Business logic services
│   │   ├── destination-discovery.ts
│   │   ├── insights.ts
│   │   └── price-tracker.ts
│   ├── serpapi.ts                 # SerpAPI integration
│   ├── normalize-flights.ts       # Flight data normalization
│   ├── ai-scout.ts                # AI route discovery
│   ├── airhob-api.ts              # Airhob fare lookup
│   ├── airports.ts                # Airport code utilities
│   ├── llm-scorer.ts              # LLM flight scoring
│   ├── llm-date-optimizer.ts      # Date optimization
│   └── supabase/                  # Supabase client
└── components/                    # UI components
```

## What Changed

### Services Migrated from Python to TypeScript

| Python Service | TypeScript Equivalent | Location |
|---------------|----------------------|----------|
| `destination_discovery.py` | `destination-discovery.ts` | `lib/services/` |
| `insights.py` | `insights.ts` | `lib/services/` |
| `price_tracker.py` | `price-tracker.ts` | `lib/services/` |
| `serpapi.py` | `serpapi.ts` | `lib/` |
| `normalize.py` | `normalize-flights.ts` | `lib/` |
| `ai_scout.py` | `ai-scout.ts` | `lib/` |
| `airhob.py` | `airhob-api.ts` | `lib/` |
| `airports.py` | `airports.ts` | `lib/` |
| `llm_scorer.py` | `llm-scorer.ts` | `lib/` |

### API Endpoints (All Next.js)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/holidays/{id}/search-flights-unified` | POST | Unified flight search with LLM optimization |
| `/api/holidays/{id}/ai-scout` | POST | AI route discovery |
| `/api/holidays/{id}/smart-insights` | GET | Price analysis, alternatives, weather |
| `/api/holidays/{id}/generate-insights` | POST | Generate AI insights |
| `/api/holidays/{id}/price-tracking/enable` | POST | Enable price tracking |
| `/api/holidays/{id}/price-tracking/disable` | POST | Disable price tracking |
| `/api/ai/discover-destinations` | POST | AI destination discovery |
| `/api/flights/{id}/look` | POST | Fare lookup via Airhob |
| `/api/cron/price-check` | GET | Daily price check cron job |

## Cron Jobs

Daily price tracking cron job configured in `frontend/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/price-check",
      "schedule": "0 8 * * *"
    }
  ]
}
```

## Benefits of Consolidation

1. **Single deployment** - Just Vercel, no separate backend server
2. **Type safety** - End-to-end TypeScript
3. **Simpler development** - One `npm run dev` command
4. **Better DX** - Shared types, no HTTP boundary for internal calls
5. **Cost savings** - No separate backend hosting
6. **Latest implementations** - Optimized flight search pipeline

## Archived Python Backend

The original Python FastAPI backend has been archived to `_archived/backend_archived/` for reference. This code is no longer used but preserved for historical context.

## Environment Variables

Required environment variables for the Next.js app:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# API Keys
OPENAI_API_KEY=
SERPAPI_KEY=
AIRHOB_API_KEY=

# Cron Job Security
CRON_SECRET=

# Optional
NEXT_PUBLIC_DEV_BYPASS_AUTH=  # Set to "1" for dev mode auth bypass
LOG_LEVEL=                     # debug, info, warn, error
```

## Database

Using Supabase (PostgreSQL) with the following main tables:
- `holidays` - User holiday configurations
- `flights` - Flight search results
- `price_drop_alerts` - Price tracking alerts
- `ai_insights` - Generated AI insights

All database access is done through the Supabase client with Row Level Security (RLS) policies for multi-tenant isolation.
