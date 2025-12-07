"""Holiday routes - CRUD and flight search operations."""
from datetime import datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from ..core.auth import User, get_current_user, get_optional_user
from ..core.database import get_db
from ..core.config import get_settings
from ..schemas.flight import SearchFlightsResponse
from ..services import serpapi, normalize, ai_scout, llm_scorer, airports, date_optimizer, insights

router = APIRouter(prefix="/holidays", tags=["holidays"])
settings = get_settings()


@router.get("/", response_model=list[dict])
async def list_holidays(
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """List all holidays for the current user."""
    response = db.table("holidays").select("*").eq("user_id", current_user.id).order("created_at", desc=True).execute()
    return response.data


@router.post("/", response_model=dict)
async def create_holiday(
    holiday_data: dict,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Create a new holiday."""
    # Add user_id to the holiday data
    holiday_data["user_id"] = current_user.id
    holiday_data["created_at"] = datetime.utcnow().isoformat()
    holiday_data["updated_at"] = datetime.utcnow().isoformat()
    
    response = db.table("holidays").insert(holiday_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to create holiday")
    
    return response.data[0]


@router.put("/{holiday_id}", response_model=dict)
async def update_holiday(
    holiday_id: str,
    holiday_data: dict,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Update an existing holiday."""
    # Check if holiday exists and belongs to user
    existing = db.table("holidays").select("id").eq("id", holiday_id).eq("user_id", current_user.id).execute()
    
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    # Update
    holiday_data["updated_at"] = datetime.utcnow().isoformat()
    
    # Remove fields that shouldn't be updated
    holiday_data.pop("id", None)
    holiday_data.pop("user_id", None)
    holiday_data.pop("created_at", None)
    
    response = db.table("holidays").update(holiday_data).eq("id", holiday_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to update holiday")
    
    return response.data[0]


@router.delete("/{holiday_id}")
async def delete_holiday(
    holiday_id: str,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Delete a holiday."""
    # Check if holiday exists and belongs to user
    existing = db.table("holidays").select("id").eq("id", holiday_id).eq("user_id", current_user.id).execute()
    
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    # Delete associated flights first
    db.table("flights").delete().eq("holiday_id", holiday_id).execute()
    
    # Delete the holiday
    db.table("holidays").delete().eq("id", holiday_id).execute()
    
    return {"message": "Holiday deleted successfully"}


@router.get("/{holiday_id}")
async def get_holiday(
    holiday_id: str,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Get a specific holiday."""
    response = db.table("holidays").select("*").eq("id", holiday_id).eq("user_id", current_user.id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    return response.data[0]


@router.post("/{holiday_id}/search-flights-unified")
async def search_flights_unified(
    holiday_id: str,
    user: User | None = Depends(get_optional_user),
    db: Client = Depends(get_db),
):
    """Unified flight search: Retrieval → Normalization → Scoring."""
    print(f"[Unified Search] Starting for holiday {holiday_id}")
    
    # Check API key
    if not settings.SERPAPI_KEY:
        raise HTTPException(status_code=500, detail="SERPAPI_KEY not configured")
    
    # Fetch holiday
    query = db.table("holidays").select("*").eq("id", holiday_id)
    if user and not settings.DEV_BYPASS_AUTH:
        query = query.eq("user_id", user.id)
    
    response = query.execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    holiday = response.data[0]
    
    # Validate dates
    if not holiday.get("start_date") or not holiday.get("end_date"):
        raise HTTPException(status_code=400, detail="Holiday missing dates")
    
    # Collect origins
    origins = []
    if holiday.get("origins"):
        origins.extend(holiday["origins"])
    elif holiday.get("origin"):
        origins.append(holiday["origin"])
    
    if not origins:
        raise HTTPException(status_code=400, detail="No origins specified")
    
    # Expand city codes to airports
    expanded_origins = airports.expand_airports(origins)
    expanded_destinations = airports.expand_airports(holiday.get("destinations") or [])
    
    if not expanded_destinations:
        raise HTTPException(status_code=400, detail="No destinations specified")
    
    # Step 1: Extract preferences
    holiday_dict = {
        "name": holiday.get("name"),
        "origin": holiday.get("origin"),
        "origins": holiday.get("origins"),
        "destinations": holiday.get("destinations"),
        "start_date": holiday.get("start_date"),
        "end_date": holiday.get("end_date"),
        "budget": holiday.get("budget"),
        "trip_duration_min": holiday.get("trip_duration_min"),
        "trip_duration_max": holiday.get("trip_duration_max"),
        "preferred_weekdays": holiday.get("preferred_weekdays"),
        "max_layovers": holiday.get("max_layovers"),
    }
    
    preferences = await llm_scorer.extract_preferences(holiday_dict)
    
    # Step 2: Optimize dates using OpenAI (Phase 1 - Pre-filter to max 5 dates)
    print("[Unified Search] STEP 2: Optimizing dates with OpenAI (Phase 1)...")
    
    trip_duration_min = holiday.get("trip_duration_min") or 3
    trip_duration_max = holiday.get("trip_duration_max") or 14
    
    optimized_date_pairs = await date_optimizer.optimize_flight_dates(
        origin_airports=expanded_origins,
        destination_airports=expanded_destinations,
        start_date=holiday["start_date"],
        end_date=holiday["end_date"],
        trip_length_min=trip_duration_min,
        trip_length_max=trip_duration_max,
        budget=holiday.get("budget"),
        preferences={
            "budget_sensitivity": "high" if holiday.get("budget") else "medium",
            "flexibility": "moderate",
            "preferred_weekdays": holiday.get("preferred_weekdays"),
        },
    )
    
    if not optimized_date_pairs:
        raise HTTPException(status_code=400, detail="Could not optimize dates")
    
    print(f"[Unified Search] OpenAI optimized to {len(optimized_date_pairs)} date pairs (max 5 allowed)")
    
    # Convert to format expected by generate_search_params
    date_recs = [
        {
            "outbound_date": pair["depart_date"],
            "return_date": pair["return_date"],
            "reasoning": pair.get("reasoning", "Optimized date"),
            "priority": int(pair.get("confidence", 0.5) * 10),
        }
        for pair in optimized_date_pairs
    ]
    
    # Step 3: Generate search params (with 5-call limit enforcement)
    MAX_SERPAPI_CALLS = 5
    search_params = serpapi.generate_search_params_with_limit(
        origins=expanded_origins,
        destinations=expanded_destinations,
        date_recommendations=date_recs,
        max_calls=MAX_SERPAPI_CALLS,
    )
    
    print(f"[Unified Search] Generated {len(search_params)} search params (limit: {MAX_SERPAPI_CALLS})")
    
    # Enforce limit - take only the first MAX_SERPAPI_CALLS
    if len(search_params) > MAX_SERPAPI_CALLS:
        print(f"[Unified Search] WARNING: Generated {len(search_params)} params but limit is {MAX_SERPAPI_CALLS}. Truncating.")
        search_params = search_params[:MAX_SERPAPI_CALLS]
    
    # Step 4: Search SerpApi (Phase 2 - Only optimized dates)
    print("[Unified Search] STEP 4: Searching SerpApi (Phase 2) with optimized dates...")
    print(f"[Unified Search] Phase 2: Using only {len(search_params)} optimized date pairs, ensuring max {MAX_SERPAPI_CALLS} SerpAPI calls")
    
    search_results = await serpapi.search_flights_parallel(search_params)
    
    # Collect raw flights
    all_raw_flights = []
    errors = []
    
    for res in search_results:
        if res.get("error"):
            errors.append(res)
            continue
        if res.get("result"):
            flights = normalize.extract_flights_from_serpapi_response(res["result"])
            all_raw_flights.extend(flights)
    
    print(f"[Unified Search] Retrieved {len(all_raw_flights)} raw flights")
    
    # Step 5: Normalize
    normalized = normalize.normalize_flight_offers(all_raw_flights, "serpapi", "EUR")
    print(f"[Unified Search] Normalized {len(normalized)} offers")
    
    if not normalized:
        return {
            "success": False,
            "offers": [],
            "preferences": preferences,
            "message": "No flights found",
            "metadata": {"errors": len(errors)},
        }
    
    # Step 6: Score with LLM
    scored = await llm_scorer.score_flight_offers(normalized[:20], preferences)
    top_offers = scored[:10]
    
    # Step 7: Save to database
    # Delete old flights
    db.table("flights").delete().eq("holiday_id", holiday_id).execute()
    
    # Insert new flights
    for offer in top_offers:
        if offer.get("segments"):
            first_seg = offer["segments"][0]
            last_seg = offer["segments"][-1]
            
            flight_data = {
                "holiday_id": holiday_id,
                "origin": first_seg["from_airport"]["code"],
                "destination": last_seg["to_airport"]["code"],
                "departure_date": first_seg.get("departure", "")[:10] if first_seg.get("departure") else holiday["start_date"],
                "return_date": last_seg.get("arrival", "")[:10] if last_seg.get("arrival") else holiday["end_date"],
                "price": offer["price"]["total"],
                "airline": first_seg["airline"]["name"],
                "booking_link": offer.get("booking_link"),
                "last_checked": datetime.utcnow().isoformat(),
            }
            db.table("flights").insert(flight_data).execute()
    
    # Update holiday timestamp
    db.table("holidays").update({"updated_at": datetime.utcnow().isoformat()}).eq("id", holiday_id).execute()
    
    return {
        "success": True,
        "offers": top_offers,
        "preferences": preferences,
        "message": f"Found {len(top_offers)} best-matching flights",
        "metadata": {
            "total_retrieved": len(all_raw_flights),
            "total_normalized": len(normalized),
            "total_scored": len(scored),
            "saved_to_db": len(top_offers),
            "serpapi_calls": len(search_params),
            "optimized_dates": len(optimized_date_pairs),
        },
        "debug": {
            "search_params_count": len(search_params),
            "raw_results_count": len(all_raw_flights),
            "normalized_count": len(normalized),
        },
    }


@router.post("/{holiday_id}/ai-scout")
async def ai_scout_routes(
    holiday_id: str,
    user: User | None = Depends(get_optional_user),
    db: Client = Depends(get_db),
):
    """Run AI route discovery for a holiday."""
    # Fetch holiday
    query = db.table("holidays").select("*").eq("id", holiday_id)
    if user and not settings.DEV_BYPASS_AUTH:
        query = query.eq("user_id", user.id)
    
    response = query.execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    holiday = response.data[0]
    
    # Check if recently scanned
    if holiday.get("last_ai_scan"):
        from datetime import datetime
        last_scan = datetime.fromisoformat(holiday["last_ai_scan"].replace("Z", "+00:00"))
        hours_since = (datetime.utcnow().replace(tzinfo=last_scan.tzinfo) - last_scan).total_seconds() / 3600
        if hours_since < 24:
            return {
                "message": "AI scan already performed recently",
                "results": holiday.get("ai_discovery_results") or [],
                "cached": True,
            }
    
    # Run AI discovery
    origins = holiday.get("origins") or ([holiday.get("origin")] if holiday.get("origin") else [])
    
    results = await ai_scout.discover_routes(
        origins=origins,
        destinations=holiday.get("destinations"),
        start_date=holiday["start_date"],
        end_date=holiday["end_date"],
        trip_duration_min=holiday.get("trip_duration_min") or 7,
        trip_duration_max=holiday.get("trip_duration_max") or 14,
        budget=holiday.get("budget"),
        preferred_weekdays=holiday.get("preferred_weekdays"),
        max_layovers=holiday.get("max_layovers") or 2,
    )
    
    # Update holiday
    db.table("holidays").update({
        "ai_discovery_results": results,
        "last_ai_scan": datetime.utcnow().isoformat(),
    }).eq("id", holiday_id).execute()
    
    return {
        "message": "AI route discovery completed",
        "results": results,
        "cached": False,
    }


@router.post("/{holiday_id}/generate-insights")
async def generate_insights(
    holiday_id: str,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Generate AI insights for a holiday's flights."""
    # Fetch holiday
    holiday_response = db.table("holidays").select("*").eq("id", holiday_id).eq("user_id", current_user.id).execute()
    
    if not holiday_response.data or len(holiday_response.data) == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    # Fetch flights
    flights_response = db.table("flights").select("*").eq("holiday_id", holiday_id).order("price").execute()
    flights = flights_response.data
    
    if not flights:
        raise HTTPException(status_code=400, detail="No flights found. Search for flights first.")
    
    # Generate insights
    cheapest = flights[0]
    avg_price = sum(f["price"] for f in flights) / len(flights)
    destinations = list(set(f["destination"] for f in flights))
    
    insights_data = [
        {
            "holiday_id": holiday_id,
            "insight_type": "price_trend",
            "insight_text": f"Great news! We found flights starting at €{cheapest['price']:.0f} to {cheapest['destination']}. The average price is €{avg_price:.0f}.",
        },
        {
            "holiday_id": holiday_id,
            "insight_type": "best_time",
            "insight_text": "Based on current prices, now is a good time to book. We recommend booking within 2-3 weeks.",
        },
        {
            "holiday_id": holiday_id,
            "insight_type": "alternative_destination",
            "insight_text": f"Among your {len(destinations)} destinations, {cheapest['destination']} offers the best value at €{cheapest['price']:.0f}." if len(destinations) > 1 else f"{cheapest['destination']} is showing good prices.",
        },
        {
            "holiday_id": holiday_id,
            "insight_type": "general",
            "insight_text": f"Your holiday has {len(flights)} flight options. {cheapest.get('airline') or 'The cheapest option'} offers competitive pricing.",
        },
    ]
    
    # Store insights
    for insight in insights_data:
        db.table("ai_insights").insert(insight).execute()
    
    return {
        "success": True,
        "insights": [{"type": i["insight_type"], "text": i["insight_text"]} for i in insights_data],
        "message": f"Generated {len(insights_data)} insights",
    }


@router.get("/{holiday_id}/smart-insights")
async def get_smart_insights(
    holiday_id: str,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Get AI-powered smart insights for a holiday.
    Returns: price analysis histogram, alternative suggestions, and weather forecast.
    """
    # Fetch holiday
    holiday_response = db.table("holidays").select("*").eq("id", holiday_id).eq("user_id", current_user.id).execute()
    
    if not holiday_response.data or len(holiday_response.data) == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    holiday = holiday_response.data[0]
    
    # Fetch flights
    flights_response = db.table("flights").select("*").eq("holiday_id", holiday_id).order("price").execute()
    flights = flights_response.data or []
    
    # Generate all insights
    all_insights = await insights.get_all_insights(holiday, flights)
    
    return {
        "success": True,
        "holiday_id": holiday_id,
        **all_insights,
    }
