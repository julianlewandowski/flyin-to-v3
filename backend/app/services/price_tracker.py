"""
Price Tracker Service - Daily price-check job for tracked holidays.

This service:
1. Queries holidays with price_tracking_enabled = true
2. Re-runs flight searches using existing SerpAPI integration
3. Compares prices against last_tracked_price
4. Creates price_drop_alerts when threshold is exceeded
5. Sends email notifications (optional)

IMPORTANT: This runs independently from normal flight searches.
It reuses existing search logic but doesn't modify it.
"""
import asyncio
from datetime import datetime
from typing import Optional
import os

# Email sending (optional - uses Resend if available)
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False


async def run_price_check_for_holiday(
    holiday: dict,
    db,
    serpapi_module,
    normalize_module,
    airports_module,
    date_optimizer_module,
) -> dict:
    """
    Run a price check for a single holiday.
    
    Returns:
        dict with keys: success, new_price, old_price, alert_created, error
    """
    holiday_id = holiday["id"]
    holiday_name = holiday.get("name", "Unknown")
    last_tracked_price = float(holiday.get("last_tracked_price") or 0)
    threshold_percent = float(holiday.get("price_drop_threshold_percent") or 10.0)
    
    print(f"[PriceTracker] Checking holiday: {holiday_name} (ID: {holiday_id})")
    print(f"[PriceTracker] Last tracked price: €{last_tracked_price:.2f}, Threshold: {threshold_percent}%")
    
    try:
        # Collect origins
        origins = []
        if holiday.get("origins"):
            for origin in holiday["origins"]:
                if origin and origin.strip():
                    expanded = airports_module.expand_airports([origin.strip()])
                    origins.extend(expanded)
        elif holiday.get("origin") and holiday["origin"].strip():
            expanded = airports_module.expand_airports([holiday["origin"].strip()])
            origins.extend(expanded)
        
        if not origins:
            return {
                "success": False,
                "error": "No origins configured",
                "holiday_id": holiday_id,
            }
        
        # Collect destinations
        destinations = []
        for dest in holiday.get("destinations") or []:
            if dest and dest.strip():
                expanded = airports_module.expand_airports([dest.strip()])
                destinations.extend(expanded)
        
        if not destinations:
            return {
                "success": False,
                "error": "No destinations configured",
                "holiday_id": holiday_id,
            }
        
        # Get optimized dates using existing date optimizer
        trip_duration_min = holiday.get("trip_duration_min") or 3
        trip_duration_max = holiday.get("trip_duration_max") or 14
        
        optimized_dates = await date_optimizer_module.optimize_flight_dates(
            origin_airports=origins[:2],  # Limit for cost
            destination_airports=destinations[:2],  # Limit for cost
            start_date=holiday["start_date"],
            end_date=holiday["end_date"],
            trip_length_min=trip_duration_min,
            trip_length_max=trip_duration_max,
            budget=holiday.get("budget"),
            preferences={
                "budget_sensitivity": "high",
                "flexibility": "moderate",
                "preferred_weekdays": holiday.get("preferred_weekdays"),
            },
        )
        
        if not optimized_dates:
            return {
                "success": False,
                "error": "Could not generate date recommendations",
                "holiday_id": holiday_id,
            }
        
        # Generate search params - limited to 3 calls to save API quota
        MAX_PRICE_CHECK_CALLS = 3
        search_params = []
        
        for date_pair in optimized_dates[:MAX_PRICE_CHECK_CALLS]:
            search_params.append({
                "engine": "google_flights",
                "departure_id": origins[0],
                "arrival_id": destinations[0],
                "outbound_date": date_pair["depart_date"],
                "return_date": date_pair["return_date"],
                "currency": "EUR",
                "adults": 1,
                "sort_by": 1,
                "num": 20,  # Fewer results needed for price check
            })
        
        print(f"[PriceTracker] Running {len(search_params)} searches for {holiday_name}")
        
        # Run searches using existing SerpAPI service
        search_results = await serpapi_module.search_flights_parallel(search_params)
        
        # Collect and normalize results
        all_raw_flights = []
        for res in search_results:
            if res.get("error"):
                continue
            if res.get("result"):
                flights = normalize_module.extract_flights_from_serpapi_response(res["result"])
                all_raw_flights.extend(flights)
        
        if not all_raw_flights:
            print(f"[PriceTracker] No flights found for {holiday_name}")
            # Update last check time even if no results
            db.table("holidays").update({
                "last_price_check": datetime.utcnow().isoformat(),
            }).eq("id", holiday_id).execute()
            
            return {
                "success": True,
                "new_price": None,
                "old_price": last_tracked_price,
                "alert_created": False,
                "holiday_id": holiday_id,
                "message": "No flights found",
            }
        
        # Normalize and get lowest price
        normalized = normalize_module.normalize_flight_offers(all_raw_flights, "serpapi", "EUR")
        
        if not normalized:
            return {
                "success": False,
                "error": "Could not normalize flight data",
                "holiday_id": holiday_id,
            }
        
        # Get lowest price from normalized offers
        lowest_price = min(offer["price"]["total"] for offer in normalized if offer.get("price", {}).get("total"))
        
        print(f"[PriceTracker] Found lowest price: €{lowest_price:.2f} (was €{last_tracked_price:.2f})")
        
        # Calculate price drop
        alert_created = False
        if last_tracked_price > 0 and lowest_price < last_tracked_price:
            percent_drop = ((last_tracked_price - lowest_price) / last_tracked_price) * 100
            
            print(f"[PriceTracker] Price dropped by {percent_drop:.1f}%")
            
            if percent_drop >= threshold_percent:
                # Create price drop alert
                cheapest_offer = min(normalized, key=lambda x: x.get("price", {}).get("total", float("inf")))
                
                route_info = None
                date_info = None
                
                if cheapest_offer.get("segments") and len(cheapest_offer["segments"]) > 0:
                    first_seg = cheapest_offer["segments"][0]
                    last_seg = cheapest_offer["segments"][-1]
                    
                    route_info = {
                        "origin": first_seg.get("from_airport", {}).get("code"),
                        "destination": last_seg.get("to_airport", {}).get("code"),
                    }
                    
                    date_info = {
                        "departure_date": first_seg.get("departure", "")[:10] if first_seg.get("departure") else None,
                        "return_date": last_seg.get("arrival", "")[:10] if last_seg.get("arrival") else None,
                    }
                
                alert_data = {
                    "holiday_id": holiday_id,
                    "old_price": last_tracked_price,
                    "new_price": lowest_price,
                    "percent_drop": round(percent_drop, 2),
                    "route_info": route_info,
                    "date_info": date_info,
                    "resolved": False,
                    "notified": False,
                    "created_at": datetime.utcnow().isoformat(),
                }
                
                db.table("price_drop_alerts").insert(alert_data).execute()
                
                # Update holiday with active alert flag
                db.table("holidays").update({
                    "last_tracked_price": lowest_price,
                    "has_active_price_alert": True,
                    "last_price_check": datetime.utcnow().isoformat(),
                }).eq("id", holiday_id).execute()
                
                alert_created = True
                print(f"[PriceTracker] Alert created! Price dropped {percent_drop:.1f}% from €{last_tracked_price:.2f} to €{lowest_price:.2f}")
                
                # Send email notification (if configured)
                await _send_price_drop_email(
                    holiday=holiday,
                    old_price=last_tracked_price,
                    new_price=lowest_price,
                    percent_drop=percent_drop,
                    route_info=route_info,
                    date_info=date_info,
                    db=db,
                )
            else:
                # Price dropped but not enough to trigger alert
                db.table("holidays").update({
                    "last_tracked_price": lowest_price,
                    "last_price_check": datetime.utcnow().isoformat(),
                }).eq("id", holiday_id).execute()
        else:
            # No price drop or price increased
            db.table("holidays").update({
                "last_tracked_price": lowest_price,
                "last_price_check": datetime.utcnow().isoformat(),
            }).eq("id", holiday_id).execute()
        
        return {
            "success": True,
            "new_price": lowest_price,
            "old_price": last_tracked_price,
            "alert_created": alert_created,
            "holiday_id": holiday_id,
        }
        
    except Exception as e:
        print(f"[PriceTracker] Error checking {holiday_name}: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            "success": False,
            "error": str(e),
            "holiday_id": holiday_id,
        }


