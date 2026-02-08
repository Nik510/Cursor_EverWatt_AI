"""
Utility script to inspect the NIFS template structure.
Helps identify cell references for the Excel generator.
"""

import sys
import json
from excel_generator import NIFSExcelGenerator


def main():
    if len(sys.argv) < 2:
        print("Usage: python inspect_template.py <path_to_template.xlsx>")
        print("\nExample:")
        print('  python inspect_template.py "C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine\\REPORT_APP\\SOLAR\\016647 - NIFS Analysis Template.xlsx"')
        sys.exit(1)
    
    template_path = sys.argv[1]
    
    try:
        generator = NIFSExcelGenerator(template_path)
        info = generator.inspect_template()
        
        print("=" * 80)
        print("NIFS TEMPLATE STRUCTURE")
        print("=" * 80)
        print(f"\nTemplate Path: {template_path}")
        print(f"\nSheet Names: {info['sheet_names']}")
        
        for sheet_name, sheet_info in info['sheets'].items():
            print(f"\n{'=' * 80}")
            print(f"SHEET: {sheet_name}")
            print(f"{'=' * 80}")
            print(f"Max Row: {sheet_info['max_row']}")
            print(f"Max Column: {sheet_info['max_column']}")
            print(f"\nSample Cells (first 30 rows, first 10 columns):")
            print("-" * 80)
            
            # Group by row for better readability
            rows = {}
            for cell_ref, value in sheet_info['sample_cells'].items():
                row_num = ''.join(filter(str.isdigit, cell_ref))
                if row_num not in rows:
                    rows[row_num] = {}
                rows[row_num][cell_ref] = value
            
            for row_num in sorted(rows.keys(), key=int)[:30]:
                print(f"\nRow {row_num}:")
                for cell_ref in sorted(rows[row_num].keys()):
                    print(f"  {cell_ref}: {rows[row_num][cell_ref]}")
        
        # Save to JSON for reference
        output_file = "template_structure.json"
        with open(output_file, 'w') as f:
            json.dump(info, f, indent=2, default=str)
        
        print(f"\n{'=' * 80}")
        print(f"Full structure saved to: {output_file}")
        print("=" * 80)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

