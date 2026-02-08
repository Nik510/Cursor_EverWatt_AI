"""
AI/OCR Component for extracting usage data from utility bills (PDF/CSV)
Uses OpenAI API or Azure Document Intelligence
"""

import os
import pandas as pd
from typing import List, Dict, Optional
from io import BytesIO
import pdfplumber
import PyPDF2


class UsageDataExtractor:
    """
    Extracts usage data from utility bills (PG&E Usage Reports).
    Supports both PDF and CSV formats.
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        """
        Initialize with optional OpenAI API key for advanced extraction.
        """
        self.openai_api_key = openai_api_key or os.getenv('OPENAI_API_KEY')
    
    def extract_from_file(self, file_path: str, file_type: Optional[str] = None) -> List[Dict]:
        """
        Extracts usage data from a utility bill file.
        
        Args:
            file_path: Path to PDF or CSV file
            file_type: 'pdf' or 'csv' (auto-detected if not provided)
        
        Returns:
            List of dicts with 'date' and 'kwh' keys
            [{'date': '2024-09-26', 'kwh': 3100}, ...]
        """
        if file_type is None:
            file_type = self._detect_file_type(file_path)
        
        if file_type == 'csv':
            return self._extract_from_csv(file_path)
        elif file_type == 'pdf':
            return self._extract_from_pdf(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    def _detect_file_type(self, file_path: str) -> str:
        """Detect file type from extension."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.csv':
            return 'csv'
        elif ext == '.pdf':
            return 'pdf'
        else:
            raise ValueError(f"Unknown file type: {ext}")
    
    def _extract_from_csv(self, file_path: str) -> List[Dict]:
        """
        Extracts usage data from CSV file.
        Looks for 'Bill End Date' and 'Total Usage' columns.
        """
        df = pd.read_csv(file_path)
        
        # Try to find date and usage columns (case-insensitive)
        date_col = None
        usage_col = None
        
        for col in df.columns:
            col_lower = col.lower()
            if 'date' in col_lower and ('end' in col_lower or 'bill' in col_lower):
                date_col = col
            elif 'usage' in col_lower and 'total' in col_lower:
                usage_col = col
            elif 'kwh' in col_lower:
                usage_col = col
        
        if date_col is None or usage_col is None:
            raise ValueError(
                f"Could not find required columns. Found: {list(df.columns)}\n"
                "Looking for 'Bill End Date' and 'Total Usage' or 'kWh'"
            )
        
        # Extract and clean data
        results = []
        for _, row in df.iterrows():
            date_val = row[date_col]
            usage_val = row[usage_col]
            
            # Skip rows with missing data
            if pd.isna(date_val) or pd.isna(usage_val):
                continue
            
            # Convert usage to float (handle commas, etc.)
            try:
                usage_float = float(str(usage_val).replace(',', ''))
            except (ValueError, TypeError):
                continue
            
            # Parse date
            if isinstance(date_val, str):
                # Try common date formats
                date_parsed = pd.to_datetime(date_val, errors='coerce')
            else:
                date_parsed = pd.to_datetime(date_val, errors='coerce')
            
            if pd.isna(date_parsed):
                continue
            
            results.append({
                'date': date_parsed.strftime('%Y-%m-%d'),
                'kwh': usage_float
            })
        
        # Sort by date
        results.sort(key=lambda x: x['date'])
        
        if len(results) < 12:
            print(f"Warning: Only found {len(results)} months of data, expected 12")
        
        return results[:12]  # Return up to 12 months
    
    def _extract_from_pdf(self, file_path: str) -> List[Dict]:
        """
        Extracts usage data from PDF using pdfplumber.
        Falls back to OpenAI API if available for complex layouts.
        """
        # Try pdfplumber first (good for table extraction)
        try:
            return self._extract_from_pdf_plumber(file_path)
        except Exception as e:
            print(f"pdfplumber extraction failed: {e}")
            
            # Fall back to OpenAI if available
            if self.openai_api_key:
                return self._extract_from_pdf_openai(file_path)
            else:
                raise ValueError(
                    f"PDF extraction failed and no OpenAI API key available.\n"
                    f"Error: {e}\n"
                    f"Please provide CSV format or set OPENAI_API_KEY environment variable."
                )
    
    def _extract_from_pdf_plumber(self, file_path: str) -> List[Dict]:
        """Extract using pdfplumber (good for structured tables)."""
        results = []
        
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                # Try to extract tables
                tables = page.extract_tables()
                
                for table in tables:
                    if not table:
                        continue
                    
                    # Look for header row with date/usage columns
                    header_row = None
                    for i, row in enumerate(table):
                        if not row:
                            continue
                        row_str = ' '.join(str(cell) if cell else '' for cell in row).lower()
                        if 'date' in row_str and ('usage' in row_str or 'kwh' in row_str):
                            header_row = i
                            break
                    
                    if header_row is None:
                        continue
                    
                    # Find column indices
                    date_col_idx = None
                    usage_col_idx = None
                    
                    header = table[header_row]
                    for j, cell in enumerate(header):
                        if not cell:
                            continue
                        cell_lower = str(cell).lower()
                        if 'date' in cell_lower:
                            date_col_idx = j
                        elif 'usage' in cell_lower or 'kwh' in cell_lower:
                            usage_col_idx = j
                    
                    if date_col_idx is None or usage_col_idx is None:
                        continue
                    
                    # Extract data rows
                    for row in table[header_row + 1:]:
                        if len(row) <= max(date_col_idx, usage_col_idx):
                            continue
                        
                        date_val = row[date_col_idx]
                        usage_val = row[usage_col_idx]
                        
                        if not date_val or not usage_val:
                            continue
                        
                        try:
                            date_parsed = pd.to_datetime(str(date_val), errors='coerce')
                            usage_float = float(str(usage_val).replace(',', ''))
                            
                            if pd.notna(date_parsed) and not pd.isna(usage_float):
                                results.append({
                                    'date': date_parsed.strftime('%Y-%m-%d'),
                                    'kwh': usage_float
                                })
                        except (ValueError, TypeError):
                            continue
        
        if len(results) < 12:
            raise ValueError(f"Only found {len(results)} months of data in PDF")
        
        # Sort and return 12 most recent
        results.sort(key=lambda x: x['date'])
        return results[-12:]
    
    def _extract_from_pdf_openai(self, file_path: str) -> List[Dict]:
        """
        Extract using OpenAI API (GPT-4 Vision) for complex PDF layouts.
        Requires OPENAI_API_KEY environment variable.
        """
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError("openai package required for AI extraction. Install with: pip install openai")
        
        client = OpenAI(api_key=self.openai_api_key)
        
        # Read PDF and convert to base64
        import base64
        with open(file_path, 'rb') as f:
            pdf_bytes = f.read()
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        # Use GPT-4 Vision to extract table data
        prompt = """
        Extract the usage data from this PG&E utility bill PDF.
        Find the 'Bill End Date' and 'Total Usage' (kWh) columns.
        Ignore gas usage. Return ONLY a JSON array with this exact format:
        [
            {"date": "2024-09-26", "kwh": 3100},
            {"date": "2024-08-26", "kwh": 2800},
            ...
        ]
        Include exactly 12 months of data. Dates should be in YYYY-MM-DD format.
        """
        
        # Note: This is a simplified version. Full implementation would use
        # the vision API properly. For now, we'll use a text-based approach.
        # In production, you'd use the vision API with the PDF image.
        
        # For now, raise an error suggesting CSV format
        raise NotImplementedError(
            "OpenAI PDF extraction not fully implemented.\n"
            "Please use CSV format or implement full OpenAI Vision API integration."
        )

