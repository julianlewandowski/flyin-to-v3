# Full App Testing Guide

## Quick Start Checklist

- [ ] Environment variables configured
- [ ] Frontend server running (port 3000)
- [ ] Test holiday created
- [ ] Flight search executed
- [ ] Optimization verified

## Step 1: Set Up Environment Variables

### Frontend Environment (`.env.local` in `frontend/` directory)

Create `frontend/.env.local`:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# SerpAPI (Required for flight search)
SERPAPI_KEY=your_serpapi_key

# OpenAI (Required for date optimization and AI features)
OPENAI_API_KEY=your_openai_api_key

# Airhob (Optional - for fare lookup)
AIRHOB_API_KEY=your_airhob_key

# Cron Job Security (Required for production)
# Generate a random secret: openssl rand -base64 32
# Or use: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
CRON_SECRET=your_cron_secret

# Dev mode (Optional)
NEXT_PUBLIC_DEV_BYPASS_AUTH=1
```

### How to Generate CRON_SECRET

The `CRON_SECRET` is a random string used to secure your cron endpoint. You can generate it using one of these methods:

**Option 1: Using OpenSSL (recommended)**
```bash
openssl rand -base64 32
```

**Option 2: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option 3: Using PowerShell (Windows)**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Option 4: Online generator**
- Visit https://randomkeygen.com/ and use a "CodeIgniter Encryption Keys" generator

**Important Notes:**
- For **local development**: You can skip this or use any random string (it's only checked in production)
- For **production (Vercel)**: 
  1. Generate a secret using one of the methods above
  2. Add it to your Vercel project's environment variables:
     - Go to your Vercel project → Settings → Environment Variables
     - Add `CRON_SECRET` with your generated value
     - Make sure it's set for "Production" environment
  3. Redeploy your application

## Step 2: Install Dependencies

### Frontend Dependencies

```bash
cd frontend
npm install
# or
pnpm install
```

## Step 3: Start the Server

### Frontend Server (Unified Next.js Application)

```bash
cd frontend
npm run dev
# or
pnpm dev
```

**Expected output:**
```
▲ Next.js 15.2.4
- Local:        http://localhost:3000
- Ready in 2.3s
```

**Verify it's working:**
- Open browser to `http://localhost:3000`
- Should see the Flyin.to homepage

## Step 4: Create a Test Holiday

### Option A: Through the UI (Recommended)

1. Open `http://localhost:3000` in your browser
2. Sign up or log in
3. Go to Dashboard
4. Click "Create Holiday" or similar
5. Fill in:
   - **Name**: "Test Holiday"
   - **Origin**: "DUB" (or your preferred airport)
   - **Destinations**: ["BKK", "SIN"] (or your preferred destinations)
   - **Start Date**: A date 2-3 months in the future
   - **End Date**: A date 2-3 months after start date
   - **Trip Duration**: Min 7 days, Max 14 days
   - **Budget**: Optional (e.g., 1000)

6. Save the holiday
7. **Note the Holiday ID** from the URL (e.g., `http://localhost:3000/dashboard/holidays/abc-123-def`)

### Option B: Direct API Call (Next.js API Route)

```bash
# Create holiday via Next.js API route:
curl -X POST http://localhost:3000/api/holidays \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Holiday",
    "origin": "DUB",
    "destinations": ["BKK", "SIN"],
    "start_date": "2025-07-01",
    "end_date": "2025-09-30",
    "trip_duration_min": 7,
    "trip_duration_max": 14,
    "budget": 1000
  }'
```

## Step 5: Test Flight Search

### Option A: Through the UI

1. Go to your holiday page: `http://localhost:3000/dashboard/holidays/{holiday_id}`
2. Click "AI Unified Flight Search" or "Search Flights" button
3. Wait for the search to complete (may take 30-60 seconds)
4. Check the results displayed

### Option B: Direct API Call (Next.js API Route)

```bash
curl -X POST http://localhost:3000/api/holidays/{holiday_id}/search-flights-unified \
  -H "Content-Type: application/json"
```

## Step 6: Verify Optimization is Working

### Check Server Logs

Look for these log messages in your terminal:

```
[Unified Search] STEP 2: Optimizing dates with OpenAI (Phase 1)...
[Date Optimizer] Optimization complete: 5 date pairs identified
[Unified Search] Generated 5 search parameter sets
[Unified Search] STEP 4: Searching SerpApi (Phase 2) with 5 parameter sets...
```

### Check API Response

The response should include optimization metadata:

