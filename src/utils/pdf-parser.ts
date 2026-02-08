/**
 * PDF Parser Utility
 * Extracts text from PDF files
 */

import pdfParse from 'pdf-parse';
import { readFile } from 'fs/promises';

export interface ParsedPdf {
  title?: string;
  text: string;
  metadata: {
    pages: number;
    info: any;
  };
  sections?: string[];
}

export async function parsePdf(filePath: string): Promise<ParsedPdf> {
  try {
    const dataBuffer = await readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);

    // Try to extract title from first few lines
    const lines = pdfData.text.split('\n').filter(l => l.trim().length > 0);
    const title = lines[0]?.trim() || undefined;

    // Try to identify sections (lines that might be headings)
    const sections = identifySections(lines);

    return {
      title,
      text: pdfData.text,
      metadata: {
        pages: pdfData.numpages,
        info: pdfData.info,
      },
      sections,
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function identifySections(lines: string[]): string[] {
  const sections: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Likely section headers:
    // - Short lines (less than 80 chars)
    // - Title case or all caps
    // - Don't start with common words
    if (trimmed.length > 5 && 
        trimmed.length < 80 &&
        !trimmed.match(/^(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\s/i) &&
        (trimmed === trimmed.toUpperCase() || /^[A-Z]/.test(trimmed))) {
      sections.push(trimmed);
    }
  }
  
  return sections.slice(0, 20); // Limit to first 20 potential sections
}

