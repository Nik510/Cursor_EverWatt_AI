"""
NIFS (Non-IOU Fuel Source) Calculation Engine
Core logic for calculating OBF-eligible savings based on usage data.
"""

import pandas as pd
from typing import List, Dict, Optional
from datetime import datetime


class NIFSCalculator:
    """
    Calculates OBF eligible savings based on NIFS rules:
    1. Negative usage (Net Export) = 0 savings
    2. Positive usage caps savings at the usage amount
    3. Monthly savings are distributed evenly, then capped
    """
    
    def __init__(self):
        self.results_cache = {}
    
    def calculate_nifs_eligibility(
        self,
        meter_id: str,
        annual_savings: float,
        usage_data: List[Dict[str, any]],
        monthly_target: Optional[float] = None
    ) -> Dict:
        """
        Calculates the OBF eligible savings based on NIFS rules.
        
        Args:
            meter_id: Service Account ID (SAID)
            annual_savings: Total expected savings for this meter (e.g., 22115.06)
            usage_data: List of dicts with 'date' and 'kwh' keys
                       [{'date': '2024-09-26', 'kwh': 3100}, ...]
            monthly_target: Optional override for monthly target (defaults to annual_savings / 12)
        
        Returns:
            Dictionary with calculation results including:
            - meter_id: Service Account ID
            - total_requested: Original annual savings request
            - total_eligible: Total eligible savings after capping
            - savings_lost: Difference between requested and eligible
            - breakdown: DataFrame with monthly details
        """
        
        # 1. Distribute Savings (Default: Even Split over 12 months)
        if monthly_target is None:
            monthly_target = annual_savings / 12
        
        results = []
        total_eligible_savings = 0
        
        for month in usage_data:
            usage = float(month['kwh'])
            bill_date = month.get('date', '')
            
            # --- THE CORE NIFS LOGIC ---
            # Rule 1: If usage is negative (Net Export), PG&E allows 0 savings.
            # Rule 2: If usage is positive, savings are capped at the usage amount.
            
            if usage <= 0:
                capped_savings = 0
                reason = "Net Export (Negative Usage)"
            else:
                capped_savings = min(monthly_target, usage)
                reason = "Capped by Usage" if usage < monthly_target else "Full Savings"
            
            results.append({
                "Bill Date": bill_date,
                "Grid Usage": usage,
                "Target Savings": monthly_target,
                "Eligible Savings": capped_savings,
                "Note": reason
            })
            
            total_eligible_savings += capped_savings

        # Create DataFrame for breakdown
        breakdown_df = pd.DataFrame(results)
        
        # Return a dictionary with all data needed for the Excel Report
        return {
            "meter_id": meter_id,
            "total_requested": annual_savings,
            "total_eligible": total_eligible_savings,
            "savings_lost": annual_savings - total_eligible_savings,
            "breakdown": breakdown_df,
            "monthly_target": monthly_target
        }
    
    def calculate_project_total(self, meter_results: List[Dict]) -> Dict:
        """
        Aggregates results from multiple meters for a project.
        
        Args:
            meter_results: List of results from calculate_nifs_eligibility()
        
        Returns:
            Dictionary with project-level totals
        """
        total_requested = sum(m['total_requested'] for m in meter_results)
        total_eligible = sum(m['total_eligible'] for m in meter_results)
        
        return {
            "total_requested": total_requested,
            "total_eligible": total_eligible,
            "total_savings_lost": total_requested - total_eligible,
            "meter_count": len(meter_results),
            "meters": meter_results
        }


def validate_usage_data(usage_data: List[Dict]) -> tuple:
    """
    Validates that usage data has the required format and 12 months.
    
    Returns:
        (is_valid, error_message)
    """
    if not usage_data:
        return False, "Usage data is empty"
    
    if len(usage_data) != 12:
        return False, f"Expected 12 months of data, got {len(usage_data)}"
    
    for i, month in enumerate(usage_data):
        if 'kwh' not in month:
            return False, f"Month {i+1} missing 'kwh' field"
        if 'date' not in month:
            return False, f"Month {i+1} missing 'date' field"
        
        try:
            float(month['kwh'])
        except (ValueError, TypeError):
            return False, f"Month {i+1} has invalid 'kwh' value: {month['kwh']}"
    
    return True, None

