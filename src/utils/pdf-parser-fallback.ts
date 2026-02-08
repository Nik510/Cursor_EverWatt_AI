/**
 * PDF Parser Fallback - Simple text extraction
 * Uses alternative methods when pdfjs doesn't work
 */

import { readFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

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
 * Try to extract PDF text using pdftotext (if available) or simple fallback
 */
export async function parsePdfFallback(filePath: string): Promise<ParsedPdf> {
  try {
    // Try pdftotext command (if poppler-utils is installed)
    try {
      const outputFile = path.join(tmpdir(), `pdf_extract_${Date.now()}.txt`);
      await execAsync(`pdftotext "${filePath}" "${outputFile}"`);
      const text = await readFile(outputFile, 'utf-8');
      await import('fs/promises').then(fs => fs.unlink(outputFile).catch(() => {}));
      
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const title = lines[0]?.trim() || undefined;
      
      return {
        title,
        text,
        metadata: {
          pages: Math.ceil(text.length / 2000), // Estimate
          info: {},
        },
        sections: identifySections(lines),
      };
    } catch {
      // pdftotext not available, try pdfjs with simpler approach
      return await parsePdfSimple(filePath);
    }
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function parsePdfSimple(filePath: string): Promise<ParsedPdf> {
  // Last resort: read as binary and extract text chunks
  const buffer = await readFile(filePath);
  const text = extractTextFromPdfBuffer(buffer);
  
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const title = lines[0]?.trim() || undefined;
  
  return {
    title,
    text,
    metadata: {
      pages: Math.ceil(text.length / 2000),
      info: {},
    },
    sections: identifySections(lines),
  };
}

function extractTextFromPdfBuffer(buffer: Buffer): string {
  // Simple extraction: find readable text strings in PDF
  const text: string[] = [];
  let currentString = '';
  
  for (let i = 0; i < buffer.length - 1; i++) {
    const char = buffer[i];
    // Look for readable ASCII characters
    if (char >= 32 && char <= 126) {
      currentString += String.fromCharCode(char);
    } else if (currentString.length > 3) {
      // Found a readable string
      if (currentString.match(/^[A-Za-z0-9\s.,;:!?'"()-]+$/)) {
        text.push(currentString.trim());
      }
      currentString = '';
    } else {
      currentString = '';
    }
  }
  
  return text.join(' ');
}

function identifySections(lines: string[]): string[] {
  const sections: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.length > 5 && 
        trimmed.length < 80 &&
        !trimmed.match(/^(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\s/i) &&
        (trimmed === trimmed.toUpperCase() || /^[A-Z]/.test(trimmed))) {
      sections.push(trimmed);
    }
  }
  
  return sections.slice(0, 20);
}

