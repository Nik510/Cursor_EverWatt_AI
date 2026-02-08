"""
Extract PG&E rate research DOCX into normalized plain text for the rate library.
Outputs: src/utils/rates/data/pge-rate-research-notes.txt
"""

from __future__ import annotations

from pathlib import Path

from docx import Document


# Use environment variable or fallback to original source location
# Note: This is a one-time extraction script. Extracted data is stored in data/ folder.
import os
SRC = Path(os.getenv("TRAINING_DATA_BASE_PATH", r"C:\Users\nikjo\OneDrive\Desktop\EverWatt_Engine")) / "UTILITY_DATA" / "PG&E Rate Research for AI Calculator.docx"
DEST = Path("src/utils/rates/data/pge-rate-research-notes.txt")

TRANS = {
    "\u2019": "'",
    "\u2018": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2013": "-",
    "\u2014": "-",
    "\u2026": "...",
    "\u2022": "*",
    "\ufeff": "",
    "\xa0": " ",
    "\u2265": ">=",
    "\u2264": "<=",
}


def main() -> None:
    doc = Document(SRC)
    paragraphs = []
    for para in doc.paragraphs:
        text = para.text
        for k, v in TRANS.items():
            text = text.replace(k, v)
        text = text.encode("ascii", "ignore").decode("ascii").strip()
        if text:
            paragraphs.append(text)

    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text("\n\n".join(paragraphs), encoding="utf-8")
    print(f"Wrote {DEST} with {len(paragraphs)} paragraphs")


if __name__ == "__main__":
    main()
