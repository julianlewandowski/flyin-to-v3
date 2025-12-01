"""Flight schemas."""
from datetime import date, datetime
from typing import Optional, Any
from pydantic import BaseModel


class AirportInfo(BaseModel):
    """Airport information."""
    code: str
    city: str = ""
    country: str = ""


class FlightSegment(BaseModel):
    """Single flight segment."""
    from_airport: AirportInfo
    to_airport: AirportInfo
    departure: str
    arrival: str
    airline: dict  # {code: str, name: str}
    flight_number: str = ""
    duration_minutes: int = 0
    aircraft: Optional[str] = None
    
    class Config:
        populate_by_name = True


class Layover(BaseModel):
    """Layover information."""
    airport: str
    duration_minutes: int


class FlightOffer(BaseModel):
    """Normalized flight offer from any provider."""
    id: str
    provider: str
    price: dict  # {total: float, currency: str}
    segments: list[FlightSegment]
    layovers: list[Layover] = []
    total_duration_minutes: int = 0
    num_stops: int = 0
    cabin_class: str = "Economy"
    booking_link: str = ""
    notes: list[str] = []


class ScoredFlightOffer(FlightOffer):
    """Flight offer with LLM scoring."""
    score: float = 0
    reasoning: str = ""
    match_details: dict = {}


class FlightBase(BaseModel):
    """Base flight schema."""
    holiday_id: str
    origin: str
    destination: str
    departure_date: date
    return_date: Optional[date] = None
    price: float
    airline: Optional[str] = None
    booking_link: Optional[str] = None
    source: Optional[str] = None
    verified_at: Optional[datetime] = None
    track_id: Optional[str] = None
    fare_id: Optional[str] = None
    referral_link: Optional[str] = None
    baggage_info: Optional[dict] = None
    layovers: Optional[int] = None
    flight_duration: Optional[str] = None


class FlightCreate(FlightBase):
    """Schema for creating a flight."""
    last_checked: datetime


class Flight(FlightBase):
    """Full flight schema."""
    id: str
    old_price: Optional[float] = None
    last_checked: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class SearchFlightsResponse(BaseModel):
    """Response from unified flight search."""
    success: bool
    offers: list[ScoredFlightOffer] = []
    preferences: dict = {}
    message: str = ""
    metadata: dict = {}
    debug: Optional[dict] = None
