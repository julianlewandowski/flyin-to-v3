"""Destination discovery schemas."""
from typing import Optional
from pydantic import BaseModel


class DestinationDiscoveryInput(BaseModel):
    """Input schema for destination discovery."""
    origins: list[str]
    date_range: dict[str, str]  # {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
    trip_lengths: dict[str, int]  # {"min": int, "max": int}
    preferences: Optional[dict] = None
    prompt: Optional[str] = None


class DestinationItem(BaseModel):
    """A single destination recommendation."""
    city: str
    country: str
    airport: str  # IATA code
    reason: str


class DestinationDiscoveryResult(BaseModel):
    """Response schema for destination discovery."""
    destinations: list[DestinationItem]




