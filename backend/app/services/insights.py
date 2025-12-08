"""AI-powered insights service using OpenAI."""
import json
import re
from datetime import datetime, timedelta
from typing import Any
import httpx

from ..core.config import get_settings

settings = get_settings()

OPENWEATHER_API_KEY = "bd5e378503939ddaee76f12ad7a97608"  # Free tier key for demo


async def get_price_analysis(
    holiday: dict,
    flights: list[dict],
) -> dict[str, Any]:
    """
    Generate price analysis with monthly histogram data.
    Uses OpenAI to analyze pricing trends and recommend best months.
    """
    if not flights:
        return {"error": "No flights available for analysis"}
    
    # Calculate basic stats
    prices = [f["price"] for f in flights]
    avg_price = sum(prices) / len(prices)
    min_price = min(prices)
    max_price = max(prices)
    cheapest_flight = min(flights, key=lambda x: x["price"])
    
    # Group flights by month for histogram
    monthly_prices = {}
    for flight in flights:
        try:
            dep_date = datetime.fromisoformat(flight["departure_date"].replace("Z", ""))
            month_key = dep_date.strftime("%Y-%m")
            month_name = dep_date.strftime("%b %Y")
            if month_key not in monthly_prices:
                monthly_prices[month_key] = {"month": month_name, "prices": []}
            monthly_prices[month_key]["prices"].append(flight["price"])
        except:
            continue
    
    # Calculate monthly averages for histogram
    histogram_data = []
    for month_key in sorted(monthly_prices.keys()):
        data = monthly_prices[month_key]
        month_avg = sum(data["prices"]) / len(data["prices"])
        month_min = min(data["prices"])
        histogram_data.append({
            "month": data["month"],
            "avg_price": round(month_avg, 2),
            "min_price": round(month_min, 2),
            "flight_count": len(data["prices"]),
            "is_estimated": False,
        })
    
    # Generate estimated prices for all 12 months if we have some data
    if histogram_data:
        histogram_data = await _fill_missing_months(
            histogram_data, avg_price, holiday, cheapest_flight
        )
    
    # Find best month (prefer actual data over estimates)
    actual_months = [h for h in histogram_data if not h.get("is_estimated", False)]
    best_month = min(actual_months, key=lambda x: x["avg_price"]) if actual_months else (
        min(histogram_data, key=lambda x: x["avg_price"]) if histogram_data else None
    )
    
    # Get AI analysis if OpenAI key available
    ai_summary = None
    if settings.OPENAI_API_KEY and histogram_data:
        ai_summary = await _get_openai_price_analysis(
            holiday, histogram_data, avg_price, min_price, cheapest_flight
        )
    
    return {
        "type": "price_analysis",
        "destination": cheapest_flight.get("destination", holiday.get("destinations", ["Unknown"])[0]),
        "origin": holiday.get("origin", ""),
        "stats": {
            "average_price": round(avg_price, 2),
            "min_price": round(min_price, 2),
            "max_price": round(max_price, 2),
            "total_flights": len(flights),
        },
        "histogram": histogram_data,
        "best_month": best_month,
        "cheapest_flight": {
            "price": cheapest_flight["price"],
            "date": cheapest_flight.get("departure_date"),
            "airline": cheapest_flight.get("airline"),
        },
        "ai_summary": ai_summary or f"Best time to fly: {best_month['month'] if best_month else 'N/A'} with average price of €{best_month['avg_price'] if best_month else 'N/A'}",
    }


