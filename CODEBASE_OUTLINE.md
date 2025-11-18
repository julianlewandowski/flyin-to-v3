# Flyin.to Codebase Outline

## 📋 Current State Summary

Your Flyin.to codebase is a **Next.js 15** application with **TypeScript**, **Supabase** for database/auth, and **Vercel AI SDK** for LLM functionality. You have a working flight search system with placeholder data and AI discovery features.

## 🏗️ Project Structure

```
flyin-to-v3/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── flights/[id]/look/    # Airhob fare lookup
│   │   └── holidays/[id]/
│   │       ├── ai-scout/         # AI route discovery
│   │       ├── generate-insights/ # AI insights generation
│   │       ├── search-flights/   # Placeholder flight search (OLD)
│   │       ├── search-flights-unified/ # NEW: Unified pipeline ⭐
│   │       └── verify-flights/   # Verify AI-discovered routes
│   ├── auth/                     # Authentication pages
│   │   ├── login/
│   │   ├── sign-up/
│   │   ├── check-email/
│   │   └── callback/
│   └── dashboard/
│       ├── page.tsx              # Dashboard homepage
│       ├── create/               # Create holiday page
│       └── holidays/[id]/        # Holiday detail page
│
├── components/                   # React Components
│   ├── ui/                       # shadcn/ui components
│   ├── ai-scout-button.tsx
│   ├── create-holiday-form.tsx
│   ├── flight-card.tsx           # Flight display component
│   ├── generate-insights-button.tsx
│   ├── holiday-header.tsx
│   ├── search-flights-button.tsx # Calls OLD endpoint
│   └── verify-flights-button.tsx
│
├── lib/                          # Core Logic
│   ├── types.ts                  # TypeScript types ⭐ (Extended)
│   ├── serpapi.ts                # NEW: SerpApi adapter ⭐
│   ├── normalize-flights.ts      # NEW: Normalization layer ⭐
│   ├── llm-preferences.ts        # NEW: LLM preference extraction ⭐
│   ├── llm-scorer.ts             # NEW: LLM flight scoring ⭐
│   ├── ai-scout.ts               # AI route discovery (existing)
│   ├── airhob-api.ts             # Airhob API integration
│   ├── kiwi-api.ts               # Kiwi API integration
│   └── supabase/                 # Supabase client helpers
│
├── scripts/                      # SQL Migration Scripts
│   ├── 001_create_holidays_table.sql
│   ├── 002_create_flights_table.sql
│   ├── 003_create_ai_insights_table.sql
│   ├── 004_add_placeholder_data.sql
│   └── 005_update_schema_for_ai_airhob.sql
│
└── Documentation/
    ├── ARCHITECTURE.md           # NEW: Architecture overview ⭐
    ├── IMPLEMENTATION.md         # NEW: Implementation guide ⭐
    ├── SETUP.md                  # Updated: Environment setup ⭐
    └── CODEBASE_OUTLINE.md       # This file ⭐
```

## 📊 Database Schema (Supabase)

