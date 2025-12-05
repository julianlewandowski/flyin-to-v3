# Multi-Destination 5-Call Architecture

## Overview

This document describes the new date-selection and SerpAPI-calling strategy for Flyin.to's flight search system. The architecture reliably finds the cheapest flights across multiple destinations while maintaining a strict cap of **5 SerpAPI calls per entire user search**, regardless of the number of destinations entered.

## Key Innovation

**Global Candidate Competition**: Candidates from different destinations now compete for the 5 SerpAPI call slots. This replaces the previous approach where each destination might have its own set of searches.

## Pipeline Structure

```
INPUTS
  ↓
PER-DESTINATION CANDIDATE GENERATION (~5 per destination)
  ↓
MERGE ALL CANDIDATES (master list)
  ↓
OPENAI PATTERN-BASED SCORING (all candidates globally)
  ↓
SELECT TOP 5 GLOBALLY (across all destinations)
  ↓
SERPAPI SEARCH (exactly 5 calls)
  ↓
RESULT AGGREGATION
```

## Detailed Pipeline Stages

### 1. Inputs

User provides:
- **Origin airport(s)**: One primary origin (can expand to multiple in future)
- **Destination airports**: One or more destinations
- **Date range**: `earliest_departure` → `latest_return`
- **Trip length range**: `min_length_days` → `max_length_days`
- **Preferences**: Budget sensitivity, weekday preferences, airline preferences, etc.

### 2. Per-Destination Candidate Generation

**File:** `frontend/lib/anchor-date-generator.ts`

For each destination in the search, generate approximately **5 candidate trip pairs** using an anchor-based strategy.

#### A) Select 3–5 Trip Lengths

Always include:
- `min_length_days`
- `median` length = `floor((min + max) / 2)`
- `max_length_days`

Add 1–2 randomly sampled trip lengths inside the range.

#### B) Generate Departure Date Candidates

For each chosen trip length, compute candidate departure dates using **5 anchor strategies**:

1. **Early Anchor**
   - Start date = `earliest_departure`
   - Ensures earliest possible departure is explored

2. **Mid Anchor**
   - Start date = halfway point of the date range
   - Ensures middle of range is covered

3. **Late Anchor**
   - Start date = `latest_return - trip_length_days`
   - Ensures latest possible departure is explored

4. **Random Sample 1**
   - Random start date inside range
   - Adds exploration diversity

5. **Random Sample 2 (Cheap Weekday Bias)**
   - Random start date with bias toward cheap weekdays (Tue, Wed, Sat)
   - Takes advantage of known day-of-week price patterns

#### C) Create Candidate Pairs

For each departure date candidate:
- Compute `return_date = departure_date + trip_length_days`
- Validate `return_date ≤ latest_return`
- Add candidate pair: `(origin, destination, depart_date, return_date)`

**Result**: ~5 candidates per destination
- 2 destinations → ~10 total candidates
- 3 destinations → ~15 total candidates

### 3. Merge All Destination Candidates

Combine candidate date pairs from ALL destinations into a single master list.

**Example:**
- Destination 1: 5 candidates
- Destination 2: 5 candidates  
- Destination 3: 5 candidates
- **Total**: 15 candidates in master list

### 4. OpenAI Pattern-Based Scoring (Fast + Cheap)

**File:** `frontend/lib/global-candidate-scorer.ts`

Before using SerpAPI, score ALL candidates globally using OpenAI's reasoning abilities.

#### Important Constraint

**OpenAI should NOT estimate actual prices.**

Instead, score candidates based on:

- **Day-of-week cheapness patterns (30%)**
  - Tuesday, Wednesday, Saturday: typically 15-30% cheaper
  - Friday, Sunday: typically most expensive
  - Monday, Thursday: moderate

- **Seasonality & Timing (25%)**
  - Shoulder seasons better than peak
  - Avoid holidays, school breaks
  - Early morning/red-eye flights cheaper

- **Date Range Coverage (15%)**
  - Early anchor = earliest option
  - Mid anchor = middle coverage
  - Late anchor = latest option
  - Value diverse coverage

- **User Preference Alignment (20%)**
  - Preferred weekdays match
  - Avoid weekdays match
  - Budget sensitivity considerations
  - Flexibility level

- **Trip Length Fit (10%)**
  - Matches user preferences
  - Shorter trips may be cheaper if budget-sensitive

#### Scoring Output

Each candidate receives:
- Score: `0.0` to `1.0` (pattern-based, not price estimate)
- Reasoning: Brief explanation of scoring factors

### 5. Select TOP 5 Globally (Critical Step)

**Sort all candidates by score and keep the top 5 globally.**

This is the key innovation:

- ❌ NOT "5 per destination"
- ✅ **5 total across ALL destinations**

Candidates from different destinations now compete for the 5 slots.

**Example:**
- Lisbon: 5 candidates scored (best: 0.85)
- Paris: 5 candidates scored (best: 0.78)
- Barcelona: 5 candidates scored (best: 0.72)

