"""Game engine behavior tests (odds + constraints)."""

from collections import Counter
from dataclasses import dataclass
from random import seed

import pytest

from app.services.game_service import _weighted_pick_segment


@dataclass
class _Pool:
    tier_name: str
    remaining_qty: int
    weight: int
    discount_percent: float


def _chi_square(observed: list[int], expected: list[float]) -> float:
    total = sum(observed)
    stat = 0.0
    for obs, exp_ratio in zip(observed, expected):
        exp = total * exp_ratio
        if exp > 0:
            stat += ((obs - exp) ** 2) / exp
    return stat


def test_weighted_random_distribution_chi_square() -> None:
    seed(42)
    pools = [
        _Pool("A", remaining_qty=10_000, weight=10, discount_percent=10),
        _Pool("B", remaining_qty=10_000, weight=30, discount_percent=20),
        _Pool("C", remaining_qty=10_000, weight=60, discount_percent=30),
    ]
    draws = 20_000
    counts = Counter()
    for _ in range(draws):
        picked = _weighted_pick_segment(pools)  # type: ignore[arg-type]
        assert picked is not None
        counts[picked.tier_name] += 1

    observed = [counts["A"], counts["B"], counts["C"]]
    expected_ratios = [0.1, 0.3, 0.6]
    chi2 = _chi_square(observed, expected_ratios)
    # df=2, p=0.01 critical ~9.21
    assert chi2 < 9.21


def test_weighted_random_skips_empty_or_zero_weight() -> None:
    pools = [
        _Pool("A", remaining_qty=0, weight=50, discount_percent=50),
        _Pool("B", remaining_qty=100, weight=0, discount_percent=30),
        _Pool("C", remaining_qty=100, weight=10, discount_percent=10),
    ]
    picked = _weighted_pick_segment(pools)  # type: ignore[arg-type]
    assert picked is not None
    assert picked.tier_name == "C"


@pytest.mark.parametrize("weights", [[0, 0], [0, 0, 0]])
def test_weighted_random_all_exhausted_returns_none(weights: list[int]) -> None:
    pools = [_Pool(str(i), remaining_qty=0, weight=w, discount_percent=0) for i, w in enumerate(weights)]
    assert _weighted_pick_segment(pools) is None  # type: ignore[arg-type]