### `holidays` Table
```sql
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- name (TEXT)
- origin (TEXT)                    # Primary origin airport
- origins (TEXT[])                 # Multiple origins (optional)
- destinations (TEXT[])            # Array of destination airports
- start_date (DATE)
- end_date (DATE)
- budget (DECIMAL)
- trip_duration_min (INTEGER)      # Optional
- trip_duration_max (INTEGER)      # Optional
- preferred_weekdays (TEXT[])      # Optional
- max_layovers (INTEGER)           # Default: 2
- use_ai_discovery (BOOLEAN)       # Enable AI route discovery
- ai_discovery_results (JSONB)     # AI-discovered routes
- last_ai_scan (TIMESTAMPTZ)       # Last AI scan timestamp
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### `flights` Table
```sql
- id (UUID, PK)
- holiday_id (UUID, FK → holidays)
- origin (TEXT)                    # Airport code (IATA)
- destination (TEXT)               # Airport code (IATA)
- departure_date (DATE)
- return_date (DATE, nullable)
- price (DECIMAL)
- old_price (DECIMAL, nullable)    # For price tracking
- airline (TEXT, nullable)
- booking_link (TEXT, nullable)
- source (TEXT)                    # "airhob", "kiwi", "serpapi", etc.
- verified_at (TIMESTAMPTZ, nullable)
- track_id (TEXT, nullable)        # Airhob tracking ID
- fare_id (TEXT, nullable)         # Airhob fare ID
- referral_link (TEXT, nullable)
- baggage_info (JSONB, nullable)
- layovers (INTEGER)               # Number of layovers
- flight_duration (TEXT, nullable) # e.g., "8h 30m"
- last_checked (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
```

### `ai_insights` Table
```sql
- id (UUID, PK)
- holiday_id (UUID, FK → holidays)
- insight_text (TEXT)
- insight_type (TEXT)              # "price_trend", "best_time", "alternative_destination", "general"
- created_at (TIMESTAMPTZ)
```

### `alerts` Table
```sql
- id (UUID, PK)
- holiday_id (UUID, FK → holidays)
- flight_id (UUID, FK → flights)
- old_price (DECIMAL)
- new_price (DECIMAL)
- price_drop_percent (DECIMAL)
- notified (BOOLEAN)
- created_at (TIMESTAMPTZ)
```

## 🔌 Current API Integrations

### 1. **Supabase** (Database & Auth)
- **Purpose**: User authentication and PostgreSQL database
- **Config**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Status**: ✅ Active

### 2. **Airhob API** (`lib/airhob-api.ts`)
- **Purpose**: Flight search and fare lookup
- **Endpoints Used**:
  - `POST /sandboxapi/flights/v2/search` - Search flights
  - `POST /sandboxapi/flights/v2/look` - Lookup fare
- **Config**: `AIRHOB_API_KEY`
- **Status**: ✅ Integrated, used in `verify-flights` endpoint

### 3. **Kiwi API** (`lib/kiwi-api.ts`)
- **Purpose**: Flight search via Tequila Kiwi API
- **Endpoint**: `GET /v2/search`
- **Config**: `KIWI_API_KEY`
- **Status**: ✅ Integrated but not actively used in current flow

### 4. **OpenAI via Vercel AI SDK** (`lib/ai-scout.ts`)
- **Purpose**: AI route discovery
- **Model**: `gpt-4o-mini`
- **Config**: `OPENAI_API_KEY` (or Vercel AI SDK config)
- **Status**: ✅ Active, used in `ai-scout` endpoint

### 5. **SerpApi** (`lib/serpapi.ts`) ⭐ NEW
- **Purpose**: Google Flights search via SerpApi
- **Endpoint**: `GET https://serpapi.com/search`
- **Config**: `SERPAPI_KEY`
- **Status**: ✅ Code added, needs API key setup

## 🔄 Current Workflow

### Existing Flow (Old)
```
1. User creates holiday
   └─> Holiday saved to database

2. User clicks "AI Scout" button
   └─> POST /api/holidays/[id]/ai-scout
       └─> LLM discovers routes (lib/ai-scout.ts)
           └─> Routes saved to holiday.ai_discovery_results

3. User clicks "Verify Flights" button
   └─> POST /api/holidays/[id]/verify-flights
       └─> Airhob API searches each discovered route
           └─> Verified flights saved to flights table

4. User clicks "Search Flights" button
   └─> POST /api/holidays/[id]/search-flights
       └─> Generates placeholder flights (currently)

5. User clicks "Generate Insights"
   └─> POST /api/holidays/[id]/generate-insights
       └─> Creates AI insights based on found flights
```

### New Unified Flow ⭐
```
1. User creates holiday
   └─> Holiday saved to database

2. User clicks "Search Flights (Unified)" button (NEW)
   └─> POST /api/holidays/[id]/search-flights-unified
       ├─> Step 1: Extract preferences (LLM)
       │   └─> lib/llm-preferences.ts
       ├─> Step 2: Search SerpApi in parallel
       │   └─> lib/serpapi.ts
       ├─> Step 3: Normalize results
       │   └─> lib/normalize-flights.ts
       ├─> Step 4: Score offers (LLM)
       │   └─> lib/llm-scorer.ts
       └─> Returns top 10 ranked FlightOffers
```

## 📦 Dependencies

### Core
- **Next.js**: 15.2.4
- **React**: ^19
- **TypeScript**: ^5
- **Supabase**: `@supabase/ssr`, `@supabase/supabase-js`

### AI/LLM
- **Vercel AI SDK**: `ai` (latest)
- **Zod**: 3.25.67 (for schema validation)

### UI
- **shadcn/ui**: Radix UI components
- **Tailwind CSS**: 4.1.9
- **Lucide React**: Icons

## 🎯 What I've Added

### New Files Created ⭐
1. **`lib/types.ts`** (extended)
   - `FlightOffer` schema
   - `FlightPreferences` interface
   - `ScoredFlightOffer` interface
   - SerpApi types

2. **`lib/serpapi.ts`**
   - SerpApi Google Flights adapter
   - Parallel search support
   - Parameter generation from holidays

3. **`lib/normalize-flights.ts`**
   - Converts SerpApi results → `FlightOffer`
   - Provider-agnostic normalization
   - Layover extraction

4. **`lib/llm-preferences.ts`**
   - Extracts structured preferences from natural language
   - Uses `generateObject` with Zod schema
   - Fallback to rule-based extraction

5. **`lib/llm-scorer.ts`**
   - Scores `FlightOffer` against preferences
   - Returns scored offers with reasoning
   - Fallback to rule-based scoring

6. **`app/api/holidays/[id]/search-flights-unified/route.ts`**
   - Unified search endpoint
   - Integrates all three layers
   - Returns top 10 ranked offers

7. **Documentation**
   - `ARCHITECTURE.md` - System design
   - `IMPLEMENTATION.md` - Setup guide
   - `SETUP.md` - Updated environment variables

## ❓ What I Need From You

### 1. **Environment Variables** ⚠️ REQUIRED
Please add to your `.env.local`:

```env
# Required for unified search
SERPAPI_KEY=your_serpapi_key_here        # Get from https://serpapi.com/
OPENAI_API_KEY=your_openai_api_key_here  # Get from https://platform.openai.com/

# Already configured
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
AIRHOB_API_KEY=...  # Optional
KIWI_API_KEY=...    # Optional
```

**Questions:**
- Do you have SerpApi account? (Free tier: 100 searches/month)
- Do you have OpenAI API key configured?
- Are you using Vercel AI SDK with built-in provider config, or explicit `OPENAI_API_KEY`?

### 2. **Frontend Integration** 🤔 OPTIONAL
Currently, the unified search endpoint exists but isn't connected to the UI.

**Options:**
- **A)** Update `components/search-flights-button.tsx` to call `/search-flights-unified` instead of `/search-flights`
- **B)** Create new button component for unified search
- **C)** Add both options (old and new) for A/B testing