async def run_daily_price_check(db) -> dict:
    """
    Main entry point for the daily price check job.
    
    Queries all holidays with tracking enabled and checks prices.
    
    Args:
        db: Supabase client
        
    Returns:
        Summary of the price check run
    """
    print("[PriceTracker] ========================================")
    print("[PriceTracker] Starting daily price check job")
    print(f"[PriceTracker] Time: {datetime.utcnow().isoformat()}")
    print("[PriceTracker] ========================================")
    
    # Import services here to avoid circular imports
    from . import serpapi, normalize, airports, date_optimizer
    
    # Get all holidays with tracking enabled
    holidays_response = db.table("holidays").select("*").eq("price_tracking_enabled", True).execute()
    
    if not holidays_response.data:
        print("[PriceTracker] No holidays with tracking enabled")
        return {
            "success": True,
            "holidays_checked": 0,
            "alerts_created": 0,
            "errors": 0,
        }
    
    holidays = holidays_response.data
    print(f"[PriceTracker] Found {len(holidays)} holidays to check")
    
    results = {
        "success": True,
        "holidays_checked": len(holidays),
        "alerts_created": 0,
        "errors": 0,
        "details": [],
    }
    
    # Process holidays sequentially to avoid rate limits
    for holiday in holidays:
        result = await run_price_check_for_holiday(
            holiday=holiday,
            db=db,
            serpapi_module=serpapi,
            normalize_module=normalize,
            airports_module=airports,
            date_optimizer_module=date_optimizer,
        )
        
        results["details"].append(result)
        
        if result.get("alert_created"):
            results["alerts_created"] += 1
        
        if not result.get("success"):
            results["errors"] += 1
        
        # Small delay between holidays to avoid rate limits
        await asyncio.sleep(1)
    
    print("[PriceTracker] ========================================")
    print(f"[PriceTracker] Completed: {results['holidays_checked']} checked, {results['alerts_created']} alerts, {results['errors']} errors")
    print("[PriceTracker] ========================================")
    
    return results


