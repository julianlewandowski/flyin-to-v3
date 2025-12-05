# Flight Search Architecture

## Overview

The Flyin.to flight search system uses a two-phase optimization pipeline to dramatically reduce SerpAPI calls while finding the best flight deals. The system intelligently pre-filters date combinations using OpenAI before making expensive SerpAPI queries.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: Date Optimization                    │
│                     (OpenAI Pre-filtering)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Input:                                                          │
│  - Origin airports (one or many)                                │
│  - Destination airports (one or many)                           │
│  - Date range (start_date → end_date)                           │
│  - Trip length range (min_days → max_days)                      │
│  - User preferences (budget, flexibility, airlines, etc.)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  OpenAI Analysis:                                                │
│  - Analyzes pricing patterns across entire date range           │
│  - Considers seasonal trends, holidays, peak seasons            │
│  - Applies mid-week pricing advantages                          │
│  - Factors in user preferences                                  │
│  - Returns MAX 5 optimal date pairs                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Output: Up to 5 optimized date pairs                           │
│  - depart_date, return_date                                     │
│  - confidence score                                             │
│  - reasoning                                                    │
│  - estimated_price (if available)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PHASE 2: SerpAPI Final Search                  │
│              (Only optimized dates are searched)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SerpAPI Calls:                                                  │
│  - ONLY called for optimized date pairs                         │
│  - Maximum 5 calls per search                                   │
│  - Covers all origin-destination combinations                   │
│  - Intelligently distributed across routes                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Results:                                                        │
│  - Aggregated flight offers                                     │
│  - Normalized and scored                                        │
│  - Ranked by price and preferences                              │
│  - Returned to frontend                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Date Optimizer (`frontend/lib/llm-date-optimizer.ts`)

**Purpose**: Pre-filter date combinations to reduce SerpAPI calls.

**Function**: `optimizeFlightDates(input: DateOptimizationInput)`

**Input Parameters**:
- `origin_airports`: Array of origin airport codes
- `destination_airports`: Array of destination airport codes
- `start_date`: Start of date range (YYYY-MM-DD)
- `end_date`: End of date range (YYYY-MM-DD)
- `trip_length_min`: Minimum trip duration in days
- `trip_length_max`: Maximum trip duration in days
- `budget`: Optional budget constraint
- `preferences`: User preferences (budget sensitivity, flexibility, preferred airlines, weekdays)

**Output**: Array of up to 5 optimized date pairs, each containing:
- `depart_date`: Departure date (YYYY-MM-DD)
- `return_date`: Return date (YYYY-MM-DD)
- `estimated_price`: Optional estimated price in EUR
- `confidence`: Confidence score (0-1)
- `reasoning`: Explanation for why this date pair is optimal

**How it works**:
1. Uses OpenAI's GPT-4o-mini to analyze the entire date range
2. Applies knowledge of flight pricing patterns:
   - Mid-week flights (Tue-Thu) are typically 15-30% cheaper
   - Shoulder seasons offer better deals than peak seasons
   - Holidays and school breaks drive prices up
   - Red-eye and early morning flights are typically cheaper
3. Returns the top 5 most promising date pairs
4. Falls back to heuristic generation if OpenAI fails

### 2. Search Parameter Generator

**Function**: `generateSearchParamsWithDates(...)`

**Purpose**: Generate SerpAPI search parameters while respecting the 5-call limit.

**Logic**:
- If total combinations ≤ 5: Search all combinations
- If total combinations > 5: Intelligently select combinations
  - Prioritizes highest priority dates
  - Distributes across different routes
  - Ensures maximum coverage with minimum calls

### 3. Unified Search Route (`frontend/app/api/holidays/[id]/search-flights-unified/route.ts`)

**Endpoint**: `POST /api/holidays/[id]/search-flights-unified`

**Pipeline Steps**:

1. **Authentication & Holiday Fetch**
   - Validates user authentication
   - Fetches holiday data from database

2. **Preference Extraction**
   - Extracts user preferences from holiday data
   - Uses LLM to infer preferences if needed

3. **Date Optimization (Phase 1)**
   - Calls `optimizeFlightDates()` to get max 5 date pairs
   - Uses OpenAI to analyze pricing patterns
   - Filters dates based on trip length constraints

4. **Search Parameter Generation**
   - Generates SerpAPI search parameters
   - Limits to maximum 5 SerpAPI calls
   - Distributes across origin-destination pairs

5. **SerpAPI Search (Phase 2)**
   - Makes parallel SerpAPI calls (max 5)
   - Retrieves flight data for optimized dates only

6. **Normalization**
   - Normalizes flight offers from SerpAPI
   - Standardizes format across providers

7. **Scoring**
   - Scores flight offers using LLM
   - Ranks by price, preferences, and match quality

8. **Database Storage**
   - Saves top flight offers to database
   - Updates holiday search timestamp