**Question:** How would you like to integrate this? Replace old search, add new button, or both?

### 3. **Flight Display** 🤔 OPTIONAL
The new endpoint returns `ScoredFlightOffer[]` with:
- `score` (0-100)
- `reasoning` (explanation)
- `match_details` (budget_match, time_match, etc.)

**Current:** `components/flight-card.tsx` displays basic `Flight` type

**Options:**
- **A)** Update `FlightCard` to handle `ScoredFlightOffer`
- **B)** Create new `ScoredFlightCard` component
- **C)** Display scores/reasoning alongside existing flight cards

**Question:** How would you like to display scored offers in the UI?

### 4. **Database Storage** 🤔 OPTIONAL
Currently, unified search returns offers but doesn't save them to database.

**Options:**
- **A)** Save top offers to `flights` table (requires mapping `FlightOffer` → `Flight`)
- **B)** Store in separate table for scored offers
- **C)** Keep ephemeral (no database storage, just return results)

**Question:** Do you want to save unified search results to database?

### 5. **SerpApi Response Format** ⚠️ NEEDS VERIFICATION
The normalization layer (`lib/normalize-flights.ts`) is based on expected SerpApi response structure, but I haven't tested with real responses.

**What I need:**
- Test the unified endpoint with a real holiday
- Share the actual SerpApi response structure (or error logs)
- I'll update the normalizer to match actual format

**Question:** Can you test the endpoint and share any errors or response structures?

### 6. **Date Range Flexibility** 🤔 OPTIONAL
Currently searches exact dates. Should we:
- Search ±3 days for flexibility?
- Allow user to specify date range in holiday?
- Make it configurable?

**Question:** Do you want flexible date searching?

### 7. **Caching Strategy** 🤔 OPTIONAL
SerpApi has rate limits. Should we:
- Cache results by route/date?
- Use Supabase to store cached results?
- Set TTL (e.g., 24 hours)?

**Question:** Do you want result caching?

### 8. **Cost Management** ⚠️ CONSIDERATION
**SerpApi:**
- Free tier: 100 searches/month
- Paid: ~$50/month for 5,000 searches

**OpenAI:**
- GPT-4o-mini: ~$0.01-0.02 per search (with 20 offers scored)

**Questions:**
- What's your budget for API calls?
- Should we limit scoring to fewer offers?
- Should we implement caching to reduce API calls?

## ✅ What's Ready to Use

### Immediate Next Steps
1. **Add API keys** to `.env.local`
2. **Test the endpoint**: `POST /api/holidays/[id]/search-flights-unified`
3. **Verify SerpApi connection** works
4. **Check LLM responses** for preference extraction and scoring

### Testing Checklist
- [ ] SerpApi key configured and valid
- [ ] OpenAI API key configured and valid
- [ ] Unified endpoint returns response
- [ ] Preferences extracted correctly
- [ ] Offers normalized to FlightOffer
- [ ] Offers scored (0-100 range)
- [ ] Top offers returned in ranked order

## 🚀 Integration Priority

**High Priority (Required):**
1. Environment variables setup
2. Test unified endpoint
3. Fix any SerpApi response format issues

**Medium Priority (Recommended):**
1. Frontend integration (connect button to endpoint)
2. Display scored offers in UI
3. Save results to database

**Low Priority (Nice to Have):**
1. Date range flexibility
2. Result caching
3. Cost optimization

## 📝 Summary

**Current State:**
- ✅ Unified search pipeline code complete
- ✅ All three layers implemented (Retrieval → Normalization → Reasoning)
- ✅ API endpoint created
- ⚠️ Needs API keys setup
- ⚠️ Needs frontend integration
- ⚠️ Needs SerpApi format verification

**What I Need:**
1. Confirmation of API keys setup
2. Decision on frontend integration approach
3. Test results from unified endpoint (to verify SerpApi format)
4. Preferences on optional features (caching, database storage, etc.)

The codebase is ready - you just need to configure the API keys and test it! 🎉

