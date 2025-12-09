"""AI Destination Discovery service using OpenAI."""
import json
import re
from typing import Any
import httpx

from ..core.config import get_settings

settings = get_settings()

# Fallback destinations if OpenAI fails or returns fewer than 5
FALLBACK_DESTINATIONS = [
    {"city": "Bangkok", "country": "Thailand", "airport": "BKK", "reason": "Popular budget-friendly destination with great food and culture"},
    {"city": "Barcelona", "country": "Spain", "airport": "BCN", "reason": "Beautiful Mediterranean city with beaches and architecture"},
    {"city": "Tokyo", "country": "Japan", "airport": "NRT", "reason": "Unique blend of traditional and modern culture"},
    {"city": "Dubai", "country": "United Arab Emirates", "airport": "DXB", "reason": "Luxury destination with modern attractions"},
    {"city": "Bali", "country": "Indonesia", "airport": "DPS", "reason": "Tropical paradise with stunning beaches and temples"},
]


async def discover_destinations(
    origins: list[str],
    date_range: dict[str, str],
    trip_lengths: dict[str, int],
    preferences: dict[str, Any] | None = None,
    prompt: str | None = None,
) -> list[dict[str, Any]]:
    """Use OpenAI to discover 5 recommended destinations.
    
    Args:
        origins: List of origin airport codes
        date_range: Dict with 'start' and 'end' date strings (YYYY-MM-DD)
        trip_lengths: Dict with 'min' and 'max' trip duration in days
        preferences: Optional preferences dict (budget, etc.)
        prompt: Optional free-text holiday description
        
    Returns:
        List of 5 destination dicts with city, country, airport, and reason
    """
    if not settings.OPENAI_API_KEY:
        print("[Destination Discovery] OpenAI API key not configured, using fallbacks")
        return FALLBACK_DESTINATIONS[:5]
    
    # Build the prompt
    origins_text = ", ".join(origins)
    date_text = f"{date_range['start']} to {date_range['end']}"
    duration_text = f"{trip_lengths['min']} to {trip_lengths['max']} days"
    
    preferences_text = ""
    if preferences:
        if preferences.get("budget"):
            preferences_text += f"\n- Budget: €{preferences.get('budget')}"
        if preferences.get("preferred_weekdays"):
            preferences_text += f"\n- Preferred departure days: {', '.join(preferences.get('preferred_weekdays', []))}"
        if preferences.get("max_layovers"):
            preferences_text += f"\n- Max layovers: {preferences.get('max_layovers')}"
    
    prompt_text = f"\n- Holiday description: {prompt}" if prompt else ""
    
    system_prompt = """You are an expert travel agent skilled at affordable flight discovery and destination matching.
You have extensive knowledge of global destinations, airport codes, and travel pricing patterns.
Your recommendations are based on real-world travel data and user preferences."""
    
    user_prompt = f"""User information:
- Origin airports: {origins_text}
- Preferred travel dates: {date_text}
- Trip length range: {duration_text}
- Travel preferences: {preferences_text if preferences_text else 'None specified'}{prompt_text}

TASK:
Recommend EXACTLY 5 destinations worldwide that best match the user's inputs.
For each destination, choose the **cheapest likely airport to fly into** in that region.

Consider:
- Budget constraints if specified
- Travel dates and seasonal pricing
- Trip duration preferences
- User's holiday description if provided
- Geographic diversity (don't recommend all destinations in the same region)
- Value for money (affordable but interesting destinations)

Return JSON with an array "destinations", where each item has:
{{
  "city": "City name",
  "country": "Country name",
  "airport": "IATA code (3 letters)",
  "reason": "Why this destination matches the user's preferences"
}}

IMPORTANT:
- Return EXACTLY 5 destinations
- Use valid IATA airport codes (3 letters)
- Choose airports that are typically cheaper to fly into
- Provide specific, personalized reasons for each recommendation
- Return ONLY valid JSON, no other text"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # First attempt
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.7,
                },
            )
            response.raise_for_status()
            data = response.json()
            
            text = data["choices"][0]["message"]["content"]
            
            # Parse JSON
            try:
                result = json.loads(text)
                destinations = result.get("destinations", [])
                
                # Validate destinations
                valid_destinations = []
                for dest in destinations:
                    if all(key in dest for key in ["city", "country", "airport", "reason"]):
                        # Ensure airport code is uppercase and 3 characters
                        airport_code = str(dest["airport"]).upper().strip()
                        if len(airport_code) == 3 and airport_code.isalpha():
                            dest["airport"] = airport_code
                            valid_destinations.append(dest)
                
                # If we have fewer than 5, fill with fallbacks
                if len(valid_destinations) < 5:
                    print(f"[Destination Discovery] Got {len(valid_destinations)} destinations, filling with fallbacks")
                    # Use fallbacks that aren't already in the list
                    existing_airports = {d["airport"] for d in valid_destinations}
                    for fallback in FALLBACK_DESTINATIONS:
                        if len(valid_destinations) >= 5:
                            break
                        if fallback["airport"] not in existing_airports:
                            valid_destinations.append(fallback)
                            existing_airports.add(fallback["airport"])
                
                # Return exactly 5
                return valid_destinations[:5]
                
            except json.JSONDecodeError:
                # Try to extract JSON from text if it's wrapped
                json_match = re.search(r'\{[\s\S]*"destinations"[\s\S]*\}', text)
                if json_match:
                    try:
                        result = json.loads(json_match.group())
                        destinations = result.get("destinations", [])
                        if len(destinations) >= 5:
                            return destinations[:5]
                    except json.JSONDecodeError:
                        pass
                
                # Retry once with a simpler prompt
                print("[Destination Discovery] JSON parse failed, retrying...")
                return await _retry_discovery(origins_text, date_text, duration_text, preferences_text, prompt_text)
                
    except Exception as e:
        print(f"[Destination Discovery] Error: {e}")
        # Return fallbacks on error
        return FALLBACK_DESTINATIONS[:5]


async def _retry_discovery(
    origins_text: str,
    date_text: str,
    duration_text: str,
    preferences_text: str,
    prompt_text: str,
) -> list[dict[str, Any]]:
    """Retry destination discovery with a simpler prompt."""
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
                    "messages": [
                        {
                            "role": "user",
                            "content": f"""Recommend 5 travel destinations from {origins_text} for dates {date_text}, trip length {duration_text}.{prompt_text}

Return JSON: {{"destinations": [{{"city": "...", "country": "...", "airport": "XXX", "reason": "..."}}]}}"""
                        }
                    ],
                    "temperature": 0.5,
                },
            )
            response.raise_for_status()
            data = response.json()
            text = data["choices"][0]["message"]["content"]
            result = json.loads(text)
            destinations = result.get("destinations", [])
            
            # Validate and fill to 5
            valid = []
            for dest in destinations:
                if all(key in dest for key in ["city", "country", "airport", "reason"]):
                    airport_code = str(dest["airport"]).upper().strip()
                    if len(airport_code) == 3 and airport_code.isalpha():
                        dest["airport"] = airport_code
                        valid.append(dest)
            
            # Fill with fallbacks if needed
            existing_airports = {d["airport"] for d in valid}
            for fallback in FALLBACK_DESTINATIONS:
                if len(valid) >= 5:
                    break
                if fallback["airport"] not in existing_airports:
                    valid.append(fallback)
                    existing_airports.add(fallback["airport"])
            
            return valid[:5]
            
    except Exception as e:
        print(f"[Destination Discovery] Retry failed: {e}")
        return FALLBACK_DESTINATIONS[:5]


