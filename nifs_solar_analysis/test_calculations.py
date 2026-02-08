"""
Test script for NIFS calculation engine.
Verifies that the core logic works correctly.
"""

from nifs_engine import NIFSCalculator, validate_usage_data


def test_basic_calculation():
    """Test basic NIFS calculation with normal usage."""
    print("Test 1: Basic Calculation (No Capping)")
    print("-" * 60)
    
    calculator = NIFSCalculator()
    
    # 12 months of usage, all above monthly target
    usage_data = [
        {'date': f'2024-{i:02d}-26', 'kwh': 3000 + i * 100}
        for i in range(1, 13)
    ]
    
    result = calculator.calculate_nifs_eligibility(
        meter_id="TEST001",
        annual_savings=24000,  # 2000 kWh/month target
        usage_data=usage_data
    )
    
    print(f"Meter ID: {result['meter_id']}")
    print(f"Requested: {result['total_requested']:,.0f} kWh")
    print(f"Eligible: {result['total_eligible']:,.0f} kWh")
    print(f"Lost: {result['savings_lost']:,.0f} kWh")
    print(f"Expected: 24,000 kWh eligible (no capping)")
    
    assert result['total_eligible'] == 24000, "Should get full savings when usage > target"
    print("[PASSED]\n")


def test_capping_by_usage():
    """Test that savings are capped when usage is below target."""
    print("Test 2: Capping by Usage")
    print("-" * 60)
    
    calculator = NIFSCalculator()
    
    # Some months have low usage
    usage_data = [
        {'date': '2024-01-26', 'kwh': 5000},   # Above target (2000)
        {'date': '2024-02-26', 'kwh': 1500},   # Below target (capped at 1500)
        {'date': '2024-03-26', 'kwh': 1800},   # Below target (capped at 1800)
        {'date': '2024-04-26', 'kwh': 2200},   # Above target (2000)
        {'date': '2024-05-26', 'kwh': 2500},   # Above target (2000)
        {'date': '2024-06-26', 'kwh': 1200},   # Below target (capped at 1200)
        {'date': '2024-07-26', 'kwh': 3000},   # Above target (2000)
        {'date': '2024-08-26', 'kwh': 2800},   # Above target (2000)
        {'date': '2024-09-26', 'kwh': 1900},   # Below target (capped at 1900)
        {'date': '2024-10-26', 'kwh': 2100},   # Above target (2000)
        {'date': '2024-11-26', 'kwh': 1600},   # Below target (capped at 1600)
        {'date': '2024-12-26', 'kwh': 2400},   # Above target (2000)
    ]
    
    result = calculator.calculate_nifs_eligibility(
        meter_id="TEST002",
        annual_savings=24000,  # 2000 kWh/month target
        usage_data=usage_data
    )
    
    print(f"Meter ID: {result['meter_id']}")
    print(f"Requested: {result['total_requested']:,.0f} kWh")
    print(f"Eligible: {result['total_eligible']:,.0f} kWh")
    print(f"Lost: {result['savings_lost']:,.0f} kWh")
    
    # Calculate expected: 7 months at 2000 (full target) + 5 months capped at actual usage
    # Full months: Jan(5000), Apr(2200), May(2500), Jul(3000), Aug(2800), Oct(2100), Dec(2400) = 7 months
    # Capped months: Feb(1500), Mar(1800), Jun(1200), Sep(1900), Nov(1600) = 5 months
    expected = (7 * 2000) + 1500 + 1800 + 1200 + 1900 + 1600
    print(f"Expected: {expected:,.0f} kWh eligible")
    
    assert abs(result['total_eligible'] - expected) < 0.01, f"Expected {expected}, got {result['total_eligible']}"
    print("[PASSED]\n")


