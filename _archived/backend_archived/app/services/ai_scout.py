"""AI Scout service for discovering flight routes using LLM."""
import json
import re
from typing import Any
import httpx

from ..core.config import get_settings

settings = get_settings()


async def discover_routes(
    origins: list[str],
    destinations: list[str] | None,
    start_date: str,
    end_date: str,
    trip_duration_min: int = 7,
    trip_duration_max: int = 14,
    budget: float | None = None,
    preferred_weekdays: list[str] | None = None,
    max_layovers: int = 2,
) -> list[dict[str, Any]]:
    """Use LLM to discover optimal flight routes.
    
    Returns list of AIDiscoveryResult dicts.
    """
    if not settings.OPENAI_API_KEY:
        print("[AI Scout] OpenAI API key not configured")
        return []
    
    # Build prompt
    origins_text = ", ".join(origins)
    destinations_text = f"to {', '.join(destinations)}" if destinations else "to flexible destinations"
    date_range = f"between {start_date} and {end_date}"
    duration = f"for {trip_duration_min}-{trip_duration_max} days"
    budget_text = f"under €{budget}" if budget else ""
    weekdays_text = f"preferring {', '.join(preferred_weekdays)}" if preferred_weekdays else ""
    
    prompt = f"""You are a flight deal expert. Search for the best cheap flight deals from {origins_text} {destinations_text} {date_range} {duration} {budget_text} {weekdays_text}.

Find the top 10 best flight deals by searching popular travel sites like Google Flights, Skyscanner, Momondo, and Reddit r/traveldeals.

For each deal, provide:
- Origin airport code (IATA)
- Destination airport code (IATA)
- Departure date (YYYY-MM-DD)
- Return date (YYYY-MM-DD)
- Estimated price in EUR
- Confidence score (0-1)

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "origin": "DUB",
    "destination": "BKK",
    "depart": "2025-07-03",
    "return": "2025-07-14",
    "estimated_price": 450,
    "confidence": 0.85
  }}
]

Important:
- Only include real, bookable routes
- Prioritize the cheapest options
- Ensure dates fall within the specified range
- Trip duration must be between {trip_duration_min} and {trip_duration_max} days
- Return ONLY the JSON array, no other text"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                },
            )
            response.raise_for_status()
            data = response.json()
            
            text = data["choices"][0]["message"]["content"]
            
            # Extract JSON array from response
            json_match = re.search(r'\[[\s\S]*\]', text)
            if not json_match:
                print("[AI Scout] No JSON array found in response")
                return []
            
            results = json.loads(json_match.group())
            
            # Validate and filter
            valid_results = [
                r for r in results
                if r.get("origin") and r.get("destination") and r.get("depart") and r.get("return")
            ]
            
            return valid_results[:10]
            
    except Exception as e:
        print(f"[AI Scout] Error: {e}")
        return []


async def recommend_dates(
    origin: str,
    destinations: list[str],
    start_date: str,
    end_date: str,
    budget: float | None = None,
    trip_duration_min: int | None = None,
    trip_duration_max: int | None = None,
    preferred_weekdays: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Use LLM to recommend optimal travel dates.
    
    Returns list of date recommendations with reasoning.
    """
    if not settings.OPENAI_API_KEY:
        # Return fallback dates
        return _generate_fallback_dates(start_date, end_date, trip_duration_min, trip_duration_max)
    
    min_dur = trip_duration_min or 3
    max_dur = trip_duration_max or 14
    
    prompt = f"""You are a travel date optimization expert. Recommend the best travel dates for a trip.

Trip details:
- Origin: {origin}
- Destinations: {', '.join(destinations)}
- Date range: {start_date} to {end_date}
- Trip duration: {min_dur}-{max_dur} days
- Budget: {'€' + str(budget) if budget else 'Flexible'}
- Preferred days: {', '.join(preferred_weekdays) if preferred_weekdays else 'Any'}

Provide 8-10 date combinations that would likely have the best prices. Consider:
- Mid-week departures (Tue-Thu) are usually cheaper
- Avoid holiday periods
- Shoulder season dates
- Red-eye flights

Return ONLY a JSON array:
[
  {{
    "outbound_date": "2025-07-03",
    "return_date": "2025-07-10",
    "reasoning": "Mid-week departure, avoiding peak season",
    "priority": 10
  }}
]"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                },
            )
            response.raise_for_status()
            data = response.json()
            
            text = data["choices"][0]["message"]["content"]
            json_match = re.search(r'\[[\s\S]*\]', text)
            
            if json_match:
                return json.loads(json_match.group())
            
    except Exception as e:
        print(f"[AI Scout] Date recommendation error: {e}")
    
    return _generate_fallback_dates(start_date, end_date, trip_duration_min, trip_duration_max)


def _generate_fallback_dates(
    start_date: str,
    end_date: str,
    trip_duration_min: int | None,
    trip_duration_max: int | None,
) -> list[dict[str, Any]]:
    """Generate fallback date recommendations."""
    from datetime import datetime, timedelta
    
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    days_diff = (end - start).days
    
    min_dur = trip_duration_min or 3
    max_dur = trip_duration_max or 14
    avg_dur = (min_dur + max_dur) // 2
    
    num_recs = min(10, max(5, days_diff // 7))
    recommendations = []
    
    for i in range(num_recs):
        progress = i / (num_recs - 1) if num_recs > 1 else 0
        days_from_start = int(days_diff * progress * 0.7)
        
        outbound = start + timedelta(days=days_from_start)
        
        # Prefer mid-week
        weekday = outbound.weekday()
        if weekday in (5, 6):  # Weekend
            outbound += timedelta(days=(8 - weekday) % 7)
        
        return_date = outbound + timedelta(days=avg_dur)
        
        if return_date > end:
            return_date = end
            outbound = return_date - timedelta(days=avg_dur)
            if outbound < start:
                continue
        
        outbound_str = outbound.strftime("%Y-%m-%d")
        return_str = return_date.strftime("%Y-%m-%d")
        
        if outbound_str >= start_date and return_str <= end_date:
            recommendations.append({
                "outbound_date": outbound_str,
                "return_date": return_str,
                "reasoning": f"Generated date combination {i + 1}",
                "priority": 10 - i,
            })
    
    return recommendations
