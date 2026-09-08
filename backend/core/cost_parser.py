from __future__ import annotations

import re

_NUMBER_RE = re.compile(r"\d{1,3}(?:,\d{3})*(?:\.\d+)?")


def parse_cost_amount(text: str, travelers: int) -> float | None:
    """Extract a rough total-trip cost (in the trip's currency) from a free-text
    LLM-generated estimate such as '~€1,200 - €1,500 total per person'."""
    numbers = [float(m.replace(",", "")) for m in _NUMBER_RE.findall(text)]
    if not numbers:
        return None

    amount = sum(numbers) / len(numbers)

    if "per person" in text.lower() or "/person" in text.lower():
        amount *= max(travelers, 1)

    return round(amount, 2)