**Top 5 selected globally:**
1. Lisbon candidate (0.85)
2. Lisbon candidate (0.82)
3. Paris candidate (0.78)
4. Lisbon candidate (0.76)
5. Barcelona candidate (0.72)

### 6. SerpAPI Flight Search (Expensive Phase)

**Call SerpAPI ONLY for the top 5 selected candidates.**

- Perform real flight search
- Capture actual pricing
- Score again based on real prices + user preferences
- Rank and store results

**Guarantee**: Maximum 5 SerpAPI calls per entire search, regardless of destination count.

### 7. Result Aggregation

Return structured results to frontend:

```typescript
{
  origin: string
  destination: string
  depart_date: string
  return_date: string
  price: number
  airline_data: object
  serpapi_metadata: object
  score: number
}
```

### 8. AI Thought Stream

During the entire process, emit user-visible "AI thinking" updates.

**File:** `frontend/lib/ai-thought-stream.ts`

#### Allowed Messages

- "Exploring early May departure dates for Lisbon..."
- "Checking which destinations look promising based on day-of-week patterns..."
- "Evaluating trip lengths between 7–14 days..."
- "Comparing all destinations to find the best date combinations..."

#### NOT Allowed

- Internal logs
- Raw model reasoning
- Chain-of-thought
- System messages or tokens

## Implementation Details

### Anchor-Based Date Generation

**File:** `frontend/lib/anchor-date-generator.ts`

#### Key Functions

- `generateCandidatesPerDestination()`: Main entry point
- `selectTripLengths()`: Selects 3-5 trip lengths (min, median, max + random)
- `generateDepartureDatesForTripLength()`: Creates 5 anchor-based departure dates

#### Anchor Types

```typescript
type AnchorType = 
  | "early"        // earliest_departure
  | "mid"          // halfway point
  | "late"         // latest_return - trip_length
  | "random"       // random sample
  | "random_cheap_weekday"  // random with Tue/Wed/Sat bias
```

### Global Candidate Scoring

**File:** `frontend/lib/global-candidate-scorer.ts`

#### Scoring Prompt Strategy

The prompt emphasizes:
1. Pattern-based analysis (NOT price estimation)
2. Day-of-week patterns
3. Seasonality knowledge
4. User preference alignment
5. Date range coverage

#### Scoring Criteria Breakdown

- **Day-of-week patterns**: 30%
- **Seasonality**: 25%
- **Date coverage**: 15%
- **Preferences**: 20%
- **Trip length fit**: 10%

### Search Route Integration

**File:** `frontend/app/api/holidays/[id]/search-flights-unified/route.ts`

#### STEP 2: Candidate Generation & Scoring

1. For each destination: Generate ~5 candidates using anchors
2. Merge all candidates into master list
3. Score all candidates globally with OpenAI
4. Select top 5 globally

#### STEP 3: SerpAPI Search

1. Create search params directly from top 5 candidates
2. Each candidate already has origin, destination, dates
3. Maximum 5 calls enforced

## Example Flow

### Input
- Origin: `NYC`
- Destinations: `["Paris", "Rome", "Barcelona"]`
- Date range: `2025-05-03` → `2025-06-06`
- Trip length: `7-14 days`

### Step 1: Per-Destination Generation

**Paris:**
- Trip lengths: [7, 10, 12, 14] days
- For each length, 5 anchor dates
- Result: ~5 candidates

**Rome:**
- Trip lengths: [7, 10, 12, 14] days  
- For each length, 5 anchor dates
- Result: ~5 candidates

**Barcelona:**
- Trip lengths: [7, 10, 12, 14] days
- For each length, 5 anchor dates
- Result: ~5 candidates

**Total:** ~15 candidates

### Step 2: Global Scoring

All 15 candidates scored by OpenAI:
- Paris candidates: scores 0.85, 0.82, 0.76, 0.71, 0.68
- Rome candidates: scores 0.78, 0.74, 0.69, 0.65, 0.61
- Barcelona candidates: scores 0.72, 0.70, 0.67, 0.64, 0.60

### Step 3: Top 5 Selection

Sorted globally:
1. Paris: 2025-05-06 → 2025-05-13 (score: 0.85)
2. Paris: 2025-05-13 → 2025-05-20 (score: 0.82)
3. Rome: 2025-05-20 → 2025-05-27 (score: 0.78)
4. Paris: 2025-05-27 → 2025-06-03 (score: 0.76)
5. Rome: 2025-05-15 → 2025-05-22 (score: 0.74)

### Step 4: SerpAPI Calls

Only 5 calls:
1. NYC → Paris: 2025-05-06 / 2025-05-13
2. NYC → Paris: 2025-05-13 / 2025-05-20
3. NYC → Rome: 2025-05-20 / 2025-05-27
4. NYC → Paris: 2025-05-27 / 2025-06-03
5. NYC → Rome: 2025-05-15 / 2025-05-22

