#!/bin/bash

echo "Starting NIFS Solar Analysis Application..."
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed or not in PATH"
    echo "Please install Python 3.8+ and try again"
    exit 1
fi

# Check if streamlit is installed
if ! python3 -c "import streamlit" &> /dev/null; then
    echo "Installing required packages..."
    pip3 install -r requirements.txt
fi

# Run the app
echo "Launching Streamlit..."
streamlit run app.py

