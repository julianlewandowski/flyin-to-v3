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
