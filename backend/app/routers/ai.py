"""AI-related routes."""
from fastapi import APIRouter, Depends, HTTPException, status

from ..core.auth import User, get_current_user, get_optional_user
from ..core.config import get_settings
from ..schemas.destination_discovery import DestinationDiscoveryInput, DestinationDiscoveryResult, DestinationItem
from ..services import destination_discovery

router = APIRouter(prefix="/ai", tags=["ai"])
settings = get_settings()


@router.post("/discover-destinations", response_model=DestinationDiscoveryResult)
async def discover_destinations_endpoint(
    input_data: DestinationDiscoveryInput,
    user: User | None = Depends(get_optional_user),
):
    """Discover 5 recommended destinations using AI.
    
    Uses OpenAI to generate destination recommendations based on:
    - Origin airports
    - Date range
    - Trip length preferences
    - Optional holiday description prompt
    - Other preferences (budget, weekdays, etc.)
    """
    try:
        # Call the discovery service
        destinations = await destination_discovery.discover_destinations(
            origins=input_data.origins,
            date_range=input_data.date_range,
            trip_lengths=input_data.trip_lengths,
            preferences=input_data.preferences,
            prompt=input_data.prompt,
        )
        
        # Convert to response format
        destination_items = [
            DestinationItem(
                city=d["city"],
                country=d["country"],
                airport=d["airport"],
                reason=d["reason"],
            )
            for d in destinations
        ]
        
        return DestinationDiscoveryResult(destinations=destination_items)
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[AI Discovery Endpoint] Error: {e}")
        print(f"[AI Discovery Endpoint] Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Could not discover destinations: {str(e)}"
        )
