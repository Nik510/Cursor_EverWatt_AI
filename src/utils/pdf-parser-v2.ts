/**
 * PDF Parser V2 - Using pdf.js
 * Alternative PDF extraction method
 */

import { readFile } from 'fs/promises';
// Dynamic import for pdfjs-dist to handle ESM/CommonJS
let pdfjsLib: any;

async function getPdfJs() {
  if (!pdfjsLib) {
    try {
      // Try ESM import
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    } catch {
      // Fallback to CommonJS
      pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    }
  }
  return pdfjsLib;
}

export interface ParsedPdf {
  title?: string;
  text: string;
  metadata: {
    pages: number;
    info: any;
  };
  sections?: string[];
}

/**
 * Extract text from PDF using pdf.js
 */
export async function parsePdfV2(filePath: string): Promise<ParsedPdf> {
  try {
    const pdfjs = await getPdfJs();
    const dataBuffer = await readFile(filePath);
    const uint8Array = new Uint8Array(dataBuffer);

    // Load the PDF
    const loadingTask = pdfjs.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;

    // Extract text from all pages
    const textParts: string[] = [];
    let title: string | undefined;

    // Get metadata for title
    const metadata = await pdf.getMetadata();
    title = metadata.info?.Title || undefined;

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      textParts.push(pageText);
    }

    const fullText = textParts.join('\n\n');

    // Try to extract title from first few lines if metadata doesn't have it
    if (!title) {
      const lines = fullText.split('\n').filter(l => l.trim().length > 0);
      if (lines.length > 0 && lines[0].length < 100) {
        title = lines[0].trim();
      }
    }

    // Identify potential sections
    const sections = identifySections(fullText.split('\n'));

    return {
      title,
      text: fullText,
      metadata: {
        pages: pdf.numPages,
        info: metadata.info || {},
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
    
    // Likely section headers
    if (trimmed.length > 5 && 
        trimmed.length < 80 &&
        !trimmed.match(/^(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\s/i) &&
        (trimmed === trimmed.toUpperCase() || /^[A-Z]/.test(trimmed))) {
      sections.push(trimmed);
    }
  }
  
  return sections.slice(0, 20);
}