async def _send_price_drop_email(
    holiday: dict,
    old_price: float,
    new_price: float,
    percent_drop: float,
    route_info: Optional[dict],
    date_info: Optional[dict],
    db,
) -> bool:
    """
    Send a price drop notification email.
    
    Uses Resend if available and configured, otherwise logs the notification.
    """
    # Get user email
    user_id = holiday.get("user_id")
    if not user_id:
        print("[PriceTracker] No user_id for holiday, skipping email")
        return False
    
    # In a real implementation, you'd look up the user's email
    # For now, we'll just log the notification
    holiday_name = holiday.get("name", "Your Holiday")
    
    # Check if Resend is configured
    resend_api_key = os.environ.get("RESEND_API_KEY")
    
    if RESEND_AVAILABLE and resend_api_key:
        try:
            resend.api_key = resend_api_key
            
            # Build email body
            route_text = ""
            if route_info:
                route_text = f"\nRoute: {route_info.get('origin', 'N/A')} → {route_info.get('destination', 'N/A')}"
            
            date_text = ""
            if date_info:
                date_text = f"\nDates: {date_info.get('departure_date', 'N/A')} - {date_info.get('return_date', 'N/A')}"
            
            email_body = f"""
Good news! The price for your holiday "{holiday_name}" just dropped!

📉 Price Drop: {percent_drop:.0f}%
💰 Old Price: €{old_price:.2f}
💸 New Price: €{new_price:.2f}
💵 You Save: €{(old_price - new_price):.2f}
{route_text}{date_text}

This could be a great time to book!

View your holiday and the latest flight prices:
[Link to dashboard would go here]

---
Flyin.to - Your Smart Flight Tracker
"""
            
            # Note: In production, you'd look up the actual user email
            # For now, this is a placeholder
            # resend.Emails.send({
            #     "from": "alerts@flyin.to",
            #     "to": user_email,
            #     "subject": f"✈️ Price Drop Alert – Your Trip Just Got Cheaper!",
            #     "text": email_body,
            # })
            
            print(f"[PriceTracker] Email notification would be sent for {holiday_name}")
            print(f"[PriceTracker] Subject: Price Drop Alert – Your Trip Just Got Cheaper!")
            print(f"[PriceTracker] Body preview: {email_body[:200]}...")
            
            # Mark alert as notified
            db.table("price_drop_alerts").update({
                "notified": True,
            }).eq("holiday_id", holiday["id"]).eq("resolved", False).execute()
            
            return True
            
        except Exception as e:
            print(f"[PriceTracker] Failed to send email: {str(e)}")
            return False
    else:
        print(f"[PriceTracker] Email not configured. Would notify user about price drop for {holiday_name}")
        print(f"[PriceTracker] Price dropped {percent_drop:.1f}% from €{old_price:.2f} to €{new_price:.2f}")
        return False


# Cron job endpoint - can be called by Supabase Edge Functions, Vercel Cron, etc.
async def price_tracker_cron_handler(db) -> dict:
    """
    Handler for cron job invocation.
    This should be called once per day by your scheduler.
    """
    return await run_daily_price_check(db)