async def _fill_missing_months(
    histogram_data: list[dict],
    avg_price: float,
    holiday: dict,
    cheapest_flight: dict,
) -> list[dict]:
    """
    Fill in missing months with estimated prices based on seasonal patterns.
    Uses OpenAI if available, otherwise uses simple seasonal multipliers.
    """
    # Get the year from existing data or holiday dates
    existing_months = {h["month"].split()[0]: h for h in histogram_data}
    
    # Determine the year to use
    year = datetime.now().year
    if histogram_data:
        try:
            year = int(histogram_data[0]["month"].split()[1])
        except:
            pass
    
    # All months
    all_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
    # Seasonal price multipliers (relative to average)
    # Peak: Summer (Jun-Aug), Christmas (Dec), Easter (Apr)
    # Low: Jan-Feb, Nov
    seasonal_multipliers = {
        "Jan": 0.85,   # Post-holiday low
        "Feb": 0.88,   # Winter low
        "Mar": 0.95,   # Spring break starts
        "Apr": 1.05,   # Easter peak
        "May": 1.00,   # Shoulder season
        "Jun": 1.15,   # Summer starts
        "Jul": 1.25,   # Peak summer
        "Aug": 1.20,   # Peak summer
        "Sep": 0.95,   # Shoulder season
        "Oct": 0.92,   # Fall low
        "Nov": 0.82,   # Lowest (pre-holiday)
        "Dec": 1.10,   # Holiday peak
    }
    
    # Try to get AI-generated estimates if OpenAI is available
    ai_estimates = None
    if settings.OPENAI_API_KEY:
        ai_estimates = await _get_openai_monthly_estimates(
            holiday, histogram_data, avg_price, cheapest_flight
        )
    
    # Build complete histogram
    complete_histogram = []
    for month in all_months:
        if month in existing_months:
            complete_histogram.append(existing_months[month])
        else:
            # Use AI estimate if available, otherwise use seasonal multiplier
            if ai_estimates and month in ai_estimates:
                estimated_price = ai_estimates[month]
            else:
                multiplier = seasonal_multipliers.get(month, 1.0)
                estimated_price = round(avg_price * multiplier, 2)
            
            complete_histogram.append({
                "month": f"{month} {year}",
                "avg_price": estimated_price,
                "min_price": round(estimated_price * 0.85, 2),  # Estimate min as 15% below avg
                "flight_count": 0,
                "is_estimated": True,
            })
    
    return complete_histogram


async def _get_openai_monthly_estimates(
    holiday: dict,
    existing_data: list[dict],
    avg_price: float,
    cheapest_flight: dict,
) -> dict[str, float] | None:
    """Get AI-generated price estimates for missing months."""
    existing_months = [h["month"].split()[0] for h in existing_data]
    missing_months = [m for m in ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] 
                      if m not in existing_months]
    
    if not missing_months:
        return None
    
    prompt = f"""Estimate flight prices for these missing months based on the route and existing data.

Route: {holiday.get('origin', 'Origin')} to {cheapest_flight.get('destination', 'Destination')}
Existing data: {json.dumps(existing_data)}
Average price from data: €{avg_price:.0f}

Estimate prices for: {', '.join(missing_months)}

Consider seasonal patterns (summer peak, winter low, holiday peaks).
Return ONLY a JSON object with month abbreviations as keys and estimated prices as values.
Example: {{"Jan": 150, "Feb": 145}}"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 200,
                },
            )
            response.raise_for_status()
            data = response.json()
            text = data["choices"][0]["message"]["content"].strip()
            
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                estimates = json.loads(json_match.group())
                # Validate and convert to floats
                return {k: float(v) for k, v in estimates.items() if k in missing_months}
    except Exception as e:
        print(f"[Insights] OpenAI monthly estimates error: {e}")
    
    return None


async def _get_openai_price_analysis(
    holiday: dict,
    histogram: list[dict],
    avg_price: float,
    min_price: float,
    cheapest_flight: dict,
) -> str:
    """Get AI-generated price analysis summary."""
    prompt = f"""Analyze this flight price data and provide a brief, helpful summary (2-3 sentences max):

Route: {holiday.get('origin', 'Origin')} to {cheapest_flight.get('destination', 'Destination')}
Average Price: €{avg_price:.0f}
Cheapest Found: €{min_price:.0f}
Monthly Data: {json.dumps(histogram)}

Focus on: Which month is best to travel and why. Be specific and actionable."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "max_tokens": 150,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[Insights] OpenAI price analysis error: {e}")
        return None


