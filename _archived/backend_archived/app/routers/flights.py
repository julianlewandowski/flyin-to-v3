"""Flight routes."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from ..core.auth import User, get_current_user
from ..core.database import get_db
from ..services import airhob

router = APIRouter(prefix="/flights", tags=["flights"])


@router.get("/{flight_id}")
async def get_flight(
    flight_id: str,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Get a specific flight."""
    response = db.table("flights").select("*").eq("id", flight_id).single().execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Flight not found")
    
    return response.data


@router.post("/{flight_id}/look")
async def lookup_flight_fare(
    flight_id: str,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Look up current fare for a flight (Airhob)."""
    response = db.table("flights").select("*").eq("id", flight_id).single().execute()
    flight = response.data
    
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    
    if not flight.get("track_id") or not flight.get("fare_id"):
        raise HTTPException(status_code=400, detail="Flight missing tracking information")
    
    # Look up fare
    try:
        lookup_response = await airhob.lookup_fare(flight["track_id"], flight["fare_id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fare lookup failed: {str(e)}")
    
    # Update flight
    old_price = flight["price"]
    new_price = lookup_response.get("Fare", {}).get("TotalFare", old_price)
    
    db.table("flights").update({
        "old_price": old_price,
        "price": new_price,
        "referral_link": lookup_response.get("ReferralLink", flight.get("referral_link")),
        "verified_at": datetime.utcnow().isoformat(),
    }).eq("id", flight_id).execute()
    
    # Check for price drop (>10%)
    if new_price < old_price * 0.9:
        price_drop = ((old_price - new_price) / old_price) * 100
        
        db.table("alerts").insert({
            "holiday_id": flight["holiday_id"],
            "flight_id": flight_id,
            "old_price": old_price,
            "new_price": new_price,
            "price_drop_percent": price_drop,
            "notified": False,
        }).execute()
    
    return {
        "message": "Flight fare verified",
        "flight": {
            "id": flight_id,
            "price": new_price,
            "old_price": old_price,
            "referral_link": lookup_response.get("ReferralLink"),
            "verified_at": datetime.utcnow().isoformat(),
        },
        "price_changed": new_price != old_price,
    }


@router.get("/holiday/{holiday_id}")
async def list_flights_for_holiday(
    holiday_id: str,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """List all flights for a holiday."""
    response = db.table("flights").select("*").eq("holiday_id", holiday_id).order("price").execute()
    return response.data
