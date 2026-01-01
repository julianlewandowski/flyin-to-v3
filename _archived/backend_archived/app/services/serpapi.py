"""SerpApi Google Flights service."""
import asyncio
from typing import Any
import httpx

from ..core.config import get_settings

settings = get_settings()
SERPAPI_BASE_URL = "https://serpapi.com/search"


class SerpApiSearchParams:
    """Search parameters for SerpApi."""
    def __init__(
        self,
        departure_id: str,
        arrival_id: str,
        outbound_date: str,
        return_date: str | None = None,
        currency: str = "EUR",
        adults: int = 1,
        sort_by: int = 1,
        num: int = 50,
    ):
        self.engine = "google_flights"
        self.departure_id = departure_id
        self.arrival_id = arrival_id
        self.outbound_date = outbound_date
        self.return_date = return_date
        self.currency = currency
        self.adults = adults
        self.sort_by = sort_by
        self.num = num
    
    def to_dict(self) -> dict:
        params = {
            "engine": self.engine,
            "departure_id": self.departure_id,
            "arrival_id": self.arrival_id,
            "outbound_date": self.outbound_date,
            "currency": self.currency,
            "adults": str(self.adults),
            "sort_by": str(self.sort_by),
            "num": str(self.num),
        }
        if self.return_date:
            params["return_date"] = self.return_date
        return params


async def search_flights(params: SerpApiSearchParams) -> dict[str, Any]:
    """Search flights using SerpApi."""
    api_key = settings.SERPAPI_KEY
    if not api_key:
        raise ValueError("SERPAPI_KEY is not configured")
    
    query_params = params.to_dict()
    query_params["api_key"] = api_key
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(SERPAPI_BASE_URL, params=query_params)
        response.raise_for_status()
        data = response.json()
        
        if data.get("error"):
            raise ValueError(f"SerpApi error: {data['error']}")
        
        return data


async def search_flights_parallel(
    params_list: list[SerpApiSearchParams],
) -> list[dict[str, Any]]:
    """Search multiple routes in parallel."""
    tasks = [search_flights(params) for params in params_list]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    processed = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            processed.append({
                "params": params_list[i].to_dict(),
                "error": str(result),
                "result": None,
            })
        else:
            processed.append({
                "params": params_list[i].to_dict(),
                "error": None,
                "result": result,
            })
    
    return processed


def generate_search_params(
    origins: list[str],
    destinations: list[str],
    date_recommendations: list[dict],
    currency: str = "EUR",
) -> list[SerpApiSearchParams]:
    """Generate search params for all origin-destination-date combinations."""
    params = []
    
    for origin in origins:
        for destination in destinations:
            for date_rec in date_recommendations:
                params.append(SerpApiSearchParams(
                    departure_id=origin.strip(),
                    arrival_id=destination.strip(),
                    outbound_date=date_rec["outbound_date"],
                    return_date=date_rec.get("return_date"),
                    currency=currency,
                ))
    
    return params


def generate_search_params_with_limit(
    origins: list[str],
    destinations: list[str],
    date_recommendations: list[dict],
    max_calls: int = 5,
    currency: str = "EUR",
) -> list[SerpApiSearchParams]:
    """Generate search params while respecting a maximum call limit.
    
    Intelligently selects origin-destination-date combinations to stay within
    the limit, prioritizing highest priority dates and distributing across routes.
    
    Args:
        origins: List of origin airport codes
        destinations: List of destination airport codes
        date_recommendations: List of date recommendations with priority
        max_calls: Maximum number of SerpAPI calls allowed
        currency: Currency code
        
    Returns:
        List of SerpApiSearchParams, limited to max_calls
    """
    # Calculate total possible combinations
    total_combinations = len(origins) * len(destinations) * len(date_recommendations)
    
    print(f"[SerpAPI] Total possible combinations: {total_combinations}")
    print(f"[SerpAPI] Max allowed SerpAPI calls: {max_calls}")
    
    if total_combinations <= max_calls:
        # We can search all combinations
        return generate_search_params(origins, destinations, date_recommendations, currency)
    
    # We need to select intelligently
    # Priority: Highest priority dates first, then distribute across routes
    sorted_dates = sorted(date_recommendations, key=lambda x: x.get("priority", 0), reverse=True)
    
    # Create all possible combinations
    all_combinations: list[dict[str, Any]] = []
    
    for origin in origins:
        for destination in destinations:
            for date_rec in sorted_dates:
                all_combinations.append({
                    "origin": origin,
                    "destination": destination,
                    "date": date_rec,
                    "priority": date_rec.get("priority", 0),
                })
    
    # Sort by priority (highest first)
    all_combinations.sort(key=lambda x: x["priority"], reverse=True)
    
    # Select top N combinations, ensuring we cover different routes
    selected_combinations = set()
    selected: list[dict[str, Any]] = []
    
    for combo in all_combinations:
        if len(selected) >= max_calls:
            break
        
        # Create unique key for this combination
        key = f"{combo['origin']}-{combo['destination']}-{combo['date']['outbound_date']}"
        if key not in selected_combinations:
            selected_combinations.add(key)
            selected.append(combo)
    
    # If we still have slots, fill with remaining high-priority combinations
    for combo in all_combinations:
        if len(selected) >= max_calls:
            break
        
        key = f"{combo['origin']}-{combo['destination']}-{combo['date']['outbound_date']}"
        if key not in selected_combinations:
            selected_combinations.add(key)
            selected.append(combo)
    
    # Generate params from selected combinations
    params = []
    for combo in selected:
        params.append(SerpApiSearchParams(
            departure_id=combo["origin"].strip(),
            arrival_id=combo["destination"].strip(),
            outbound_date=combo["date"]["outbound_date"],
            return_date=combo["date"].get("return_date"),
            currency=currency,
        ))
    
    print(f"[SerpAPI] Selected {len(params)} combinations from {total_combinations} possible")
    
    return params