async def get_alternative_suggestions(
    holiday: dict,
    flights: list[dict],
) -> dict[str, Any]:
    """
    Generate alternative route suggestions with flexible dates.
    Shows routes like: Dublin → Barcelona: €XX (2 days before your plan)
    """
    if not flights:
        return {"error": "No flights available for alternatives"}
    
    original_start = holiday.get("start_date", "")
    original_end = holiday.get("end_date", "")
    origin = holiday.get("origin", "")
    destinations = holiday.get("destinations", [])
    
    # Group flights by destination
    flights_by_dest = {}
    for flight in flights:
        dest = flight.get("destination", "Unknown")
        if dest not in flights_by_dest:
            flights_by_dest[dest] = []
        flights_by_dest[dest].append(flight)
    
    # Find alternatives for each destination
    alternatives = []
    
    for dest, dest_flights in flights_by_dest.items():
        # Sort by price
        sorted_flights = sorted(dest_flights, key=lambda x: x["price"])
        cheapest = sorted_flights[0]
        
        # Find the "original" price (closest to planned date)
        original_price = None
        if original_start:
            try:
                target_date = datetime.fromisoformat(original_start.replace("Z", ""))
                closest_flight = min(
                    dest_flights,
                    key=lambda f: abs(
                        (datetime.fromisoformat(f["departure_date"].replace("Z", "")) - target_date).days
                    )
                )
                original_price = closest_flight["price"]
            except:
                original_price = sorted_flights[len(sorted_flights)//2]["price"] if sorted_flights else None
        
        # Calculate date difference
        date_diff_text = ""
        savings = 0
        if original_start and cheapest.get("departure_date"):
            try:
                target = datetime.fromisoformat(original_start.replace("Z", ""))
                cheapest_date = datetime.fromisoformat(cheapest["departure_date"].replace("Z", ""))
                diff_days = (cheapest_date - target).days
                
                if diff_days == 0:
                    date_diff_text = "Same as planned"
                elif diff_days > 0:
                    date_diff_text = f"{diff_days} day{'s' if diff_days > 1 else ''} after your plan"
                else:
                    date_diff_text = f"{abs(diff_days)} day{'s' if abs(diff_days) > 1 else ''} before your plan"
                
                if original_price:
                    savings = original_price - cheapest["price"]
            except:
                pass
        
        alternatives.append({
            "route": f"{origin} → {dest}",
            "origin": origin,
            "destination": dest,
            "cheapest_price": cheapest["price"],
            "original_price": original_price,
            "savings": round(savings, 2) if savings > 0 else 0,
            "date": cheapest.get("departure_date"),
            "date_difference": date_diff_text,
            "airline": cheapest.get("airline"),
            "booking_link": cheapest.get("booking_link"),
        })
    
    # Sort by savings (highest first)
    alternatives.sort(key=lambda x: x.get("savings", 0), reverse=True)
    
    # Get AI suggestions if available
    ai_suggestions = None
    if settings.OPENAI_API_KEY and alternatives:
        ai_suggestions = await _get_openai_alternatives(holiday, alternatives)
    
    return {
        "type": "alternative_suggestions",
        "original_dates": {
            "start": original_start,
            "end": original_end,
        },
        "alternatives": alternatives[:10],  # Top 10
        "ai_suggestion": ai_suggestions or "Consider flexible dates for better prices.",
    }


async def _get_openai_alternatives(holiday: dict, alternatives: list[dict]) -> str:
    """Get AI-generated alternative suggestions."""
    prompt = f"""Based on these flight alternatives, give ONE specific recommendation (1-2 sentences):

Planned dates: {holiday.get('start_date')} to {holiday.get('end_date')}
Alternatives: {json.dumps(alternatives[:5])}

Focus on the best value option and why it's worth considering."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "max_tokens": 100,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[Insights] OpenAI alternatives error: {e}")
        return None


async def get_weather_forecast(
    holiday: dict,
    destination_city: str = None,
) -> dict[str, Any]:
    """
    Get weather forecast for the destination during travel dates.
    Uses OpenWeatherMap API for forecast data.
    """
    # Determine destination city
    if not destination_city:
        destinations = holiday.get("destinations", [])
        destination_city = destinations[0] if destinations else None
    
    if not destination_city:
        return {"error": "No destination specified"}
    
    # Map airport codes to city names (basic mapping)
    city_mapping = {
        "BCN": "Barcelona",
        "FCO": "Rome",
        "CDG": "Paris",
        "AMS": "Amsterdam",
        "LHR": "London",
        "DUB": "Dublin",
        "MAD": "Madrid",
        "LIS": "Lisbon",
        "BER": "Berlin",
        "VIE": "Vienna",
        "PRG": "Prague",
        "BUD": "Budapest",
        "ATH": "Athens",
        "IST": "Istanbul",
        "MXP": "Milan",
        "ZRH": "Zurich",
        "CPH": "Copenhagen",
        "OSL": "Oslo",
        "ARN": "Stockholm",
        "HEL": "Helsinki",
    }
    
    city_name = city_mapping.get(destination_city.upper(), destination_city)
    
    # Get travel dates
    start_date = holiday.get("start_date", "")
    end_date = holiday.get("end_date", "")
    
    try:
        # Fetch weather data from OpenWeatherMap
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Get coordinates first
            geo_response = await client.get(
                f"http://api.openweathermap.org/geo/1.0/direct",
                params={"q": city_name, "limit": 1, "appid": OPENWEATHER_API_KEY}
            )
            geo_data = geo_response.json()
            
            if not geo_data:
                return await _get_fallback_weather(city_name, start_date)
            
            lat, lon = geo_data[0]["lat"], geo_data[0]["lon"]
            
            # Get 5-day forecast (free tier limitation)
            weather_response = await client.get(
                f"http://api.openweathermap.org/data/2.5/forecast",
                params={
                    "lat": lat,
                    "lon": lon,
                    "appid": OPENWEATHER_API_KEY,
                    "units": "metric",
                }
            )
            weather_data = weather_response.json()
            
            if "list" not in weather_data:
                return await _get_fallback_weather(city_name, start_date)
            
            # Process forecast data
            forecasts = []
            seen_dates = set()
            
            for item in weather_data["list"]:
                dt = datetime.fromtimestamp(item["dt"])
                date_str = dt.strftime("%Y-%m-%d")
                
                if date_str in seen_dates:
                    continue
                seen_dates.add(date_str)
                
                forecasts.append({
                    "date": date_str,
                    "day": dt.strftime("%a"),
                    "temp_high": round(item["main"]["temp_max"]),
                    "temp_low": round(item["main"]["temp_min"]),
                    "condition": item["weather"][0]["main"],
                    "description": item["weather"][0]["description"],
                    "icon": item["weather"][0]["icon"],
                    "humidity": item["main"]["humidity"],
                    "wind_speed": round(item["wind"]["speed"] * 3.6),  # m/s to km/h
                })
            
            # Calculate averages
            avg_temp = sum(f["temp_high"] for f in forecasts) / len(forecasts) if forecasts else 0
            
            # Get AI weather summary if available
            ai_summary = None
            if settings.OPENAI_API_KEY:
                ai_summary = await _get_openai_weather_summary(city_name, forecasts, start_date, end_date)
            
            return {
                "type": "weather_forecast",
                "city": city_name,
                "airport_code": destination_city.upper(),
                "travel_dates": {
                    "start": start_date,
                    "end": end_date,
                },
                "forecast": forecasts[:7],  # Up to 7 days
                "summary": {
                    "avg_temperature": round(avg_temp),
                    "conditions": forecasts[0]["condition"] if forecasts else "Unknown",
                },
                "ai_summary": ai_summary or f"Expect around {round(avg_temp)}°C in {city_name}.",
                "packing_tips": _get_packing_tips(avg_temp, forecasts),
            }
            
    except Exception as e:
        print(f"[Insights] Weather API error: {e}")
        return await _get_fallback_weather(city_name, start_date)


async def _get_fallback_weather(city_name: str, travel_date: str) -> dict[str, Any]:
    """Fallback weather data when API fails."""
    # Use OpenAI to generate estimated weather if available
    if settings.OPENAI_API_KEY:
        try:
            month = ""
            if travel_date:
                try:
                    dt = datetime.fromisoformat(travel_date.replace("Z", ""))
                    month = dt.strftime("%B")
                except:
                    pass
            
            prompt = f"""What's the typical weather in {city_name} during {month or 'this time of year'}? 
Give a brief summary with estimated temperature range and conditions. Format as JSON:
{{"avg_temp": number, "condition": "Sunny/Cloudy/Rainy/etc", "description": "brief description"}}"""

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.5,
                    },
                )
                response.raise_for_status()
                data = response.json()
                text = data["choices"][0]["message"]["content"]
                
                json_match = re.search(r'\{[\s\S]*\}', text)
                if json_match:
                    weather_est = json.loads(json_match.group())
                    return {
                        "type": "weather_forecast",
                        "city": city_name,
                        "is_estimate": True,
                        "summary": {
                            "avg_temperature": weather_est.get("avg_temp", 20),
                            "conditions": weather_est.get("condition", "Variable"),
                        },
                        "ai_summary": weather_est.get("description", f"Typical weather for {city_name}"),
                        "forecast": [],
                    }
        except Exception as e:
            print(f"[Insights] Fallback weather error: {e}")
    
    return {
        "type": "weather_forecast",
        "city": city_name,
        "is_estimate": True,
        "error": "Weather data temporarily unavailable",
        "forecast": [],
    }


async def _get_openai_weather_summary(
    city: str,
    forecasts: list[dict],
    start_date: str,
    end_date: str,
) -> str:
    """Get AI-generated weather summary with packing advice."""
    prompt = f"""Based on this weather forecast for {city}, give a brief travel tip (1-2 sentences):

Travel dates: {start_date} to {end_date}
Forecast: {json.dumps(forecasts[:5])}

Include what to pack or expect. Be specific and helpful."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "max_tokens": 100,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[Insights] OpenAI weather summary error: {e}")
        return None


