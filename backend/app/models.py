"""SQLAlchemy models for the database."""
from datetime import date, datetime
from typing import Optional, List

from sqlalchemy import Column, String, Date, DateTime, Numeric, ForeignKey, ARRAY, Integer, Boolean, Text, JSON

from .core.database import Base


class Holiday(Base):
    """Holiday/trip configuration."""
    __tablename__ = "holidays"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    origin = Column(String, nullable=True)
    origins = Column(ARRAY(String), nullable=True)
    destinations = Column(ARRAY(String), nullable=False, default=[])
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    budget = Column(Numeric(10, 2), nullable=True)
    trip_duration_min = Column(Integer, nullable=True)
    trip_duration_max = Column(Integer, nullable=True)
    preferred_weekdays = Column(ARRAY(String), nullable=True)
    max_layovers = Column(Integer, nullable=True)
    use_ai_discovery = Column(Boolean, default=False)
    ai_discovery_results = Column(JSON, nullable=True)
    last_ai_scan = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Flight(Base):
    """Flight search result."""
    __tablename__ = "flights"

    id = Column(String, primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    holiday_id = Column(String, ForeignKey("holidays.id"), nullable=False)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    departure_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    old_price = Column(Numeric(10, 2), nullable=True)
    airline = Column(String, nullable=True)
    booking_link = Column(Text, nullable=True)
    source = Column(String, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    track_id = Column(String, nullable=True)
    fare_id = Column(String, nullable=True)
    referral_link = Column(Text, nullable=True)
    baggage_info = Column(JSON, nullable=True)
    layovers = Column(Integer, nullable=True)
    flight_duration = Column(String, nullable=True)
    last_checked = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class AIInsight(Base):
    """AI-generated insight for a holiday."""
    __tablename__ = "ai_insights"

    id = Column(String, primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    holiday_id = Column(String, ForeignKey("holidays.id"), nullable=False)
    insight_text = Column(Text, nullable=False)
    insight_type = Column(String, nullable=False)  # price_trend, best_time, alternative_destination, general
    created_at = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    """Price drop alert."""
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    holiday_id = Column(String, ForeignKey("holidays.id"), nullable=False)
    flight_id = Column(String, ForeignKey("flights.id"), nullable=False)
    old_price = Column(Numeric(10, 2), nullable=False)
    new_price = Column(Numeric(10, 2), nullable=False)
    price_drop_percent = Column(Numeric(5, 2), nullable=False)
    notified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
