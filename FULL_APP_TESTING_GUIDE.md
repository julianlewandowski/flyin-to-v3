# Full App Testing Guide

## Quick Start Checklist

- [ ] Environment variables configured
- [ ] Backend server running (port 8000)
- [ ] Frontend server running (port 3000)
- [ ] Test holiday created
- [ ] Flight search executed
- [ ] Optimization verified

## Step 1: Set Up Environment Variables

### Backend Environment (`.env` in `backend/` directory)

Create `backend/.env`:

```env
# Supabase
SUPABASE_PROJECT_URL=your_supabase_project_url
SUPABASE_DB_URL=your_supabase_db_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# External APIs
SERPAPI_KEY=your_serpapi_key
OPENAI_API_KEY=your_openai_api_key
AIRHOB_API_KEY=your_airhob_key  # Optional

# App settings
DEV_BYPASS_AUTH=True  # For testing without auth
DEBUG=True
```

### Frontend Environment (`.env.local` in `frontend/` directory)

Create `frontend/.env.local`:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# SerpAPI (Required for flight search)
SERPAPI_KEY=your_serpapi_key

# OpenAI (Required for date optimization)
OPENAI_API_KEY=your_openai_api_key

# Backend URL (Optional - only if using Python backend)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Dev mode (Optional)
NEXT_PUBLIC_DEV_BYPASS_AUTH=1
```

## Step 2: Install Dependencies

### Backend Dependencies

```bash
cd backend
python -m venv venv  # If not already created
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Dependencies

```bash
cd frontend
npm install
# or
pnpm install
```

## Step 3: Start Both Servers

You'll need **two terminal windows**:

### Terminal 1: Backend Server

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Verify it's working:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok"}
```

### Terminal 2: Frontend Server

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

### Option B: Direct API Call

```bash
# Get auth token first (if not using dev bypass)
# Then create holiday:
curl -X POST http://localhost:8000/holidays/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
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

### Option B: Direct API Call (Backend)

```bash
curl -X POST http://localhost:8000/holidays/{holiday_id}/search-flights-unified \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Option C: Direct API Call (Frontend Next.js Route)

```bash
curl -X POST http://localhost:3000/api/holidays/{holiday_id}/search-flights-unified \
  -H "Content-Type: application/json"
```

## Step 6: Verify Optimization is Working

### Check Backend Logs (Terminal 1)

Look for these log messages:

```
[Unified Search] STEP 2: Optimizing dates with OpenAI (Phase 1)...
[Date Optimizer] Starting optimization for: {...}
[Date Optimizer] Optimization complete: 5 date pairs identified
[Unified Search] OpenAI optimized to 5 date pairs (max 5 allowed)
[Unified Search] Generated 5 search params (limit: 5)
[Unified Search] STEP 4: Searching SerpApi (Phase 2) with optimized dates...
[Unified Search] Phase 2: Using only 5 optimized date pairs, ensuring max 5 SerpAPI calls
```

**Key indicators:**
- ✅ Should see "Optimization complete: 5 date pairs" (or fewer)
- ✅ Should see "Generated 5 search params (limit: 5)" (or fewer)
- ✅ Should NOT see more than 5 SerpAPI calls

### Check Frontend Logs (Terminal 2)

If using the frontend Next.js route, look for similar logs:

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
- Set `DEV_BYPASS_AUTH=True` in backend `.env`
- Set `NEXT_PUBLIC_DEV_BYPASS_AUTH=1` in frontend `.env.local`
- Or log in through the UI first

#### Issue: Backend not starting
**Solution**:
- Check Python version (should be 3.9+)
- Check virtual environment is activated
- Check all dependencies are installed
- Check port 8000 is not in use

#### Issue: Frontend not starting
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
BACKEND_URL="http://localhost:8000"

echo "Testing flight search optimization..."
echo "Holiday ID: $HOLIDAY_ID"
echo ""

# Test backend endpoint
echo "Testing backend endpoint..."
curl -X POST "$BACKEND_URL/holidays/$HOLIDAY_ID/search-flights-unified" \
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

1. ✅ Set up environment variables (backend `.env` + frontend `.env.local`)
2. ✅ Install dependencies (both backend and frontend)
3. ✅ Start backend server (Terminal 1: `uvicorn app.main:app --reload --port 8000`)
4. ✅ Start frontend server (Terminal 2: `npm run dev`)
5. ✅ Create a test holiday (through UI or API)
6. ✅ Run flight search (through UI or API)
7. ✅ Verify optimization (check logs and response metadata)
8. ✅ Confirm SerpAPI calls ≤ 5

**Success indicators:**
- ✅ Backend logs show "Optimization complete: 5 date pairs"
- ✅ Backend logs show "Generated 5 search params (limit: 5)"
- ✅ Response metadata shows `serpapi_calls: 5` (or fewer)
- ✅ Flight results are returned and saved to database

**If everything works:**
- You should see optimized dates in the logs
- SerpAPI calls should be limited to 5
- Flight results should be relevant and well-scored
- The system should be much more cost-effective!

