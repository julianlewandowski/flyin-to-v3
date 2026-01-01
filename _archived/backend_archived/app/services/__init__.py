# Services module
# Import core services first (these are used by multiple routes)
from . import (
    ai_scout,
    airhob,
    airports,
    date_optimizer,
    insights,
    llm_scorer,
    normalize,
    serpapi,
)

# Import destination_discovery separately to avoid breaking existing imports
# This is only used by the AI router, so we import it lazily
# Wrap in try/except to prevent import errors from breaking other services
try:
    from . import destination_discovery
except (ImportError, AttributeError, Exception) as e:
    # If destination_discovery fails to import, set it to None
    # This allows other services (like insights) to still work
    import sys
    print(f"[Services] Warning: Could not import destination_discovery: {e}", file=sys.stderr)
    destination_discovery = None
