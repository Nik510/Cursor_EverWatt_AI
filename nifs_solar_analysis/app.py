"""
NIFS Solar Analysis Application
Streamlit web interface for OBF qualification analysis.
"""

import streamlit as st
import pandas as pd
import os
from pathlib import Path
from typing import Dict, List, Optional
import tempfile

try:
    from nifs_engine import NIFSCalculator, validate_usage_data
    from excel_generator import NIFSExcelGenerator
    from ai_extractor import UsageDataExtractor
except ImportError:
    # Handle relative imports
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent))
    from nifs_engine import NIFSCalculator, validate_usage_data
    from excel_generator import NIFSExcelGenerator
    from ai_extractor import UsageDataExtractor

# Page configuration
st.set_page_config(
    page_title="NIFS Solar Analysis",
    page_icon="☀️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
if 'project_data' not in st.session_state:
    st.session_state.project_data = {
        'project_name': '',
        'total_project_savings': 0.0,
        'meters': []
    }

if 'current_step' not in st.session_state:
    st.session_state.current_step = 1

# Initialize components
calculator = NIFSCalculator()

# Get template path
TEMPLATE_PATH = os.getenv(
    'TEMPLATE_PATH',
    r'C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine\REPORT_APP\SOLAR\016647 - NIFS Analysis Template.xlsx'
)

# Check if template exists
template_exists = os.path.exists(TEMPLATE_PATH)
if not template_exists:
    st.error(f"⚠️ Template not found at: {TEMPLATE_PATH}")
    st.info("Please set the TEMPLATE_PATH environment variable or update the path in app.py")


def render_step_1():
    """Step 1: Project Initialization"""
    st.header("📋 Step 1: Project Initialization")
    
    col1, col2 = st.columns(2)
    
    with col1:
        project_name = st.text_input(
            "Project Name",
            value=st.session_state.project_data.get('project_name', ''),
            help="Enter a descriptive name for this project"
        )
    
    with col2:
        total_savings = st.number_input(
            "Total Estimated Project Savings (kWh)",
            min_value=0.0,
            value=float(st.session_state.project_data.get('total_project_savings', 0.0)),
            step=100.0,
            help="Total annual savings expected from the solar installation"
        )
    
    st.session_state.project_data['project_name'] = project_name
    st.session_state.project_data['total_project_savings'] = total_savings
    
    if project_name and total_savings > 0:
        st.success(f"✅ Project '{project_name}' initialized with {total_savings:,.0f} kWh total savings")
        return True
    else:
        st.warning("Please fill in both fields to continue")
        return False


def render_step_2():
    """Step 2: Meter Analysis"""
    st.header("🔌 Step 2: Meter Analysis")
    
    meters = st.session_state.project_data.get('meters', [])
    total_savings = st.session_state.project_data.get('total_project_savings', 0.0)
    
    # Calculate remaining savings
    allocated_savings = sum(m.get('allocated_savings', 0) for m in meters if m.get('has_solar', False))
    remaining_savings = total_savings - allocated_savings
    
    st.info(f"**Total Project Savings:** {total_savings:,.0f} kWh | "
            f"**Allocated:** {allocated_savings:,.0f} kWh | "
            f"**Remaining:** {remaining_savings:,.0f} kWh")
    
    # Add new meter section
    with st.expander("➕ Add New Meter", expanded=len(meters) == 0):
        col1, col2 = st.columns(2)
        
        with col1:
            new_meter_id = st.text_input("Service Account ID (SAID)", key="new_meter_id")
        
        with col2:
            has_solar = st.checkbox("Has Solar on this meter?", key="new_has_solar")
        
        if has_solar:
            allocated = st.number_input(
                "Allocated Savings (kWh)",
                min_value=0.0,
                max_value=remaining_savings if remaining_savings > 0 else total_savings,
                value=min(remaining_savings, total_savings) if remaining_savings > 0 else 0.0,
                step=100.0,
                key="new_allocated"
            )
        else:
            allocated = remaining_savings if remaining_savings > 0 else total_savings
        
        # Usage history input
        usage_data = None
        if has_solar:
            st.subheader("Usage History")
            
            # File upload option
            uploaded_file = st.file_uploader(
                "Upload PG&E Usage Report (PDF or CSV)",
                type=['pdf', 'csv'],
                key="usage_file_upload"
            )
            
            if uploaded_file:
                # Save uploaded file temporarily
                with tempfile.NamedTemporaryFile(delete=False, suffix=f".{uploaded_file.name.split('.')[-1]}") as tmp_file:
                    tmp_file.write(uploaded_file.read())
                    tmp_path = tmp_file.name
                
                try:
                    extractor = UsageDataExtractor()
                    usage_data = extractor.extract_from_file(tmp_path)
                    
                    # Display extracted data
                    st.success(f"✅ Extracted {len(usage_data)} months of usage data")
                    
                    df_display = pd.DataFrame(usage_data)
                    st.dataframe(df_display, use_container_width=True)
                    
                    # Allow manual editing
                    if st.checkbox("Edit extracted data", key="edit_usage"):
                        edited_df = st.data_editor(df_display, use_container_width=True)
                        usage_data = edited_df.to_dict('records')
                    
                    os.unlink(tmp_path)  # Clean up temp file
                    
                except Exception as e:
                    st.error(f"❌ Error extracting data: {e}")
                    st.info("You can manually enter usage data below")
                    usage_data = None
            
            # Manual entry option
            if usage_data is None:
                st.subheader("Or Enter Usage Data Manually")
                manual_data = []
                
                for i in range(12):
                    col1, col2 = st.columns(2)
                    with col1:
                        date = st.date_input(f"Month {i+1} - Bill End Date", key=f"date_{i}")
                    with col2:
                        kwh = st.number_input(f"Month {i+1} - Total Usage (kWh)", min_value=0.0, key=f"kwh_{i}")
                    
                    manual_data.append({
                        'date': date.strftime('%Y-%m-%d'),
                        'kwh': kwh
                    })
                
                usage_data = manual_data
        
        # Add meter button
        if st.button("Add Meter", type="primary", key="add_meter_btn"):
            if not new_meter_id:
                st.error("Please enter a Service Account ID")
            elif has_solar and not usage_data:
                st.error("Please provide usage history for meters with solar")
            else:
                # Calculate NIFS eligibility
                if has_solar and usage_data:
                    # Validate usage data
                    is_valid, error_msg = validate_usage_data(usage_data)
                    if not is_valid:
                        st.error(f"Invalid usage data: {error_msg}")
                    else:
                        result = calculator.calculate_nifs_eligibility(
                            new_meter_id,
                            allocated,
                            usage_data
                        )
                        
                        meter_data = {
                            'id': new_meter_id,
                            'has_solar': True,
                            'allocated_savings': allocated,
                            'result': result
                        }
                else:
                    # Non-solar meter gets full remaining savings
                    meter_data = {
                        'id': new_meter_id,
                        'has_solar': False,
                        'allocated_savings': allocated,
                        'result': {
                            'total_requested': allocated,
                            'total_eligible': allocated,
                            'savings_lost': 0.0,
                            'breakdown': pd.DataFrame()
                        }
                    }
                
                st.session_state.project_data['meters'].append(meter_data)
                st.success(f"✅ Meter {new_meter_id} added")
                st.rerun()
    
    # Display existing meters
    if meters:
        st.subheader("📊 Current Meters")
        
        for i, meter in enumerate(meters):
            with st.expander(f"Meter {i+1}: {meter['id']} {'☀️' if meter['has_solar'] else '⚡'}", expanded=False):
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    st.write(f"**SAID:** {meter['id']}")
                    st.write(f"**Has Solar:** {'Yes' if meter['has_solar'] else 'No'}")
                
                with col2:
                    if meter['has_solar']:
                        result = meter['result']
                        st.write(f"**Requested:** {result['total_requested']:,.0f} kWh")
                        st.write(f"**Eligible:** {result['total_eligible']:,.0f} kWh")
                        st.write(f"**Lost:** {result['savings_lost']:,.0f} kWh")
                
                with col3:
                    if meter['has_solar'] and not meter['result']['breakdown'].empty:
                        st.dataframe(meter['result']['breakdown'], use_container_width=True)
                
                if st.button(f"Remove Meter {i+1}", key=f"remove_{i}"):
                    st.session_state.project_data['meters'].pop(i)
                    st.rerun()
    
    # Check if we can proceed
    if len(meters) > 0:
        total_allocated = sum(m.get('allocated_savings', 0) for m in meters)
        if abs(total_allocated - total_savings) < 0.01:  # Allow small floating point differences
            return True
        else:
            st.warning(f"⚠️ Total allocated ({total_allocated:,.0f} kWh) doesn't match project total ({total_savings:,.0f} kWh)")
    
    return len(meters) > 0


def render_step_3():
    """Step 3: Calculation & Export"""
    st.header("📊 Step 3: Review & Export")
    
    project_data = st.session_state.project_data
    meters = project_data.get('meters', [])
    
    if not meters:
        st.warning("Please add at least one meter in Step 2")
        return False
    
    # Calculate project totals
    project_result = calculator.calculate_project_total(
        [m['result'] for m in meters]
    )
    
    # Display summary
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Requested", f"{project_result['total_requested']:,.0f} kWh")
    
    with col2:
        st.metric("Total Eligible", f"{project_result['total_eligible']:,.0f} kWh")
    
    with col3:
        st.metric("Savings Lost", f"{project_result['total_savings_lost']:,.0f} kWh")
    
    with col4:
        efficiency = (project_result['total_eligible'] / project_result['total_requested'] * 100) if project_result['total_requested'] > 0 else 0
        st.metric("Efficiency", f"{efficiency:.1f}%")
    
    # Visual chart
    st.subheader("📈 Savings Breakdown by Meter")
    
    chart_data = []
    for meter in meters:
        if meter['has_solar']:
            chart_data.append({
                'Meter': meter['id'],
                'Requested': meter['result']['total_requested'],
                'Eligible': meter['result']['total_eligible']
            })
    
    if chart_data:
        df_chart = pd.DataFrame(chart_data)
        st.bar_chart(df_chart.set_index('Meter'))
    
    # Detailed breakdown
    st.subheader("📋 Detailed Meter Analysis")
    
    for meter in meters:
        if meter['has_solar']:
            with st.expander(f"Meter: {meter['id']} - Detailed Breakdown"):
                result = meter['result']
                
                st.write(f"**Requested Savings:** {result['total_requested']:,.0f} kWh")
                st.write(f"**Eligible Savings:** {result['total_eligible']:,.0f} kWh")
                st.write(f"**Savings Lost:** {result['savings_lost']:,.0f} kWh")
                
                if not result['breakdown'].empty:
                    st.dataframe(result['breakdown'], use_container_width=True)
                    
                    # Highlight capped months
                    capped_months = result['breakdown'][result['breakdown']['Note'].str.contains('Capped', na=False)]
                    if not capped_months.empty:
                        st.warning(f"⚠️ {len(capped_months)} months were capped by usage limits")
    
    # Export section
    st.subheader("💾 Generate Submission File")
    
    if not template_exists:
        st.error("Cannot generate file: Template not found")
        return False
    
    if st.button("Generate Excel Report", type="primary", use_container_width=True):
        try:
            generator = NIFSExcelGenerator(TEMPLATE_PATH)
            
            # Create output filename
            project_name_safe = "".join(c for c in project_data['project_name'] if c.isalnum() or c in (' ', '-', '_')).strip()
            output_filename = f"NIFS_Analysis_{project_name_safe}.xlsx"
            
            # Generate file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
                output_path = generator.generate_report(project_data, tmp_file.name)
                
                # Read file and provide download
                with open(output_path, 'rb') as f:
                    st.download_button(
                        label="📥 Download Excel File",
                        data=f.read(),
                        file_name=output_filename,
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        use_container_width=True
                    )
                
                os.unlink(output_path)  # Clean up
            
            st.success("✅ Excel file generated successfully!")
            
        except Exception as e:
            st.error(f"❌ Error generating file: {e}")
            st.exception(e)
    
    return True


# Main app
def main():
    st.title("☀️ NIFS Solar Analysis Tool")
    st.markdown("**OBF Qualification Analysis for Solar Projects**")
    
    # Sidebar navigation
    with st.sidebar:
        st.header("Navigation")
        
        if st.button("Step 1: Project Init", use_container_width=True, 
                    type="primary" if st.session_state.current_step == 1 else "secondary"):
            st.session_state.current_step = 1
            st.rerun()
        
        if st.button("Step 2: Meter Analysis", use_container_width=True,
                    type="primary" if st.session_state.current_step == 2 else "secondary"):
            st.session_state.current_step = 2
            st.rerun()
        
        if st.button("Step 3: Export", use_container_width=True,
                    type="primary" if st.session_state.current_step == 3 else "secondary"):
            st.session_state.current_step = 3
            st.rerun()
        
        st.divider()
        
        if st.button("🔄 Reset Project", use_container_width=True):
            st.session_state.project_data = {
                'project_name': '',
                'total_project_savings': 0.0,
                'meters': []
            }
            st.session_state.current_step = 1
            st.rerun()
    
    # Render current step
    if st.session_state.current_step == 1:
        if render_step_1():
            if st.button("Next: Meter Analysis →", type="primary", use_container_width=True):
                st.session_state.current_step = 2
                st.rerun()
    
    elif st.session_state.current_step == 2:
        if render_step_2():
            if st.button("Next: Review & Export →", type="primary", use_container_width=True):
                st.session_state.current_step = 3
                st.rerun()
        if st.button("← Back to Project Init", use_container_width=True):
            st.session_state.current_step = 1
            st.rerun()
    
    elif st.session_state.current_step == 3:
        render_step_3()
        if st.button("← Back to Meter Analysis", use_container_width=True):
            st.session_state.current_step = 2
            st.rerun()


if __name__ == "__main__":
    main()