def _get_packing_tips(avg_temp: float, forecasts: list[dict]) -> list[str]:
    """Generate packing tips based on weather."""
    tips = []
    
    # Temperature-based tips
    if avg_temp < 10:
        tips.extend(["Warm jacket", "Layers", "Scarf & gloves"])
    elif avg_temp < 18:
        tips.extend(["Light jacket", "Long sleeves", "Comfortable layers"])
    elif avg_temp < 25:
        tips.extend(["Light clothing", "Sunglasses", "Light cardigan for evenings"])
    else:
        tips.extend(["Light, breathable clothes", "Sunscreen", "Hat", "Sunglasses"])
    
    # Check for rain
    has_rain = any(
        f.get("condition", "").lower() in ["rain", "drizzle", "thunderstorm"]
        for f in forecasts
    )
    if has_rain:
        tips.append("Umbrella or rain jacket")
    
    return tips


async def get_all_insights(holiday: dict, flights: list[dict]) -> dict[str, Any]:
    """Get all insights for a holiday."""
    if not flights:
        return {
            "price_analysis": {"error": "No flights available for analysis"},
            "alternative_suggestions": {"error": "No flights available for suggestions"},
            "weather_forecast": {"error": "No destination available"},
            "generated_at": datetime.utcnow().isoformat(),
        }
    
    # Get insights with error handling - if one fails, continue with others
    price_analysis = {"error": "Failed to generate price analysis"}
    alternatives = {"error": "Failed to generate alternative suggestions"}
    weather = {"error": "Failed to generate weather forecast"}
    
    try:
        price_analysis = await get_price_analysis(holiday, flights)
    except Exception as e:
        print(f"[Insights] Error in price analysis: {e}")
        price_analysis = {"error": f"Price analysis failed: {str(e)}"}
    
    try:
        alternatives = await get_alternative_suggestions(holiday, flights)
    except Exception as e:
        print(f"[Insights] Error in alternative suggestions: {e}")
        alternatives = {"error": f"Alternative suggestions failed: {str(e)}"}
    
    # Get weather for primary destination
    destination = None
    if flights:
        destination = flights[0].get("destination")
    elif holiday.get("destinations"):
        destination = holiday["destinations"][0] if holiday["destinations"] else None
    
    if destination:
        try:
            weather = await get_weather_forecast(holiday, destination)
        except Exception as e:
            print(f"[Insights] Error in weather forecast: {e}")
            weather = {"error": f"Weather forecast failed: {str(e)}"}
    else:
        weather = {"error": "No destination available for weather forecast"}
    
    return {
        "price_analysis": price_analysis,
        "alternative_suggestions": alternatives,
        "weather_forecast": weather,
        "generated_at": datetime.utcnow().isoformat(),
    }
