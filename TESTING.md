# Testing the Flight Search Pipeline

## Quick Answer

**You do NOT need to run the Python backend server** to test the flight search. The flight search runs as Next.js API routes in the frontend server.

You only need to:
1. Run the **Next.js frontend dev server**
2. Have the required environment variables configured

## Step-by-Step Testing Guide

### 1. Install Dependencies

First, make sure you have Node.js installed (v18+), then install dependencies:

```bash
cd frontend
npm install
```

Or if you're using pnpm (as mentioned in SETUP.md):

```bash
cd frontend
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the **`frontend`** directory (not the root):

```bash
cd frontend
touch .env.local
```

Add these required variables to `frontend/.env.local`:

```env
# Supabase (Required for authentication and database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# SerpAPI (Required for Phase 2 flight search)
SERPAPI_KEY=your_serpapi_key

# OpenAI (Required for Phase 1 date optimization)
OPENAI_API_KEY=your_openai_api_key

# Optional: Dev mode auth bypass (for testing)
NEXT_PUBLIC_DEV_BYPASS_AUTH=1
```

**Getting API Keys:**
- **Supabase**: Get from [supabase.com/dashboard](https://supabase.com/dashboard) → Project Settings → API
- **SerpAPI**: Get from [serpapi.com](https://serpapi.com/) (100 free searches/month)
- **OpenAI**: Get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 3. Start the Development Server

From the `frontend` directory:

```bash
npm run dev
```

Or with pnpm:

```bash
pnpm dev
```

The server will start on `http://localhost:3000` by default.

### 4. Test the Flight Search

#### Option A: Through the Frontend UI

1. Open `http://localhost:3000` in your browser
2. Log in or create an account
3. Create a holiday with:
   - Origin airport(s)
   - Destination airport(s)
   - Date range (e.g., 2 months)
   - Trip duration preferences
4. Click "Search Flights" or "Unified Flight Search"
5. Watch the console logs for the optimization pipeline

#### Option B: Direct API Call (for testing)

You can test the API endpoint directly using curl or a tool like Postman:

```bash
curl -X POST http://localhost:3000/api/holidays/[HOLIDAY_ID]/search-flights-unified \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie-here"
```

Or with dev mode auth bypass enabled:

```bash
curl -X POST http://localhost:3000/api/holidays/[HOLIDAY_ID]/search-flights-unified
```

### 5. Monitor the Pipeline

Watch the terminal where `npm run dev` is running. You should see logs like:

```
[Unified Search] STEP 2: Optimizing dates with OpenAI (Phase 1)...
[Date Optimizer] Starting optimization for: {...}
[Date Optimizer] Optimization complete: 5 date pairs identified
[Unified Search] Generated 5 search parameter sets
[Unified Search] STEP 4: Searching SerpApi (Phase 2) with 5 parameter sets...
```

### 6. Verify the Optimization

Check the logs to confirm:

✅ **Phase 1 (OpenAI)**: Should show optimization of dates
✅ **Phase 2 (SerpAPI)**: Should show exactly 5 or fewer SerpAPI calls
✅ **Results**: Should return optimized flight offers

## What About the Python Backend?

The Python backend (`backend/`) is **NOT needed** for testing the flight search pipeline because:

- The flight search API route is in `frontend/app/api/holidays/[id]/search-flights-unified/route.ts`
- This runs as a Next.js API route (serverless function)
- It handles everything: OpenAI optimization → SerpAPI search → results

The Python backend might be used for other features, but the flight search is fully self-contained in the frontend.

## Troubleshooting

### Issue: "SERPAPI_KEY is not configured"
- Make sure `SERPAPI_KEY` is in `frontend/.env.local`
- Restart the dev server after adding environment variables

### Issue: "OpenAI API key not found"
- Make sure `OPENAI_API_KEY` is in `frontend/.env.local`
- Check that the key starts with `sk-`

### Issue: "Unauthorized" error
- Either log in through the UI first, or
- Set `NEXT_PUBLIC_DEV_BYPASS_AUTH=1` in `.env.local` (dev mode only!)

### Issue: Too many SerpAPI calls
- Check the logs for `[Unified Search] Generated X search parameter sets`
- Should be ≤ 5. If more, check the optimization logic.

### Issue: Server won't start
- Make sure you're in the `frontend` directory
- Check Node.js version: `node --version` (should be 18+)
- Try deleting `node_modules` and `package-lock.json`, then reinstall

## Environment Variables Summary

**Required for Flight Search:**
- ✅ `OPENAI_API_KEY` - For Phase 1 date optimization
- ✅ `SERPAPI_KEY` - For Phase 2 flight search
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - For database/auth
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - For database/auth

**Optional:**
- `NEXT_PUBLIC_DEV_BYPASS_AUTH=1` - Skip auth in dev mode

## Quick Test Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` file created in `frontend/` directory
- [ ] All 4 required environment variables set
- [ ] Dev server running (`npm run dev`)
- [ ] Can access `http://localhost:3000`
- [ ] Created a test holiday with dates
- [ ] Successfully triggered flight search
- [ ] Console shows optimization pipeline logs
- [ ] SerpAPI calls are ≤ 5

## Need Help?

Check the detailed logs in your terminal. The pipeline logs each step:
- `[Unified Search]` - Main pipeline
- `[Date Optimizer]` - Phase 1 optimization
- `[SerpApi]` - Phase 2 search

Look for any errors or warnings in these logs to diagnose issues.

