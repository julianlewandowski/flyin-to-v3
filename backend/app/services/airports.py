"""Airport utilities."""

# City codes that expand to multiple airports
CITY_AIRPORT_MAP = {
    "LON": ["LHR", "LGW", "STN", "LTN", "LCY", "SEN"],
    "NYC": ["JFK", "EWR", "LGA"],
    "PAR": ["CDG", "ORY"],
    "MIL": ["MXP", "LIN", "BGY"],
    "TYO": ["NRT", "HND"],
    "CHI": ["ORD", "MDW"],
    "WAS": ["IAD", "DCA", "BWI"],
    "SFO": ["SFO", "OAK", "SJC"],
    "LAX": ["LAX", "BUR", "LGB", "SNA", "ONT"],
    "BER": ["BER"],
    "ROM": ["FCO", "CIA"],
    "MOS": ["SVO", "DME", "VKO"],
    "BKK": ["BKK", "DMK"],
    "SEL": ["ICN", "GMP"],
    "SHA": ["PVG", "SHA"],
    "BJS": ["PEK", "PKX"],
}


def expand_city_airport(code: str) -> list[str]:
    """Expand a city code to its airports, or return the code as-is."""
    code = code.upper().strip()
    return CITY_AIRPORT_MAP.get(code, [code])


def expand_airports(codes: list[str]) -> list[str]:
    """Expand a list of codes, handling city codes."""
    expanded = []
    for code in codes:
        expanded.extend(expand_city_airport(code))
    return list(set(expanded))  # Remove duplicates
