import fs from 'fs';
import path from 'path';

export interface RawIntervalRow {
  date: string;
  time: string;
  usage_kw: string | number; // Handles text or numbers
}

/**
 * Universal CSV Reader
 * Reads any CSV file and returns a list of data rows.
 */
export function parseCsv(filePath: string): Array<Record<string, string>> {
  // 1. Resolve the full path to the file
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ File not found: ${absolutePath}`);
    return [];
  }

  // 2. Read the file
  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  
  // 3. Parse lines (handle quoted values with commas)
  const lines = fileContent.trim().split('\n');
  
  // Parse CSV properly handling quoted fields
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }
  
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

  // 4. Convert to objects
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const entry: Record<string, string> = {};
    headers.forEach((h, i) => {
      // Remove quotes and whitespace
      const value = values[i] || '';
      entry[h] = value.replace(/^"|"$/g, '').replace(/\r/g, '').trim();
    });
    return entry;
  });
}