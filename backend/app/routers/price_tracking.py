"""Price tracking routes - Enable/disable tracking and manage alerts."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
from supabase import Client

from ..core.auth import User, get_current_user
from ..core.database import get_db
from ..core.config import get_settings
from ..services.price_tracker import run_daily_price_check

router = APIRouter(prefix="/price-tracking", tags=["price-tracking"])
settings = get_settings()


class EnableTrackingRequest(BaseModel):
    """Request body for enabling price tracking."""
    threshold_percent: Optional[float] = 10.0


class EnableTrackingResponse(BaseModel):
    """Response for enabling price tracking."""
    success: bool
    message: str
    last_tracked_price: Optional[float] = None
    threshold_percent: float


class DisableTrackingResponse(BaseModel):
    """Response for disabling price tracking."""
    success: bool
    message: str


class PriceDropAlertResponse(BaseModel):
    """Price drop alert data."""
    id: str
    holiday_id: str
    holiday_name: str
    old_price: float
    new_price: float
    percent_drop: float
    route_info: Optional[dict] = None
    date_info: Optional[dict] = None
    resolved: bool
    created_at: str


class ActiveAlertsResponse(BaseModel):
    """Response for active alerts list."""
    success: bool
    alerts: list[PriceDropAlertResponse]
    total_count: int


@router.post("/holidays/{holiday_id}/enable", response_model=EnableTrackingResponse)
async def enable_price_tracking(
    holiday_id: str,
    request: EnableTrackingRequest = EnableTrackingRequest(),
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Enable price tracking for a holiday.
    - Stores current cheapest price as baseline
    - Sets tracking enabled and threshold
    - Resets any active alerts
    """
    # Verify holiday belongs to user
    holiday_response = db.table("holidays").select("*").eq("id", holiday_id).eq("user_id", current_user.id).execute()
    
    if not holiday_response.data or len(holiday_response.data) == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    holiday = holiday_response.data[0]
    
    # Get current cheapest flight price for this holiday
    flights_response = db.table("flights").select("price").eq("holiday_id", holiday_id).order("price").limit(1).execute()
    
    current_lowest_price = None
    if flights_response.data and len(flights_response.data) > 0:
        current_lowest_price = float(flights_response.data[0]["price"])
    
    # Update holiday with tracking settings
    update_data = {
        "price_tracking_enabled": True,
        "last_tracked_price": current_lowest_price,
        "price_drop_threshold_percent": request.threshold_percent,
        "has_active_price_alert": False,
        "last_price_check": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    update_response = db.table("holidays").update(update_data).eq("id", holiday_id).execute()
    
    if not update_response.data or len(update_response.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to enable price tracking")
    
    return EnableTrackingResponse(
        success=True,
        message=f"Price tracking enabled for '{holiday['name']}'",
        last_tracked_price=current_lowest_price,
        threshold_percent=request.threshold_percent,
    )


@router.post("/holidays/{holiday_id}/disable", response_model=DisableTrackingResponse)
async def disable_price_tracking(
    holiday_id: str,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Disable price tracking for a holiday.
    - Sets tracking disabled
    - Does NOT delete historical alerts or last tracked price
    """
    # Verify holiday belongs to user
    holiday_response = db.table("holidays").select("id, name").eq("id", holiday_id).eq("user_id", current_user.id).execute()
    
    if not holiday_response.data or len(holiday_response.data) == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    holiday = holiday_response.data[0]
    
    # Update holiday - only disable tracking, preserve history
    update_data = {
        "price_tracking_enabled": False,
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    update_response = db.table("holidays").update(update_data).eq("id", holiday_id).execute()
    
    if not update_response.data or len(update_response.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to disable price tracking")
    
    return DisableTrackingResponse(
        success=True,
        message=f"Price tracking disabled for '{holiday['name']}'",
    )


@router.get("/holidays/{holiday_id}/status")
async def get_tracking_status(
    holiday_id: str,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Get the current price tracking status for a holiday."""
    holiday_response = db.table("holidays").select(
        "id, name, price_tracking_enabled, last_tracked_price, price_drop_threshold_percent, has_active_price_alert, last_price_check"
    ).eq("id", holiday_id).eq("user_id", current_user.id).execute()
    
    if not holiday_response.data or len(holiday_response.data) == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    holiday = holiday_response.data[0]
    
    # Get current lowest flight price for comparison
    flights_response = db.table("flights").select("price").eq("holiday_id", holiday_id).order("price").limit(1).execute()
    current_lowest_price = None
    if flights_response.data and len(flights_response.data) > 0:
        current_lowest_price = float(flights_response.data[0]["price"])
    
    return {
        "success": True,
        "holiday_id": holiday_id,
        "holiday_name": holiday["name"],
        "enabled": holiday.get("price_tracking_enabled", False),
        "last_tracked_price": float(holiday["last_tracked_price"]) if holiday.get("last_tracked_price") else None,
        "current_lowest_price": current_lowest_price,
        "threshold_percent": float(holiday.get("price_drop_threshold_percent") or 10.0),
        "has_active_alert": holiday.get("has_active_price_alert", False),
        "last_check": holiday.get("last_price_check"),
    }


@router.get("/alerts/active", response_model=ActiveAlertsResponse)
async def get_active_alerts(
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """
    Get all active (unresolved) price drop alerts for the current user.
    Used by the global alert banner.
    """
    # Get all holidays for the user that have active alerts
    holidays_response = db.table("holidays").select("id, name").eq("user_id", current_user.id).eq("has_active_price_alert", True).execute()
    
    if not holidays_response.data:
        return ActiveAlertsResponse(success=True, alerts=[], total_count=0)
    
    holiday_ids = [h["id"] for h in holidays_response.data]
    holiday_names = {h["id"]: h["name"] for h in holidays_response.data}
    
    # Get unresolved alerts for these holidays
    alerts_response = db.table("price_drop_alerts").select("*").in_("holiday_id", holiday_ids).eq("resolved", False).order("created_at", desc=True).execute()
    
    alerts = []
    for alert in alerts_response.data or []:
        alerts.append(PriceDropAlertResponse(
            id=alert["id"],
            holiday_id=alert["holiday_id"],
            holiday_name=holiday_names.get(alert["holiday_id"], "Unknown"),
            old_price=float(alert["old_price"]),
            new_price=float(alert["new_price"]),
            percent_drop=float(alert["percent_drop"]),
            route_info=alert.get("route_info"),
            date_info=alert.get("date_info"),
            resolved=alert["resolved"],
            created_at=alert["created_at"],
        ))
    
    return ActiveAlertsResponse(
        success=True,
        alerts=alerts,
        total_count=len(alerts),
    )


@router.get("/holidays/{holiday_id}/alerts")
async def get_holiday_alerts(
    holiday_id: str,
    include_resolved: bool = False,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Get all price drop alerts for a specific holiday."""
    # Verify holiday belongs to user
    holiday_response = db.table("holidays").select("id, name").eq("id", holiday_id).eq("user_id", current_user.id).execute()
    
    if not holiday_response.data or len(holiday_response.data) == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    
    holiday = holiday_response.data[0]
    
    # Get alerts
    query = db.table("price_drop_alerts").select("*").eq("holiday_id", holiday_id)
    
    if not include_resolved:
        query = query.eq("resolved", False)
    
    alerts_response = query.order("created_at", desc=True).execute()
    
    return {
        "success": True,
        "holiday_id": holiday_id,
        "holiday_name": holiday["name"],
        "alerts": alerts_response.data or [],
        "total_count": len(alerts_response.data or []),
    }


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: Client = Depends(get_db),
):
    """Mark a price drop alert as resolved (dismissed)."""
    # Get the alert
    alert_response = db.table("price_drop_alerts").select("*, holidays!inner(user_id, id)").eq("id", alert_id).execute()
    
    if not alert_response.data or len(alert_response.data) == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert = alert_response.data[0]
    
    # Verify the alert belongs to the user's holiday
    if alert.get("holidays", {}).get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this alert")
    
    # Mark as resolved
    update_response = db.table("price_drop_alerts").update({"resolved": True}).eq("id", alert_id).execute()
    
    if not update_response.data or len(update_response.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to resolve alert")
    
    # Check if there are any remaining unresolved alerts for this holiday
    holiday_id = alert["holiday_id"]
    remaining_response = db.table("price_drop_alerts").select("id").eq("holiday_id", holiday_id).eq("resolved", False).execute()
    
    # If no more active alerts, update the holiday
    if not remaining_response.data or len(remaining_response.data) == 0:
        db.table("holidays").update({
            "has_active_price_alert": False,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", holiday_id).execute()
    
    return {
        "success": True,
        "message": "Alert resolved",
        "remaining_alerts": len(remaining_response.data or []),
    }


@router.post("/cron/daily-check")
async def run_cron_price_check(
    x_cron_secret: Optional[str] = Header(None, alias="X-Cron-Secret"),
    db: Client = Depends(get_db),
):
    """
    Daily price check cron endpoint.
    
    This endpoint is meant to be called by a scheduler (Supabase Edge Functions,
    Vercel Cron, GitHub Actions, etc.) once per day.
    
    For security, it requires a secret header when CRON_SECRET is configured.
    """
    # Verify cron secret if configured
    cron_secret = settings.CRON_SECRET if hasattr(settings, 'CRON_SECRET') else None
    
    if cron_secret and x_cron_secret != cron_secret:
        raise HTTPException(
            status_code=401,
            detail="Invalid cron secret. Set X-Cron-Secret header."
        )
    
    # Run the daily price check
    result = await run_daily_price_check(db)
    
    return {
        "success": result.get("success", False),
        "holidays_checked": result.get("holidays_checked", 0),
        "alerts_created": result.get("alerts_created", 0),
        "errors": result.get("errors", 0),
        "timestamp": datetime.utcnow().isoformat(),
    }