## Rules & Constraints

### SerpAPI Call Limits

1. **Maximum Calls**: Never exceed 5 SerpAPI calls per search
2. **Date Optimization First**: SerpAPI is NEVER called until OpenAI has narrowed dates
3. **Per-Search Limit**: The 5-call limit applies to the entire search, not per airport pair
4. **Intelligent Distribution**: When multiple airport pairs exist, calls are distributed across routes

### Date Optimization Rules

1. **Input Requirements**: Must have at least one origin and one destination
2. **Date Range**: All dates must fall within user's specified range
3. **Trip Length**: Return date must be within `min_days` to `max_days` after departure
4. **Output Limit**: Maximum 5 date pairs returned per optimization

### Fallback Behavior

1. **OpenAI Failure**: Falls back to heuristic date generation
2. **No Valid Dates**: Uses manual fallback with mid-week preference
3. **SerpAPI Failure**: Returns error with helpful message

## Cost Optimization

### Before Optimization

**Previous Approach**:
- Could generate 10+ date recommendations
- Multiplied by origin-destination combinations
- Often resulted in 20-50+ SerpAPI calls per search

**Example**: 2 origins × 3 destinations × 10 dates = 60 SerpAPI calls ❌

### After Optimization

**Current Approach**:
- OpenAI optimizes to max 5 date pairs
- Intelligent selection keeps SerpAPI calls ≤ 5
- Same or better results with 90%+ cost reduction

**Example**: Optimized to 5 date pairs, intelligently distributed = 5 SerpAPI calls ✅

### Cost Savings

- **SerpAPI Calls**: Reduced from 20-50+ to maximum 5 (90%+ reduction)
- **Response Time**: Faster due to fewer API calls
- **Quality**: Better results due to intelligent pre-filtering

## Output Format

### Frontend Response

```typescript
{
  success: boolean
  offers: ScoredFlightOffer[]
  preferences: {}
  message: string
  metadata: {
    total_retrieved: number
    total_normalized: number
    total_scored: number
    saved_to_db: number
    search_errors?: Array<{ params: any, error: string }>
  }
  debug?: {
    search_params_count: number  // Should be ≤ 5
    raw_results_count: number
    normalized_count: number
    duration_ms: number
  }
}
```

### Flight Offer Structure

```typescript
{
  id: string
  provider: "serpapi"
  price: {
    total: number
    currency: string
  }
  segments: FlightSegment[]
  layovers: Layover[]
  total_duration_minutes: number
  num_stops: number
  cabin_class: string
  booking_link: string
  score: number
  reasoning: string
  match_details: {}
}
```

## Logging & Observability

The system includes comprehensive logging at each phase:

- `[Unified Search]`: Main pipeline logging
- `[Date Optimizer]`: Phase 1 optimization logging
- `[SerpApi]`: Phase 2 API call logging
- `[Unified Search] STEP X`: Step-by-step pipeline progress

Key metrics logged:
- Number of optimized date pairs
- Number of SerpAPI calls made
- Search parameter count (should be ≤ 5)
- Results retrieved and normalized
- Processing duration

## Future Enhancements

1. **Caching**: Cache optimized dates for similar searches
2. **Batch Processing**: Optimize multiple holidays simultaneously
3. **Price Tracking**: Track price changes over time
4. **Provider Switching**: Add more flight search providers
5. **Real-time Updates**: WebSocket updates for search progress

## Testing

To test the optimization pipeline:

1. Create a holiday with wide date range (e.g., 2 months)
2. Add multiple origins and destinations
3. Call the search endpoint
4. Verify:
   - Only 5 or fewer SerpAPI calls are made
   - Dates are optimized and distributed
   - Results are relevant and well-scored

## Troubleshooting

### Issue: Too many SerpAPI calls

**Solution**: Check that `generateSearchParamsWithDates()` is being called with the max limit parameter and that the limit is enforced.

### Issue: No dates optimized

**Solution**: Check OpenAI API key configuration and fallback date generation.

### Issue: Dates outside range

**Solution**: Validate dates in `optimizeFlightDates()` and ensure trip length constraints are enforced.

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Required for date optimization
- `SERPAPI_KEY`: Required for Phase 2 flight search
- `NEXT_PUBLIC_DEV_BYPASS_AUTH`: Optional dev mode auth bypass

### Constants

- `MAX_SERPAPI_CALLS = 5`: Hard limit on SerpAPI calls per search

## Summary

This architecture dramatically reduces SerpAPI costs by:
1. **Pre-filtering** dates using OpenAI analysis (Phase 1)
2. **Limiting** SerpAPI calls to maximum 5 per search (Phase 2)
3. **Intelligently distributing** searches across routes and dates
4. **Maintaining quality** through smart prioritization

The result is a cost-effective, high-quality flight search system that scales efficiently.

