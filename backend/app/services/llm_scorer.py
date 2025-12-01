"""LLM-based flight scoring service."""
import json
import re
from typing import Any
import httpx

from ..core.config import get_settings

settings = get_settings()


async def extract_preferences(holiday: dict, additional_context: str = "") -> dict[str, Any]:
    """Extract user preferences from holiday data using LLM."""
    if not settings.OPENAI_API_KEY:
        return _extract_basic_preferences(holiday)
    
    prompt = f"""Analyze this holiday configuration and extract travel preferences:

Holiday: {json.dumps(holiday, default=str)}
Context: {additional_context}

Return a JSON object with these optional fields:
{{
  "budget": {{"max": number, "currency": "EUR", "flexible": boolean}},
  "preferred_times": {{"departure_window": {{"earliest_hour": 0-23, "latest_hour": 0-23}}}},
  "layover_tolerance": {{"max_layovers": number, "max_layover_minutes": number}},
  "preferred_airlines": ["airline names"],
  "cabin_class": "Economy" | "Business" | "First"
}}

Only include fields you can infer from the data. Return ONLY the JSON object."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
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
                },
            )
            response.raise_for_status()
            data = response.json()
            text = data["choices"][0]["message"]["content"]
            
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                return json.loads(json_match.group())
                
    except Exception as e:
        print(f"[LLM Scorer] Preference extraction error: {e}")
    
    return _extract_basic_preferences(holiday)


def _extract_basic_preferences(holiday: dict) -> dict[str, Any]:
    """Extract basic preferences without LLM."""
    prefs = {}
    
    if holiday.get("budget"):
        prefs["budget"] = {
            "max": holiday["budget"],
            "currency": "EUR",
            "flexible": True,
        }
    
    if holiday.get("max_layovers") is not None:
        prefs["layover_tolerance"] = {
            "max_layovers": holiday["max_layovers"],
        }
    
    return prefs


async def score_flight_offers(
    offers: list[dict],
    preferences: dict[str, Any],
) -> list[dict]:
    """Score flight offers based on preferences using LLM."""
    if not offers:
        return []
    
    if not settings.OPENAI_API_KEY:
        return _score_basic(offers, preferences)
    
    # Limit offers to avoid token limits
    offers_to_score = offers[:20]
    
    prompt = f"""Score these flight offers based on user preferences.

Preferences: {json.dumps(preferences)}

Offers (simplified):
{json.dumps([{
    "id": o["id"],
    "price": o["price"],
    "num_stops": o["num_stops"],
    "total_duration_minutes": o["total_duration_minutes"],
    "cabin_class": o.get("cabin_class", "Economy"),
} for o in offers_to_score], indent=2)}

For each offer, provide a score (0-100) and brief reasoning.
Return a JSON array:
[
  {{"id": "offer_id", "score": 85, "reasoning": "Good price, direct flight"}}
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
                    "temperature": 0.2,
                },
            )
            response.raise_for_status()
            data = response.json()
            text = data["choices"][0]["message"]["content"]
            
            json_match = re.search(r'\[[\s\S]*\]', text)
            if json_match:
                scores = json.loads(json_match.group())
                score_map = {s["id"]: s for s in scores}
                
                scored_offers = []
                for offer in offers_to_score:
                    score_data = score_map.get(offer["id"], {})
                    scored_offers.append({
                        **offer,
                        "score": score_data.get("score", 50),
                        "reasoning": score_data.get("reasoning", ""),
                        "match_details": {},
                    })
                
                # Sort by score descending
                scored_offers.sort(key=lambda x: x["score"], reverse=True)
                return scored_offers
                
    except Exception as e:
        print(f"[LLM Scorer] Scoring error: {e}")
    
    return _score_basic(offers, preferences)


def _score_basic(offers: list[dict], preferences: dict) -> list[dict]:
    """Basic scoring without LLM."""
    budget_max = preferences.get("budget", {}).get("max")
    max_layovers = preferences.get("layover_tolerance", {}).get("max_layovers")
    
    scored = []
    for offer in offers:
        score = 50  # Base score
        reasoning_parts = []
        
        price = offer.get("price", {}).get("total", 0)
        stops = offer.get("num_stops", 0)
        
        # Price scoring
        if budget_max and price:
            if price <= budget_max:
                score += 20
                reasoning_parts.append("Within budget")
            elif price <= budget_max * 1.1:
                score += 10
                reasoning_parts.append("Slightly over budget")
        
        # Layover scoring
        if stops == 0:
            score += 20
            reasoning_parts.append("Direct flight")
        elif max_layovers is not None and stops <= max_layovers:
            score += 10
            reasoning_parts.append(f"{stops} stop(s)")
        
        scored.append({
            **offer,
            "score": min(100, score),
            "reasoning": "; ".join(reasoning_parts) if reasoning_parts else "Standard option",
            "match_details": {},
        })
    
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored
