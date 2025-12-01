"""AI Insight schemas."""
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


class AIInsightBase(BaseModel):
    """Base insight schema."""
    holiday_id: str
    insight_text: str
    insight_type: Literal["price_trend", "best_time", "alternative_destination", "general"]


class AIInsightCreate(AIInsightBase):
    """Schema for creating an insight."""
    pass


class AIInsight(AIInsightBase):
    """Full insight schema."""
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
