# Flyin.to Architecture Documentation

## Overview

Flyin.to uses a three-layer architecture for flight search:

1. **Retrieval Layer** - Broad search using SerpApi Google Flights
2. **Normalization Layer** - Convert raw results to unified `FlightOffer` schema
3. **Reasoning Layer** - LLM-based preference extraction and flight scoring

## Architecture Layers

### 1. Retrieval Layer (`lib/serpapi.ts`)

**Purpose**: Collect raw flight data from Google Flights via SerpApi.

**Key Functions**:
- `searchFlights(params)` - Single search
- `searchFlightsParallel(paramsArray)` - Parallel searches for multiple routes/dates
- `generateSearchParams(holiday)` - Generate search parameters from holiday preferences

**Features**:
- Parallel query execution for efficiency
- Handles multiple origins/destinations
- Supports flexible date ranges (can be extended)
- Rate limit aware

**Replacement Strategy**: This layer is designed to be easily replaced with Duffel or Amadeus APIs. Simply create a new adapter file (e.g., `lib/duffel.ts`) following the same interface pattern.

### 2. Normalization Layer (`lib/normalize-flights.ts`)

**Purpose**: Convert provider-specific results into the unified `FlightOffer` schema.

**Key Functions**:
- `normalizeFlightOffer(serpResult)` - Convert single result
- `normalizeFlightOffers(serpResults)` - Convert array of results
- `normalizeSerpApiResponse(response)` - Parse SerpApi response structure

**FlightOffer Schema**:
```typescript
{
  id: string
  provider: string // "serpapi", "airhob", "kiwi", etc.
  price: { total: number, currency: string }
  segments: FlightSegment[]
  layovers: Layover[]
  total_duration_minutes: number
  num_stops: number
  class: string
  booking_link: string
  notes: string[]
}
```

**Why This Matters**: By normalizing all providers to the same schema, the reasoning layer doesn't need to know where the data came from. This makes it trivial to add new providers or switch providers.

### 3. Reasoning Layer

#### 3a. Preference Extraction (`lib/llm-preferences.ts`)

**Purpose**: Extract structured preferences from natural language or holiday configuration.

**Key Functions**:
- `extractPreferences(input)` - Main extraction function
- `extractPreferencesFallback(input)` - Rule-based fallback

**Input**: Natural language text, holiday object, or additional context
**Output**: Structured `FlightPreferences` object

**Example**:
```
Input: "I want cheap flights, prefer morning departures, max 1 layover"
Output: {
  budget: { flexible: true },
  preferred_times: { departure_window: { preferred_hours: [8, 9, 10] } },
  layover_tolerance: { max_layovers: 1 }
}
```

#### 3b. Flight Scoring (`lib/llm-scorer.ts`)

**Purpose**: Evaluate and score flight offers against user preferences.

**Key Functions**:
- `scoreFlightOffer(offer, preferences)` - Score single offer
- `scoreFlightOffers(offers, preferences)` - Batch scoring with parallel processing
- `scoreFlightOfferFallback(offer, preferences)` - Rule-based fallback

**Output**: `ScoredFlightOffer` with:
- `score` (0-100)
- `reasoning` (explanation)
- `match_details` (budget_match, time_match, layover_match, airline_match, overall_fit)

**Scoring Strategy**: Uses LLM to evaluate multiple factors simultaneously, providing nuanced scoring that rule-based systems struggle with.

## API Routes

### Unified Search Endpoint

**Route**: `POST /api/holidays/[id]/search-flights-unified`

**Flow**:
1. Authenticate user
2. Fetch holiday from database
3. Extract preferences (LLM)
4. Generate SerpApi search parameters
5. Execute parallel SerpApi searches
6. Normalize results to FlightOffer
7. Score offers with LLM
8. Return top 10 ranked offers

**Response**:
```typescript
{
  success: true,
  offers: ScoredFlightOffer[],
  preferences: FlightPreferences,
  metadata: {
    total_retrieved: number,
    total_normalized: number,
    total_scored: number
  }
}
```

## Data Flow

```
User Request
    ↓
Holiday (Database)
    ↓
[Preference Extraction] ← LLM
    ↓
[Generate Search Params]
    ↓
[Parallel SerpApi Searches] ← Retrieval Layer
    ↓
[Normalize Results] ← Normalization Layer
    ↓
[Score Offers] ← LLM
    ↓
Ranked FlightOffers
    ↓
Frontend Display
```

## Type System

All types are defined in `lib/types.ts`:

- `FlightOffer` - Unified flight representation
- `FlightPreferences` - User preference constraints
- `ScoredFlightOffer` - FlightOffer + LLM evaluation
- `SerpApiFlightSearchParams` - SerpApi-specific parameters
- `FlightSegment`, `Layover`, `AirportInfo` - Supporting types

## Environment Variables

Required environment variables:

- `SERPAPI_KEY` - SerpApi API key (required for retrieval)
- `OPENAI_API_KEY` - OpenAI API key (required for LLM, or use Vercel AI SDK configuration)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Adding New Providers

To add a new flight provider (e.g., Duffel):

1. **Create Adapter** (`lib/duffel.ts`):
   ```typescript
   export async function searchFlights(params) { /* ... */ }
   export async function searchFlightsParallel(paramsArray) { /* ... */ }
   ```

2. **Extend Normalizer** (`lib/normalize-flights.ts`):
   ```typescript
   export function normalizeDuffelResponse(response) {
     // Convert Duffel format to FlightOffer
   }
   ```

3. **Update API Route**:
   ```typescript
   // Option A: Use in parallel with SerpApi
   const serpapiResults = await searchFlightsParallel(serpParams)
   const duffelResults = await searchFlightsParallel(duffelParams)
   const allResults = [...serpapiResults, ...normalizeDuffelResults(duffelResults)]

   // Option B: Replace SerpApi entirely
   const results = await searchFlightsParallel(duffelParams)
   ```

The normalization layer ensures the rest of the system doesn't need to change.

## Performance Considerations

1. **Parallel Searches**: All searches run in parallel for speed
2. **LLM Rate Limits**: Limit scoring to top N offers (default: 20)
3. **Caching**: Can cache normalized results by search parameters
4. **Batching**: LLM calls are batched when possible

## Error Handling

Each layer has fallback mechanisms:

- **Retrieval**: Returns empty results, logs error, continues with other searches
- **Normalization**: Skips invalid results, logs warnings
- **Preference Extraction**: Falls back to rule-based extraction
- **Scoring**: Falls back to rule-based scoring

## Future Enhancements

1. **Caching Layer**: Cache SerpApi results by route/date
2. **Multiple Providers**: Run searches in parallel across providers
3. **Date Range Expansion**: Automatically search ±3 days for flexibility
4. **Price Tracking**: Store historical prices for trend analysis
5. **User Feedback Loop**: Learn from user selections to improve scoring