def test_negative_usage():
    """Test that negative usage (net export) results in 0 savings."""
    print("Test 3: Negative Usage (Net Export)")
    print("-" * 60)
    
    calculator = NIFSCalculator()
    
    # Some months have negative usage (net export)
    usage_data = [
        {'date': '2024-01-26', 'kwh': 2000},
        {'date': '2024-02-26', 'kwh': -500},   # Net export = 0 savings
        {'date': '2024-03-26', 'kwh': 1800},
        {'date': '2024-04-26', 'kwh': -200},   # Net export = 0 savings
        {'date': '2024-05-26', 'kwh': 2200},
        {'date': '2024-06-26', 'kwh': 0},      # Zero usage = 0 savings
        {'date': '2024-07-26', 'kwh': 3000},
        {'date': '2024-08-26', 'kwh': 2800},
        {'date': '2024-09-26', 'kwh': 1900},
        {'date': '2024-10-26', 'kwh': 2100},
        {'date': '2024-11-26', 'kwh': 1600},
        {'date': '2024-12-26', 'kwh': 2400},
    ]
    
    result = calculator.calculate_nifs_eligibility(
        meter_id="TEST003",
        annual_savings=24000,  # 2000 kWh/month target
        usage_data=usage_data
    )
    
    print(f"Meter ID: {result['meter_id']}")
    print(f"Requested: {result['total_requested']:,.0f} kWh")
    print(f"Eligible: {result['total_eligible']:,.0f} kWh")
    print(f"Lost: {result['savings_lost']:,.0f} kWh")
    
    # Check breakdown for negative months
    negative_months = result['breakdown'][result['breakdown']['Grid Usage'] <= 0]
    print(f"\nNegative/Zero Usage Months: {len(negative_months)}")
    for _, row in negative_months.iterrows():
        print(f"  {row['Bill Date']}: {row['Grid Usage']} kWh -> {row['Eligible Savings']} kWh ({row['Note']})")
    
    # All negative/zero months should have 0 eligible savings
    assert all(negative_months['Eligible Savings'] == 0), "Negative usage should result in 0 savings"
    print("[PASSED]\n")


def test_validation():
    """Test usage data validation."""
    print("Test 4: Data Validation")
    print("-" * 60)
    
    # Test empty data
    is_valid, error = validate_usage_data([])
    assert not is_valid, "Empty data should be invalid"
    print(f"[OK] Empty data correctly rejected: {error}")
    
    # Test wrong number of months
    data_10_months = [{'date': f'2024-{i:02d}-26', 'kwh': 2000} for i in range(1, 11)]
    is_valid, error = validate_usage_data(data_10_months)
    assert not is_valid, "10 months should be invalid"
    print(f"[OK] 10 months correctly rejected: {error}")
    
    # Test missing fields
    invalid_data = [{'date': f'2024-{i:02d}-26'} for i in range(1, 13)]  # Missing 'kwh'
    is_valid, error = validate_usage_data(invalid_data)
    assert not is_valid, "Missing kwh should be invalid"
    print(f"[OK] Missing kwh correctly rejected: {error}")
    
    # Test valid data
    valid_data = [{'date': f'2024-{i:02d}-26', 'kwh': 2000} for i in range(1, 13)]
    is_valid, error = validate_usage_data(valid_data)
    assert is_valid, "Valid data should pass"
    print(f"[OK] Valid data correctly accepted")
    print("[PASSED]\n")


def test_project_total():
    """Test project-level aggregation."""
    print("Test 5: Project Total Calculation")
    print("-" * 60)
    
    calculator = NIFSCalculator()
    
    # Create multiple meter results
    meter_results = []
    
    # Meter 1: Full savings
    usage1 = [{'date': f'2024-{i:02d}-26', 'kwh': 3000} for i in range(1, 13)]
    result1 = calculator.calculate_nifs_eligibility("METER001", 24000, usage1)
    meter_results.append(result1)
    
    # Meter 2: Capped savings
    usage2 = [{'date': f'2024-{i:02d}-26', 'kwh': 1500} for i in range(1, 13)]
    result2 = calculator.calculate_nifs_eligibility("METER002", 24000, usage2)
    meter_results.append(result2)
    
    # Calculate project total
    project_total = calculator.calculate_project_total(meter_results)
    
    print(f"Total Meters: {project_total['meter_count']}")
    print(f"Total Requested: {project_total['total_requested']:,.0f} kWh")
    print(f"Total Eligible: {project_total['total_eligible']:,.0f} kWh")
    print(f"Total Lost: {project_total['total_savings_lost']:,.0f} kWh")
    
    expected_requested = 24000 + 24000
    expected_eligible = 24000 + (12 * 1500)  # Meter 2 capped at 1500/month
    
    assert project_total['total_requested'] == expected_requested
    assert abs(project_total['total_eligible'] - expected_eligible) < 0.01
    print("[PASSED]\n")


def main():
    """Run all tests."""
    print("=" * 60)
    print("NIFS CALCULATION ENGINE TESTS")
    print("=" * 60)
    print()
    
    try:
        test_basic_calculation()
        test_capping_by_usage()
        test_negative_usage()
        test_validation()
        test_project_total()
        
        print("=" * 60)
        print("ALL TESTS PASSED!")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n[FAILED] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1
    except Exception as e:
        print(f"\n[ERROR] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())

