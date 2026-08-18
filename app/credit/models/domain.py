"""Credit domain entities and value objects."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Iterable, Tuple


class CEFRLevel(str, Enum):
    """Supported CEFR proficiency levels for credit rules."""

    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"

    @classmethod
    def values(cls) -> Tuple[str, ...]:
        """Expose the allowed enum values."""
        return tuple(level.value for level in cls)


@dataclass(frozen=True)
class CreditRuleDefinition:
    """Canonical representation of a credit rule."""

    session_type: str
    activity_type: str
    points_cost: int
    level: CEFRLevel
    active: bool = True
    description: str | None = None

    def __post_init__(self) -> None:
        if not self.session_type:
            raise ValueError("session_type cannot be blank")
        if not self.activity_type:
            raise ValueError("activity_type cannot be blank")
        if self.points_cost < 0:
            raise ValueError("points_cost must be non-negative")

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CreditRuleDefinition":
        """Build a definition from repository data."""
        level_value = data.get("level")
        if not level_value:
            raise ValueError("level is required")

        try:
            level = CEFRLevel(level_value)
        except ValueError as exc:
            raise ValueError(f"Unsupported CEFR level: {level_value}") from exc

        return cls(
            session_type=data.get("session_type", "").strip(),
            activity_type=data.get("activity_type", "").strip(),
            points_cost=int(data.get("points_cost", 0)),
            level=level,
            active=bool(data.get("active", False)),
            description=data.get("description"),
        )


@dataclass(frozen=True)
class CreditRulesResult:
    """Aggregate result returned by the credit service."""

    level: CEFRLevel
    rules: Tuple[CreditRuleDefinition, ...]
    message: str

    @classmethod
    def build(cls, level: CEFRLevel, rules: Iterable[CreditRuleDefinition], message: str) -> "CreditRulesResult":
        return cls(level=level, rules=tuple(rules), message=message)

    def rule_count(self) -> int:
        return len(self.rules)
