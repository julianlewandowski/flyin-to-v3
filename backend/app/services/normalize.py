"""Flight normalization service.

Converts raw SerpApi/Airhob results into unified FlightOffer schema.
"""
from typing import Any


def parse_airport(data: dict) -> dict:
    """Parse airport info from SerpApi format."""
    return {
        "code": data.get("id") or data.get("airport_id") or data.get("code") or "",
        "city": data.get("city") or (data.get("name", "").split(",")[0] if data.get("name") else ""),
        "country": data.get("country") or "",
    }


def parse_segment(segment: dict) -> dict | None:
    """Parse a flight segment from SerpApi format."""
    try:
        departure_airport = segment.get("departure_airport") or segment.get("from") or {}
        arrival_airport = segment.get("arrival_airport") or segment.get("to") or {}
        
        from_info = parse_airport(departure_airport)
        to_info = parse_airport(arrival_airport)
        
        if not from_info["code"] or not to_info["code"]:
            return None
        
        departure_time = (
            departure_airport.get("time") or 
            segment.get("departure_datetime") or 
            segment.get("departure") or ""
        )
        arrival_time = (
            arrival_airport.get("time") or 
            segment.get("arrival_datetime") or 
            segment.get("arrival") or ""
        )
        
        duration_minutes = segment.get("duration", 0)
        
        # Parse airline
        airline = segment.get("airline", {})
        if isinstance(airline, str):
            airline_name = airline
            airline_code = ""
        else:
            airline_name = airline.get("name", "Unknown")
            airline_code = airline.get("code", "")
        
        return {
            "from_airport": from_info,
            "to_airport": to_info,
            "departure": departure_time,
            "arrival": arrival_time,
            "airline": {"code": airline_code, "name": airline_name},
            "flight_number": segment.get("flight_number") or segment.get("number") or "",
            "duration_minutes": duration_minutes,
            "aircraft": segment.get("airplane") or segment.get("aircraft"),
        }
    except Exception as e:
        print(f"[Normalize] Error parsing segment: {e}")
        return None


def extract_layovers(segments: list[dict]) -> list[dict]:
    """Extract layovers from segments."""
    layovers = []
    
    for i in range(len(segments) - 1):
        current = segments[i]
        next_seg = segments[i + 1]
        
        if current["to_airport"]["code"] == next_seg["from_airport"]["code"]:
            try:
                from datetime import datetime
                arr = datetime.fromisoformat(current["arrival"].replace("Z", "+00:00"))
                dep = datetime.fromisoformat(next_seg["departure"].replace("Z", "+00:00"))
                duration = int((dep - arr).total_seconds() / 60)
                
                layovers.append({
                    "airport": current["to_airport"]["code"],
                    "duration_minutes": max(0, duration),
                })
            except:
                pass
    
    return layovers


def normalize_flight_offer(
    raw_result: dict,
    provider: str = "serpapi",
    default_currency: str = "EUR",
) -> dict | None:
    """Normalize a single flight result to FlightOffer format."""
    try:
        # Parse price
        price = raw_result.get("price")
        if isinstance(price, (int, float)):
            total = price
            currency = default_currency
        elif isinstance(price, dict):
            total = price.get("total") or price.get("value") or 0
            currency = price.get("currency") or default_currency
        else:
            total = raw_result.get("total_price") or 0
            currency = default_currency
        
        if not total:
            return None
        
        # Parse segments
        segments_raw = raw_result.get("flights") or raw_result.get("segments") or []
        if not isinstance(segments_raw, list) or not segments_raw:
            return None
        
        segments = []
        for seg in segments_raw:
            parsed = parse_segment(seg)
            if parsed:
                segments.append(parsed)
        
        if not segments:
            return None
        
        # Extract layovers
        layovers = []
        if isinstance(raw_result.get("layovers"), list):
            layovers = [
                {"airport": lay.get("id") or lay.get("name", ""), "duration_minutes": lay.get("duration", 0)}
                for lay in raw_result["layovers"]
                if lay.get("id") or lay.get("name")
            ]
        else:
            layovers = extract_layovers(segments)
        
        # Calculate total duration
        total_duration = raw_result.get("total_duration")
        if not total_duration:
            seg_duration = sum(s["duration_minutes"] for s in segments)
            lay_duration = sum(l["duration_minutes"] for l in layovers)
            total_duration = seg_duration + lay_duration
        
        # Booking link
        booking_token = raw_result.get("booking_token")
        booking_link = (
            f"https://www.google.com/travel/flights?booking_token={booking_token}"
            if booking_token
            else raw_result.get("book_url") or raw_result.get("booking_link") or ""
        )
        
        # Generate ID
        seg_ids = "_".join(f"{s['from_airport']['code']}-{s['to_airport']['code']}" for s in segments)
        offer_id = f"{provider}_{seg_ids}_{total}"
        
        return {
            "id": offer_id,
            "provider": provider,
            "price": {"total": total, "currency": currency},
            "segments": segments,
            "layovers": layovers,
            "total_duration_minutes": total_duration,
            "num_stops": max(0, len(segments) - 1),
            "cabin_class": raw_result.get("travel_class") or "Economy",
            "booking_link": booking_link,
            "notes": raw_result.get("warnings") or [],
        }
    except Exception as e:
        print(f"[Normalize] Error normalizing offer: {e}")
        return None


def normalize_flight_offers(
    raw_results: list[dict],
    provider: str = "serpapi",
    default_currency: str = "EUR",
) -> list[dict]:
    """Normalize multiple flight results."""
    offers = []
    
    for result in raw_results:
        offer = normalize_flight_offer(result, provider, default_currency)
        if offer:
            offers.append(offer)
    
    return offers


def extract_flights_from_serpapi_response(response: dict) -> list[dict]:
    """Extract flight arrays from SerpApi response."""
    flights = []
    
    if response.get("best_flights"):
        flights.extend(response["best_flights"])
    if response.get("other_flights"):
        flights.extend(response["other_flights"])
    if response.get("flights"):
        flights.extend(response["flights"])
    
    return flights
