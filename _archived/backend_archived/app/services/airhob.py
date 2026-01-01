"""Airhob flight API service."""
from typing import Any
import httpx

from ..core.config import get_settings

settings = get_settings()
AIRHOB_BASE_URL = "https://dev-sandbox-api.airhob.com/sandboxapi/flights/v2"


def _get_headers() -> dict[str, str]:
    """Get Airhob API headers."""
    return {
        "apikey": settings.AIRHOB_API_KEY or "",
        "mode": "sandbox",
        "Content-Type": "application/json",
    }


async def search_flights(request: dict[str, Any]) -> dict[str, Any]:
    """Search flights using Airhob API.
    
    Request format:
    {
        "TripType": "R" | "O",
        "NoOfAdults": 1,
        "ClassType": "Economy" | "Business" | "First",
        "OriginDestination": [
            {"Origin": "DUB", "Destination": "BKK", "TravelDate": "MM/DD/YYYY"},
            ...
        ],
        "Currency": "EUR"
    }
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{AIRHOB_BASE_URL}/search",
            headers=_get_headers(),
            json=request,
        )
        response.raise_for_status()
        return response.json()


async def lookup_fare(track_id: str, fare_id: str) -> dict[str, Any]:
    """Look up a specific fare for booking."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{AIRHOB_BASE_URL}/look",
            headers=_get_headers(),
            json={"TrackId": track_id, "FareId": fare_id},
        )
        response.raise_for_status()
        return response.json()


def format_date_for_airhob(date_string: str) -> str:
    """Convert YYYY-MM-DD to MM/DD/YYYY for Airhob."""
    from datetime import datetime
    dt = datetime.strptime(date_string, "%Y-%m-%d")
    return dt.strftime("%m/%d/%Y")
