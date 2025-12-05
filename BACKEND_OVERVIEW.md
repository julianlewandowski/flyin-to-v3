# Backend Overview - What Does the Python Backend Do?

## Current State: Duplicate/Parallel Implementation

The codebase currently has **TWO parallel implementations** of the same features:

1. **Python FastAPI Backend** (`backend/`) - Runs on port 8000
2. **Next.js API Routes** (`frontend/app/api/`) - Runs as part of the Next.js server

This appears to be a transitional state where features are being migrated from the Python backend to Next.js API routes.

## What the Python Backend Currently Does

### Core Structure

The backend is a **FastAPI** application that provides REST API endpoints for:

1. **Holiday Management** (`/holidays/*`)
2. **Flight Operations** (`/flights/*`)
3. **Authentication** (Supabase-based)
4. **Health Checks**

### Detailed Endpoints

#### Holiday Management (`/holidays`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/holidays/` | GET | List all holidays for current user |
| `/holidays/` | POST | Create a new holiday |
| `/holidays/{id}` | GET | Get a specific holiday |
| `/holidays/{id}` | PUT | Update a holiday |
| `/holidays/{id}` | DELETE | Delete a holiday |
| `/holidays/{id}/search-flights-unified` | POST | **Search flights (OLD version)** |
| `/holidays/{id}/ai-scout` | POST | **AI route discovery** |
| `/holidays/{id}/generate-insights` | POST | Generate AI insights for flights |

#### Flight Operations (`/flights`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/flights/{id}` | GET | Get a specific flight |
| `/flights/{id}/look` | POST | Lookup/verify flight fare via Airhob API |
| `/flights/holiday/{holiday_id}` | GET | List all flights for a holiday |

#### Utility Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/me` | GET | Get current authenticated user info |

### Backend Services

The backend includes several service modules:

1. **`ai_scout.py`** - AI-powered route discovery and date recommendations
2. **`serpapi.py`** - SerpAPI flight search integration
3. **`airhob.py`** - Airhob API integration for fare lookup
4. **`normalize.py`** - Flight data normalization
5. **`llm_scorer.py`** - LLM-based flight scoring and preference extraction
6. **`airports.py`** - Airport code expansion utilities

### What Makes It Different from Frontend API Routes

#### Python Backend Advantages:
- ✅ Can run as a separate, scalable service
- ✅ Better for CPU-intensive tasks
- ✅ Can be deployed independently
- ✅ Python ecosystem (pandas, numpy, etc.)

#### Current Implementation Issues:
- ❌ **Duplicates functionality** that's now in Next.js API routes
- ❌ **Older flight search** - doesn't have the new optimization pipeline
- ❌ **Additional complexity** - requires running two servers
- ❌ **Auth complexity** - needs to handle Supabase tokens

## Comparison: Backend vs Frontend API Routes

| Feature | Python Backend | Next.js API Routes | Status |
|---------|---------------|-------------------|--------|
| Holiday CRUD | ✅ `/holidays/*` | ❌ (uses Supabase directly) | Backend only |
| Flight Search | ✅ `/holidays/{id}/search-flights-unified` | ✅ `/api/holidays/{id}/search-flights-unified` | **DUPLICATE** |
| AI Scout | ✅ `/holidays/{id}/ai-scout` | ✅ `/api/holidays/{id}/ai-scout` | **DUPLICATE** |
| Generate Insights | ✅ `/holidays/{id}/generate-insights` | ✅ `/api/holidays/{id}/generate-insights` | **DUPLICATE** |
| Flight Fare Lookup | ✅ `/flights/{id}/look` | ❌ | **Backend only** |
| Date Optimization | ❌ (uses old system) | ✅ (NEW optimized pipeline) | **Frontend only** |

## Current Usage in Frontend

Looking at the frontend code, some components **still reference the backend**:

```typescript
// Found in multiple components:
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

// Components that call backend:
- create-holiday-form.tsx
- unified-flight-search-button.tsx
- ai-scout-button.tsx
- generate-insights-button.tsx
- backend.ts (lib)
```

However, the frontend **also has its own API routes** that do the same things:
- `frontend/app/api/holidays/[id]/search-flights-unified/route.ts` ✅ (NEW optimized)
- `frontend/app/api/holidays/[id]/ai-scout/route.ts`
- `frontend/app/api/holidays/[id]/generate-insights/route.ts`

## The Problem: Confusion & Redundancy

**Right now, the frontend can use EITHER:**
1. The Python backend (if `NEXT_PUBLIC_BACKEND_URL` is set)
2. The Next.js API routes (default)

This creates:
- **Code duplication** - same logic in two places
- **Maintenance burden** - updates needed in two places
- **Testing complexity** - need to test both paths
- **Confusion** - unclear which one is actually used

## Recommendations

### Option 1: Remove Python Backend (Recommended for Your Use Case)

Since you've just implemented the optimized flight search in Next.js API routes, you should:

1. ✅ **Keep Next.js API routes** - They're newer, have the optimization, and are simpler
2. ❌ **Deprecate Python backend** - Mark as legacy, remove duplicate endpoints
3. ✅ **Migrate remaining features**:
   - Holiday CRUD → Use Supabase directly (already possible)
   - Flight fare lookup → Add to Next.js API routes if needed
4. ✅ **Update frontend components** - Remove `BACKEND_URL` references, use Next.js routes

**Benefits:**
- Simpler architecture (one server)
- Easier deployment (just Vercel)
- No backend server to manage
- Latest optimizations are available

### Option 2: Keep Both (Hybrid Approach)

Use backend for specific heavy tasks, Next.js for everything else:

1. **Next.js API Routes**:
   - Flight search (with optimization) ✅
   - AI scout ✅
   - Generate insights ✅
   - Holiday CRUD (via Supabase)

2. **Python Backend**:
   - Flight fare verification (Airhob)
   - Heavy data processing
   - Background jobs

**Benefits:**
- Can scale Python backend separately
- Use best tool for each job

**Drawbacks:**
- More complex
- Two servers to manage
- More deployment complexity

### Option 3: Move Everything to Python Backend

Not recommended because:
- You just built the optimized search in Next.js
- Next.js API routes are simpler for this use case
- Vercel deployment is easier

## What You Should Do Next

### Immediate Action:

1. **Check which is actually being used**:
   - Look at your frontend components
   - See if `NEXT_PUBLIC_BACKEND_URL` is set
   - Check browser network tab - which URLs are called?

2. **If using Next.js routes** (likely):
   - ✅ You're good - your optimized search is already in place
   - ❌ Python backend is not needed for testing
   - Consider removing backend references from frontend

3. **If using Python backend**:
   - Need to migrate the optimization pipeline to Python
   - Or update frontend to use Next.js routes instead

### Migration Path (If Removing Backend):

1. Update `create-holiday-form.tsx` - Remove backend calls
2. Update `unified-flight-search-button.tsx` - Use Next.js route
3. Update `ai-scout-button.tsx` - Use Next.js route
4. Update `generate-insights-button.tsx` - Use Next.js route
5. Remove `backend.ts` lib file or repurpose it
6. Mark Python backend as deprecated

## Summary

**The Python backend currently:**
- Provides holiday CRUD operations
- Has an **older version** of flight search (without your new optimization)
- Has AI scout and insights generation (duplicated in Next.js)
- Provides flight fare lookup via Airhob

**But you don't need it to test your new optimization** because:
- Your optimized flight search is in Next.js API routes
- Next.js API routes are self-contained
- They run as part of the frontend server

**The backend is essentially legacy/duplicate code** that could be removed or repurposed, but isn't required for the new flight search pipeline you just built.