```json
{
  "success": true,
  "offers": [...],
  "metadata": {
    "serpapi_calls": 5,        // ✅ Should be ≤ 5
    "optimized_dates": 5,      // ✅ Should be ≤ 5
    "total_retrieved": 150,
    "total_normalized": 45,
    "total_scored": 20,
    "saved_to_db": 10
  },
  "debug": {
    "search_params_count": 5   // ✅ Should be ≤ 5
  }
}
```

## Step 7: Verify Results

### What to Check:

1. **SerpAPI Calls**: Should be exactly 5 or fewer
2. **Optimized Dates**: Should be exactly 5 or fewer
3. **Flight Offers**: Should have relevant flight results
4. **Prices**: Should be reasonable for the route
5. **Dates**: Should fall within your specified range
6. **Trip Duration**: Should match your min/max requirements

### Common Issues & Solutions

#### Issue: "SERPAPI_KEY is not configured"
**Solution**: Make sure `SERPAPI_KEY` is in both `.env` files

#### Issue: "OpenAI API key not found"
**Solution**: Make sure `OPENAI_API_KEY` is in both `.env` files

#### Issue: Too many SerpAPI calls (> 5)
**Solution**: 
- Check logs to see if optimization ran
- Verify `generate_search_params_with_limit()` is being called
- Check that the limit is being enforced

#### Issue: No dates optimized
**Solution**:
- Check OpenAI API key is valid
- Check backend logs for OpenAI errors
- Fallback dates should still be generated

#### Issue: "Unauthorized" error
**Solution**:
- Set `NEXT_PUBLIC_DEV_BYPASS_AUTH=1` in frontend `.env.local`
- Or log in through the UI first

#### Issue: Server not starting
**Solution**:
- Check Node.js version (should be 18+)
- Check all dependencies are installed: `npm install`
- Check port 3000 is not in use
- Check `.env.local` file exists

## Step 8: Test Different Scenarios

### Test 1: Single Origin, Single Destination
- Origin: "DUB"
- Destination: "BKK"
- Expected: Should optimize to 5 dates, make 5 SerpAPI calls

### Test 2: Multiple Origins, Multiple Destinations
- Origins: ["DUB", "LHR"]
- Destinations: ["BKK", "SIN", "NRT"]
- Expected: Should intelligently distribute 5 calls across routes

### Test 3: Wide Date Range
- Start: 2 months from now
- End: 4 months from now
- Expected: Should optimize to best dates within range

### Test 4: Narrow Date Range
- Start: 1 week from now
- End: 2 weeks from now
- Expected: Should optimize to fewer dates (as many as fit)

## Step 9: Monitor Costs

### SerpAPI Usage
- Check your SerpAPI dashboard
- Each search should use exactly 5 API calls (or fewer)
- Before optimization: Could use 20-50+ calls
- After optimization: Maximum 5 calls

### OpenAI Usage
- Check your OpenAI dashboard
- Each search uses 1 API call for date optimization
- Cost: ~$0.001-0.01 per search (depending on model)

## Quick Test Script

Save this as `test_search.sh`:

```bash
#!/bin/bash

HOLIDAY_ID="your-holiday-id-here"
API_URL="http://localhost:3000"

echo "Testing flight search optimization..."
echo "Holiday ID: $HOLIDAY_ID"
echo ""

# Test Next.js API endpoint
echo "Testing Next.js API endpoint..."
curl -X POST "$API_URL/api/holidays/$HOLIDAY_ID/search-flights-unified" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  | jq '.metadata | {serpapi_calls, optimized_dates, total_retrieved}'

echo ""
echo "Check the logs above for optimization details!"
```

Run it:
```bash
chmod +x test_search.sh
./test_search.sh
```

## Summary

**To test the full app:**

1. ✅ Set up environment variables (frontend `.env.local`)
2. ✅ Install dependencies (`npm install` in `frontend/`)
3. ✅ Start Next.js server (`npm run dev` in `frontend/`)
4. ✅ Create a test holiday (through UI or API)
5. ✅ Run flight search (through UI or API)
6. ✅ Verify optimization (check logs and response metadata)
7. ✅ Confirm SerpAPI calls ≤ 5

**Success indicators:**
- ✅ Server logs show "Optimization complete: 5 date pairs"
- ✅ Server logs show "Generated 5 search params (limit: 5)"
- ✅ Response metadata shows `serpapi_calls: 5` (or fewer)
- ✅ Flight results are returned and saved to database

**If everything works:**
- You should see optimized dates in the logs
- SerpAPI calls should be limited to 5
- Flight results should be relevant and well-scored
- The system should be much more cost-effective!