## Benefits

### 1. Reliability

- Deterministic anchor points ensure coverage
- Random samples add exploration
- Pattern-based scoring uses proven heuristics

### 2. Scalability

- Works with any number of destinations
- Always stays within 5 SerpAPI calls
- Candidates compete globally for slots

### 3. Cost Efficiency

- Maximum 5 SerpAPI calls per search
- OpenAI scoring is fast and cheap
- No wasted API calls on poor candidates

### 4. Coverage

- Early, mid, late anchors guarantee range coverage
- Multiple trip lengths explored
- All destinations considered fairly

### 5. Intelligence

- Pattern-based scoring uses known flight pricing patterns
- User preferences integrated
- Day-of-week optimization

## Comparison: Old vs New

### Old Approach
- Generated candidates globally (15-25)
- Filtered to 5-7
- But didn't consider per-destination structure
- Could miss good options in multi-destination scenarios

### New Approach
- Generates ~5 per destination (ensures destination coverage)
- Merges all candidates
- Scores globally (fair competition)
- Selects top 5 globally (best overall)
- Guaranteed 5 SerpAPI calls maximum

## Configuration

### Candidate Generation

- Candidates per destination: ~5 (may be slightly more)
- Trip lengths selected: 3-5 (min, median, max + 1-2 random)
- Anchor types: 5 (early, mid, late, random, cheap weekday)

### Scoring

- Score range: 0.0 to 1.0
- Criteria weights: Day-of-week (30%), Seasonality (25%), Coverage (15%), Preferences (20%), Trip length (10%)

### SerpAPI Limits

- Maximum calls: 5 (hard limit)
- Enforcement: Top 5 candidates only

## Error Handling

### Candidate Generation Failure

- Falls back to minimal candidates (1-2 per destination)
- Uses average trip length

### OpenAI Scoring Failure

- Falls back to diverse selection
- Ensures at least one per destination
- Prioritizes anchor types (mid > early > late)

### No Valid Candidates

- Generates fallback dates using old method
- Ensures at least one search can proceed

## Performance Considerations

### Timing

- Candidate generation: ~10-50ms per destination (synchronous)
- OpenAI scoring: ~2-5 seconds for all candidates (async)
- SerpAPI search: ~5-15 seconds for 5 calls (parallel)
- Total preprocessing: ~3-6 seconds before SerpAPI

### Memory

- Candidate storage: ~5 per destination × ~200 bytes = ~1KB per destination
- Total for 5 destinations: ~5KB (minimal)

### API Costs

- OpenAI: 1 call per search (cheap, fast)
- SerpAPI: Maximum 5 calls per search (expensive, necessary)

## Future Enhancements

1. **Multiple Origins**: Expand to support multiple origin airports
2. **Learning System**: Track which anchors/dates result in best prices
3. **Real-time Streaming**: Stream AI thoughts as they're generated
4. **Advanced Anchors**: Add more sophisticated anchor strategies
5. **Destination Prioritization**: Weight certain destinations higher
6. **Price History Integration**: Use historical data to inform scoring

## Testing

### Unit Tests

- `generateCandidatesPerDestination()`: Various date ranges, trip lengths
- `selectTripLengths()`: Edge cases (min=max, narrow ranges)
- `generateDepartureDatesForTripLength()`: Anchor generation
- `scoreCandidatesGlobally()`: Mock OpenAI responses

### Integration Tests

- Full pipeline: Generation → Merging → Scoring → Selection → SerpAPI
- Multi-destination scenarios (2, 3, 5 destinations)
- Error handling: Fallbacks work correctly
- Thought collection: Messages properly captured

### Edge Cases

- Single destination
- Very narrow date ranges (< 7 days)
- Very wide trip length ranges (1-30 days)
- No OpenAI API key (fallback mode)
- All candidates score equally

## Files Reference

### Core Implementation

- `frontend/lib/anchor-date-generator.ts` - Per-destination candidate generation
- `frontend/lib/global-candidate-scorer.ts` - Global scoring and top-5 selection
- `frontend/lib/ai-thought-stream.ts` - User-visible thought messages
- `frontend/app/api/holidays/[id]/search-flights-unified/route.ts` - Main search route

### Types

- `AnchoredDateCandidate` - Candidate structure with anchor type
- `ScoredCandidate` - Scored candidate with reasoning

## Summary

The multi-destination 5-call architecture provides:

✅ **Reliable cheapest-date detection** through anchor-based exploration  
✅ **Broad coverage** across entire date range  
✅ **Controlled SerpAPI spending** (≤ 5 calls)  
✅ **Scalable multi-destination support** with global competition  
✅ **User transparency** through AI thought streaming  
✅ **Pattern-based intelligence** without price estimation  

This ensures the system can handle any number of destinations while maintaining strict API cost controls and finding the best flight options.

