"""Date optimization service using OpenAI to pre-filter dates before SerpAPI calls.

This service dramatically reduces SerpAPI calls by using OpenAI to analyze
flight pricing patterns and identify the top 5 optimal date pairs.
"""
import json
import re
from datetime import datetime, timedelta
from typing import Any

import httpx

from ..core.config import get_settings

settings = get_settings()

MAX_OPTIMIZED_DATES = 5


async def optimize_flight_dates(
    origin_airports: list[str],
    destination_airports: list[str],
    start_date: str,
    end_date: str,
    trip_length_min: int,
    trip_length_max: int,
    budget: float | None = None,
    preferences: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Optimize flight search dates using OpenAI analysis.
    
    Returns up to 5 optimal date pairs that should be searched with SerpAPI.
    This pre-filters dates to reduce expensive SerpAPI calls.
    
    Args:
        origin_airports: List of origin airport codes
        destination_airports: List of destination airport codes
        start_date: Start of date range (YYYY-MM-DD)
        end_date: End of date range (YYYY-MM-DD)
        trip_length_min: Minimum trip duration in days
        trip_length_max: Maximum trip duration in days
        budget: Optional budget constraint
        preferences: Optional user preferences dict
        
    Returns:
        List of optimized date pairs, each with:
        - depart_date: str (YYYY-MM-DD)
        - return_date: str (YYYY-MM-DD)
        - estimated_price: float | None
        - confidence: float (0-1)
        - reasoning: str
    """
    print(f"[Date Optimizer] Starting optimization for {len(origin_airports)} origins × {len(destination_airports)} destinations")
    print(f"[Date Optimizer] Date range: {start_date} to {end_date}")
    print(f"[Date Optimizer] Trip length: {trip_length_min}-{trip_length_max} days")
    
    if not settings.OPENAI_API_KEY:
        print("[Date Optimizer] OpenAI API key not configured, using fallback")
        return _generate_fallback_dates(
            start_date, end_date, trip_length_min, trip_length_max
        )
    
    try:
        prompt = _build_optimization_prompt(
            origin_airports,
            destination_airports,
            start_date,
            end_date,
            trip_length_min,
            trip_length_max,
            budget,
            preferences,
        )
        
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
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            data = response.json()
            
            text = data["choices"][0]["message"]["content"]
            
            # Parse JSON response
            try:
                result = json.loads(text)
            except json.JSONDecodeError:
                # Try to extract JSON from text
                json_match = re.search(r'\{[\s\S]*\}', text)
                if json_match:
                    result = json.loads(json_match.group())
                else:
                    raise ValueError("No JSON found in OpenAI response")
            
            # Extract optimized dates
            optimized_dates = result.get("optimized_dates", [])
            
            if not optimized_dates:
                print("[Date Optimizer] No dates returned from OpenAI, using fallback")
                return _generate_fallback_dates(
                    start_date, end_date, trip_length_min, trip_length_max
                )
            
            # Validate and limit to MAX_OPTIMIZED_DATES
            validated_dates = []
            for date_pair in optimized_dates[:MAX_OPTIMIZED_DATES]:
                depart_date = date_pair.get("depart_date") or date_pair.get("outbound_date")
                return_date = date_pair.get("return_date")
                
                if not depart_date or not return_date:
                    continue
                
                # Validate dates are within range and trip length is correct
                try:
                    depart = datetime.strptime(depart_date, "%Y-%m-%d")
                    return_dt = datetime.strptime(return_date, "%Y-%m-%d")
                    start = datetime.strptime(start_date, "%Y-%m-%d")
                    end = datetime.strptime(end_date, "%Y-%m-%d")
                    
                    trip_length_days = (return_dt - depart).days
                    
                    if (
                        depart >= start
                        and return_dt <= end
                        and trip_length_days >= trip_length_min
                        and trip_length_days <= trip_length_max
                    ):
                        validated_dates.append({
                            "depart_date": depart_date,
                            "return_date": return_date,
                            "estimated_price": date_pair.get("estimated_price"),
                            "confidence": date_pair.get("confidence", 0.5),
                            "reasoning": date_pair.get("reasoning", "Optimized date pair"),
                        })
                except ValueError:
                    continue
            
            if not validated_dates:
                print("[Date Optimizer] No valid dates after validation, using fallback")
                return _generate_fallback_dates(
                    start_date, end_date, trip_length_min, trip_length_max
                )
            
            print(f"[Date Optimizer] Optimization complete: {len(validated_dates)} date pairs identified")
            if result.get("search_summary"):
                print(f"[Date Optimizer] Summary: {result['search_summary'][:200]}...")
            
            return validated_dates[:MAX_OPTIMIZED_DATES]
            
    except Exception as e:
        print(f"[Date Optimizer] Error during optimization: {e}")
        print("[Date Optimizer] Falling back to heuristic date generation")
        return _generate_fallback_dates(
            start_date, end_date, trip_length_min, trip_length_max
        )


def _build_optimization_prompt(
    origin_airports: list[str],
    destination_airports: list[str],
    start_date: str,
    end_date: str,
    trip_length_min: int,
    trip_length_max: int,
    budget: float | None,
    preferences: dict[str, Any] | None,
) -> str:
    """Build the OpenAI prompt for date optimization."""
    origins_text = ", ".join(origin_airports)
    destinations_text = ", ".join(destination_airports)
    date_range = f"{start_date} to {end_date}"
    trip_length = f"{trip_length_min}-{trip_length_max} days"
    budget_text = f"Budget: €{budget}" if budget else "No strict budget"
    
    prefs_text = ""
    if preferences:
        prefs_text = "\nPreferences:\n"
        if preferences.get("budget_sensitivity"):
            prefs_text += f"- Budget sensitivity: {preferences['budget_sensitivity']}\n"
        if preferences.get("flexibility"):
            prefs_text += f"- Flexibility: {preferences['flexibility']}\n"
        if preferences.get("preferred_airlines"):
            prefs_text += f"- Preferred airlines: {', '.join(preferences['preferred_airlines'])}\n"
        if preferences.get("preferred_weekdays"):
            prefs_text += f"- Preferred weekdays: {', '.join(preferences['preferred_weekdays'])}\n"
        if preferences.get("avoid_weekdays"):
            prefs_text += f"- Avoid weekdays: {', '.join(preferences['avoid_weekdays'])}\n"
    
    return f"""You are an expert flight price analyst. Your task is to analyze flight pricing patterns and identify the CHEAPEST and BEST flight dates before making expensive API calls.

FLIGHT SEARCH PARAMETERS:
- Origin airports: {origins_text}
- Destination airports: {destinations_text}
- Date range: {date_range}
- Required trip length: {trip_length}
{budget_text}{prefs_text}

YOUR MISSION:
1. Analyze flight pricing patterns across the ENTIRE date range ({start_date} to {end_date})
2. Apply knowledge of flight pricing trends:
   - Mid-week flights (Tue-Thu) are typically 15-30% cheaper than weekends
   - Shoulder seasons (between peak and off-peak) often have better deals
   - Holidays, school breaks, and peak travel seasons drive prices up
   - Airlines often release deals on Tuesdays
   - Red-eye flights and early morning flights are typically cheaper
3. Identify the TOP 5 date pairs (depart_date, return_date) that are:
   - Most likely to be CHEAPEST within the date range based on pricing patterns
   - Valid for trip length of {trip_length_min}-{trip_length_max} days
   - Aligned with user preferences (budget, flexibility, weekdays)
   - Distributed across the date range to maximize coverage

CRITICAL REQUIREMENTS:
- Return EXACTLY 5 date pairs (or fewer if the range is too narrow)
- Each date pair MUST have a trip duration between {trip_length_min} and {trip_length_max} days
- Dates MUST be within {start_date} to {end_date}
- Prioritize dates most likely to be CHEAPEST based on known patterns
- Consider mid-week flights (Tue-Thu) which are typically 15-30% cheaper
- Avoid peak seasons, holidays, and school breaks
- Include a mix of dates across the range, not all clustered together

PRICING ANALYSIS STRATEGY:
- Identify which months/weeks in the range are likely off-peak or shoulder season
- Factor in known holiday periods that affect pricing
- Consider day-of-week patterns (weekdays vs weekends)
- Account for seasonal variations (summer peak, winter holidays, etc.)
- Apply regional knowledge about the origin/destination pair

OUTPUT FORMAT:
Return a JSON object with this structure:
{{
  "optimized_dates": [
    {{
      "depart_date": "YYYY-MM-DD",
      "return_date": "YYYY-MM-DD",
      "estimated_price": <number or null>,
      "confidence": <0-1>,
      "reasoning": "Brief explanation"
    }}
  ],
  "search_summary": "Brief summary of pricing analysis"
}}

IMPORTANT: These 5 date pairs will be the ONLY ones searched via expensive SerpAPI calls, so choose wisely to maximize value while minimizing API costs."""


def _generate_fallback_dates(
    start_date: str,
    end_date: str,
    trip_length_min: int,
    trip_length_max: int,
) -> list[dict[str, Any]]:
    """Generate fallback date pairs when OpenAI optimization fails.
    
    Returns up to 5 heuristic-based date pairs.
    """
    print("[Date Optimizer] Generating fallback dates")
    
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    days_diff = (end - start).days
    
    # Generate 5 date pairs distributed across the range
    num_dates = min(MAX_OPTIMIZED_DATES, max(1, days_diff // 7))
    avg_trip_length = (trip_length_min + trip_length_max) // 2
    
    date_pairs = []
    
    for i in range(num_dates):
        progress = i / (num_dates - 1) if num_dates > 1 else 0
        days_from_start = int(days_diff * progress * 0.7)  # Use first 70% of range
        
        depart_date = start + timedelta(days=days_from_start)
        
        # Prefer mid-week (Tuesday = weekday 1)
        weekday = depart_date.weekday()
        if weekday in (5, 6):  # Weekend
            # Move to Tuesday
            days_to_tuesday = (1 - weekday + 7) % 7
            depart_date += timedelta(days=days_to_tuesday)
        
        return_date = depart_date + timedelta(days=avg_trip_length)
        
        # Ensure within range
        if return_date > end:
            return_date = end
            new_depart = return_date - timedelta(days=avg_trip_length)
            if new_depart >= start:
                depart_date = new_depart
            else:
                continue  # Skip this combination
        
        depart_str = depart_date.strftime("%Y-%m-%d")
        return_str = return_date.strftime("%Y-%m-%d")
        
        if depart_str >= start_date and return_str <= end_date and return_str > depart_str:
            date_pairs.append({
                "depart_date": depart_str,
                "return_date": return_str,
                "estimated_price": None,
                "confidence": 0.6 - i * 0.1,  # Decreasing confidence
                "reasoning": f"Fallback date {i + 1}: Mid-week departure with {avg_trip_length}-day trip",
            })
    
    # If we have fewer than 5, add more dates
    while len(date_pairs) < min(MAX_OPTIMIZED_DATES, num_dates):
        if not date_pairs:
            break
        
        last_date = date_pairs[-1]
        last_depart = datetime.strptime(last_date["depart_date"], "%Y-%m-%d")
        next_depart = last_depart + timedelta(days=7)  # One week later
        
        next_return = next_depart + timedelta(days=avg_trip_length)
        
        next_depart_str = next_depart.strftime("%Y-%m-%d")
        next_return_str = next_return.strftime("%Y-%m-%d")
        
        if next_depart_str >= start_date and next_return_str <= end_date and next_return_str > next_depart_str:
            date_pairs.append({
                "depart_date": next_depart_str,
                "return_date": next_return_str,
                "estimated_price": None,
                "confidence": 0.5,
                "reasoning": f"Fallback date {len(date_pairs) + 1}: Additional mid-week option",
            })
        else:
            break  # Can't add more dates
    
    return date_pairs[:MAX_OPTIMIZED_DATES]

