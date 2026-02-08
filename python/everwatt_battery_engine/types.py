from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Callable, Dict, Iterable, List, Optional, Sequence, Tuple


@dataclass(frozen=True)
class Interval:
    """
    A single demand interval.

    - kw is site import demand in kW (positive = import).
    - timestamp is an ISO string (UTC recommended) or any string parseable by pandas.
    """

    timestamp: str
    kw: float


@dataclass(frozen=True)
class BatterySKU:
    """
    Battery SKU definition from the battery catalog.
    Prices are per-unit equipment prices by volume tier; interpret per your business rules.
    """

    id: str
    manufacturer: str
    energy_kwh: float
    power_kw: float
    c_rate: float
    round_trip_efficiency: float  # 0..1
    warranty_years: float
    max_cycles_per_day: float | None
    # price tiers (per unit)
    price_1_10: float
    price_11_20: float
    price_21_50: float
    price_50_plus: float
    active: bool = True

    def max_continuous_power_kw(self) -> float:
        """
        Enforce a C-rate limit if it is more restrictive than nameplate.
        """
        return float(min(self.power_kw, self.c_rate * self.energy_kwh))


@dataclass(frozen=True)
class Bundle:
    """
    A chosen mix/match battery bundle (integer quantities of SKUs).
    """

    sku_qty: Dict[str, int]
    total_power_kw: float
    total_energy_kwh: float
    capex_usd: float
    # efficiency is modeled as a single effective RTE for the bundle (default weighted by energy)
    round_trip_efficiency: float
    # optional throughput limit (kWh discharged) over the optimization horizon (cycle constraint proxy)
    discharge_throughput_limit_kwh: float | None = None


class OptimizationMode(str, Enum):
    """
    Three-mode pricing/selection, as requested:
    - PROFIT_MAX: maximize EverWatt gross profit dollars (price up to payback ceiling)
    - EVERWATT_ENGINE: maximize expected TSV using a default close-probability model
    - CUSTOMER_BENEFIT: minimize customer price / maximize customer ROI (price near capex)
    """

    PROFIT_MAX = "profit_max"
    EVERWATT_ENGINE = "everwatt_engine"
    CUSTOMER_BENEFIT = "customer_benefit"


@dataclass(frozen=True)
class PriceOffer:
    mode: OptimizationMode
    price_usd: float
    savings_usd_per_year: float
    payback_years: float
    gross_margin_usd: float
    gross_margin_frac: float
    tsv: float  # Savings * GM%
    roi: float  # Savings / Price
    # Optional expected value model (used by EVERWATT_ENGINE)
    close_probability: float | None = None
    expected_tsv: float | None = None


@dataclass(frozen=True)
class TariffScenarioSpec:
    """
    Describes a tariff scenario we can evaluate.
    We intentionally keep this lightweight so we can swap implementations later.
    """

    id: str
    name: str
    kind: str  # e.g., "pge_b19", "pge_b19_option_s", "custom"


@dataclass(frozen=True)
class OptimizationConfig:
    no_export: bool = True
    interconnect_kw: float | None = None
    # Payback ceiling: Price <= payback_ceiling_years * annual_savings
    payback_ceiling_years: float = 10.0
    # Pricing search grid size for EVERWATT_ENGINE mode (and general debug)
    price_grid_points: int = 21
    # CapEx adders (optional): CapEx_total = equipment_cost * (1 + install_adder_frac) + fixed_soft_costs
    install_adder_frac: float = 0.0
    fixed_soft_costs_usd: float = 0.0
    # Close probability model hyperparameters (used for EVERWATT_ENGINE mode by default)
    close_prob_mid_payback_years: float = 6.5
    close_prob_steepness: float = 1.2


@dataclass(frozen=True)
class OptimizationResult:
    scenario: TariffScenarioSpec
    bundle: Bundle
    baseline_bill_usd_per_year: float
    optimized_bill_usd_per_year: float
    savings_usd_per_year: float
    # Demand impacts
    peak_kw_before: float
    peak_kw_after: float
    # Offers (three-mode)
    offers: List[PriceOffer]
    # Dispatch series (optional)
    net_kw_series: List[float] | None = None
    charge_kw_series: List[float] | None = None
    discharge_kw_series: List[float] | None = None
    soc_kwh_series: List[float] | None = None
    solver_status: str | None = None

