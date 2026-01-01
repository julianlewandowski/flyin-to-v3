"""Holiday schemas."""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class AIDiscoveryResult(BaseModel):
    """AI-discovered route."""
    origin: str
    destination: str
    depart: str
    return_date: str  # 'return' is reserved in Python
    estimated_price: Optional[float] = None
    confidence: Optional[float] = None
    
    class Config:
        # Allow 'return' as field name in JSON
        populate_by_name = True
        
    def model_dump(self, **kwargs):
        data = super().model_dump(**kwargs)
        # Rename return_date back to return for JSON output
        if 'return_date' in data:
            data['return'] = data.pop('return_date')
        return data


class HolidayBase(BaseModel):
    """Base holiday schema."""
    name: str
    origin: Optional[str] = None
    origins: Optional[list[str]] = None
    destinations: list[str] = []
    start_date: date
    end_date: date
    budget: Optional[float] = None
    trip_duration_min: Optional[int] = None
    trip_duration_max: Optional[int] = None
    preferred_weekdays: Optional[list[str]] = None
    max_layovers: Optional[int] = None
    use_ai_discovery: Optional[bool] = False


class HolidayCreate(HolidayBase):
    """Schema for creating a holiday."""
    pass


class HolidayUpdate(BaseModel):
    """Schema for updating a holiday."""
    name: Optional[str] = None
    origin: Optional[str] = None
    origins: Optional[list[str]] = None
    destinations: Optional[list[str]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = None
    trip_duration_min: Optional[int] = None
    trip_duration_max: Optional[int] = None
    preferred_weekdays: Optional[list[str]] = None
    max_layovers: Optional[int] = None
    use_ai_discovery: Optional[bool] = None
    ai_discovery_results: Optional[list[AIDiscoveryResult]] = None
    last_ai_scan: Optional[datetime] = None


class Holiday(HolidayBase):
    """Full holiday schema with all fields."""
    id: str
    user_id: str
    ai_discovery_results: Optional[list[AIDiscoveryResult]] = None
    last_ai_scan: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
