# Implementation Guide: Unified Flight Search Pipeline

This guide provides step-by-step instructions for implementing the unified flight search pipeline in Flyin.to.

## Overview

The implementation adds three layers to your existing codebase:

1. **Retrieval Layer**: SerpApi Google Flights integration
2. **Normalization Layer**: Convert raw results to unified `FlightOffer` schema
3. **Reasoning Layer**: LLM-based preference extraction and scoring

## Files Created

### Core Modules

- `lib/types.ts` - Extended with FlightOffer schema and related types
- `lib/serpapi.ts` - SerpApi adapter for Google Flights retrieval
- `lib/normalize-flights.ts` - Normalization layer (SerpApi → FlightOffer)
- `lib/llm-preferences.ts` - LLM preference extraction
- `lib/llm-scorer.ts` - LLM flight scoring

### API Routes

- `app/api/holidays/[id]/search-flights-unified/route.ts` - Unified search endpoint

### Documentation

- `ARCHITECTURE.md` - Architecture overview
- `IMPLEMENTATION.md` - This file

## Setup Steps

### 1. Install Dependencies

The implementation uses existing dependencies (`ai`, `zod`). No new packages needed.

Verify your `package.json` includes:
- `"ai": "latest"` - For LLM functionality
- `"zod": "^3.25.67"` - For schema validation

### 2. Configure Environment Variables

Update `.env.local` (see `SETUP.md` for details):

```env
# Required for unified search
SERPAPI_KEY=your_serpapi_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Existing variables
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. Test the Implementation

#### Test SerpApi Connection

Create a test script or use the API route:

```bash
# Test via API route
curl -X POST http://localhost:3000/api/holidays/[holiday-id]/search-flights-unified \
  -H "Content-Type: application/json"
```

#### Expected Flow

1. User clicks "Search Flights" on a holiday
2. Frontend calls `/api/holidays/[id]/search-flights-unified`
3. Backend:
   - Extracts preferences from holiday
   - Searches SerpApi in parallel
   - Normalizes results
   - Scores offers with LLM
   - Returns top 10 ranked offers

### 4. Integrate with Frontend

#### Option A: Replace Existing Search

Update `components/search-flights-button.tsx`:

```typescript
const response = await fetch(`/api/holidays/${holidayId}/search-flights-unified`, {
  method: "POST",
})
```

#### Option B: Add New Button

Create `components/search-flights-unified-button.tsx`:

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import type { ScoredFlightOffer } from "@/lib/types"

export default function SearchFlightsUnifiedButton({ holidayId }: { holidayId: string }) {
  const [isSearching, setIsSearching] = useState(false)
  const [offers, setOffers] = useState<ScoredFlightOffer[]>([])
  const router = useRouter()

  const handleSearch = async () => {
    setIsSearching(true)
    try {
      const response = await fetch(`/api/holidays/${holidayId}/search-flights-unified`, {
        method: "POST",
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to search flights")
      }

      setOffers(data.offers)
      router.refresh()
    } catch (error) {
      console.error("Search error:", error)
      alert("Failed to search flights")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div>
      <Button onClick={handleSearch} disabled={isSearching}>
        {isSearching ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Searching...
          </>
        ) : (
          "Search Flights (AI)"
        )}
      </Button>
      {/* Display offers */}
    </div>
  )
}
```

### 5. Display Scored Offers

Update your flight display component to show scored offers:

```typescript
import type { ScoredFlightOffer } from "@/lib/types"

function FlightCard({ offer }: { offer: ScoredFlightOffer }) {
  return (
    <div className="border rounded p-4">
      <div className="flex justify-between">
        <div>
          <h3>{offer.segments[0].from.city} → {offer.segments[offer.segments.length - 1].to.city}</h3>
          <p>Score: {offer.score}/100</p>
          <p className="text-sm text-gray-600">{offer.reasoning}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{offer.price.total} {offer.price.currency}</p>
          <a href={offer.booking_link} target="_blank" rel="noopener noreferrer">
            Book
          </a>
        </div>
      </div>
    </div>
  )
}
```

## Testing Checklist

- [ ] SerpApi key is configured and valid
- [ ] OpenAI API key is configured and valid
- [ ] API route returns successful response
- [ ] Preferences are extracted correctly
- [ ] Offers are normalized to FlightOffer schema
- [ ] Offers are scored (0-100 range)
- [ ] Top offers are returned in ranked order
- [ ] Frontend displays offers correctly
- [ ] Error handling works (missing keys, API failures)

## Troubleshooting

### Error: "SERPAPI_KEY is not configured"

- Check `.env.local` exists in project root
- Verify key is named exactly `SERPAPI_KEY`
- Restart dev server after adding key

### Error: "SerpApi error: 401"

- Verify SerpApi key is correct
- Check your SerpApi account has remaining searches
- Ensure key hasn't been revoked

### Error: "Failed to normalize results"

- SerpApi response format may have changed
- Check console logs for actual response structure
- Update `lib/normalize-flights.ts` to match actual format
- See SerpApi documentation: https://serpapi.com/google-flights-api

### Error: LLM timeouts or rate limits

- Reduce `maxOffersToScore` in `search-flights-unified/route.ts`
- Check OpenAI API usage and limits
- Implement retry logic if needed

### No offers returned

- Verify holiday has valid origin/destinations
- Check SerpApi actually has results for that route
- Test SerpApi directly with their dashboard
- Check date range is valid (not too far in past/future)

## Cost Considerations

### SerpApi Costs

- Free tier: 100 searches/month
- Paid plans: $50/month for 5,000 searches
- Each holiday search = 1 search per origin-destination pair

**Recommendation**: Cache results for 24 hours per route/date combination.

### OpenAI Costs

- GPT-4o-mini: ~$0.15 per 1M input tokens, $0.60 per 1M output tokens
- Each preference extraction: ~500 tokens (~$0.0001)
- Each flight scoring: ~1500 tokens (~$0.0003)
- Total per search: ~$0.01-0.02 (20 offers scored)

**Recommendation**: Limit scoring to top 20 offers to control costs.

## Next Steps

1. **Add Caching**: Cache SerpApi results by route/date
2. **Extend Date Ranges**: Search ±3 days for flexibility
3. **Multiple Providers**: Add Duffel/Amadeus in parallel
4. **Save to Database**: Store top offers in `flights` table
5. **User Feedback**: Learn from clicks/bookings to improve scoring

## Migration Path from Existing Search

The new unified search can coexist with existing search:

- Keep `/api/holidays/[id]/search-flights` for Airhob/Kiwi
- Add `/api/holidays/[id]/search-flights-unified` for new pipeline
- Gradually migrate users or use A/B testing

To fully replace:

1. Update frontend to call unified endpoint
2. Remove or deprecate old endpoint
3. Update any cached references

## Support

For issues or questions:

1. Check `ARCHITECTURE.md` for system design
2. Review error logs in console
3. Test each layer independently:
   - SerpApi: Use their dashboard
   - Normalization: Check console logs
   - LLM: Test with simple prompts

