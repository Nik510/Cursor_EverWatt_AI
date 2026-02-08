/**
 * Extract Excel Template Structure
 * Processes historical project templates to understand schema
 */

import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { readFile, mkdir, writeFile } from 'fs/promises';

// Use environment variable or fallback to original source location
// Note: These are one-time extraction scripts. Extracted data is stored in data/ folder.
const BASE_PATH = process.env.TRAINING_DATA_BASE_PATH || 
  'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine';

interface ExcelSchema {
  fileName: string;
  filePath: string;
  sheets: SheetInfo[];
  size: number;
}

interface SheetInfo {
  name: string;
  rows: number;
  columns: number;
  headers: string[];
  sampleData: any[][];
  dataTypes: Record<string, string>;
}

async function analyzeExcelFile(filePath: string, relativePath: string): Promise<ExcelSchema> {
  const stats = await stat(filePath);
  const workbook = XLSX.readFile(filePath);

  const sheets: SheetInfo[] = [];

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    // Get headers (first row)
    const headers = data.length > 0 ? data[0].map((h: any) => String(h || '')).filter((h: string) => h.trim().length > 0) : [];

    // Analyze data types from sample rows
    const dataTypes: Record<string, string> = {};
    if (headers.length > 0 && data.length > 1) {
      headers.forEach((header, colIndex) => {
        const sampleValues = data.slice(1, Math.min(6, data.length))
          .map(row => row[colIndex])
          .filter(val => val !== undefined && val !== null && val !== '');
        
        if (sampleValues.length > 0) {
          const firstValue = sampleValues[0];
          if (typeof firstValue === 'number') {
            dataTypes[header] = 'number';
          } else if (firstValue instanceof Date || (typeof firstValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(firstValue))) {
            dataTypes[header] = 'date';
          } else {
            dataTypes[header] = 'string';
          }
        } else {
          dataTypes[header] = 'unknown';
        }
      });
    }

    // Get sample data (first 5 rows after header)
    const sampleData = data.slice(1, Math.min(6, data.length));

    sheets.push({
      name: sheetName,
      rows: data.length,
      columns: headers.length,
      headers,
      sampleData,
      dataTypes,
    });
  });

  return {
    fileName: path.basename(filePath),
    filePath: relativePath,
    sheets,
    size: stats.size,
  };
}

async function scanForExcel(dirPath: string, basePath: string, found: string[] = []): Promise<string[]> {
  if (!existsSync(dirPath)) return found;

  try {
    const entries = await readdir(dirPath);
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;

      const fullPath = path.join(dirPath, entry);
      try {
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          await scanForExcel(fullPath, basePath, found);
        } else if (stats.isFile() && (entry.endsWith('.xlsx') || entry.endsWith('.xls'))) {
          found.push(fullPath);
        }
      } catch {
        continue;
      }
    }
  } catch {
    // Skip inaccessible directories
  }

  return found;
}

async function main() {
  console.log('='.repeat(80));
  console.log('📊 EXTRACTING EXCEL TEMPLATE STRUCTURES');
  console.log('='.repeat(80));

  // Scan for Excel files
  const trainingDataPath = path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING_DATA');
  const rootTrainingPath = path.join(BASE_PATH, 'TRAINING_DATA');
  const testDataPath = path.join(BASE_PATH, 'TEST DATA');
  
  const allExcelFiles: string[] = [];
  await scanForExcel(trainingDataPath, BASE_PATH, allExcelFiles);
  await scanForExcel(rootTrainingPath, BASE_PATH, allExcelFiles);
  await scanForExcel(testDataPath, BASE_PATH, allExcelFiles);

  // Remove duplicates
  const uniqueExcels = Array.from(new Set(allExcelFiles));

  console.log(`\n✅ Found ${uniqueExcels.length} Excel files\n`);

  const schemas: ExcelSchema[] = [];

  for (const filePath of uniqueExcels) {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(BASE_PATH, filePath);

    console.log(`📊 Processing: ${fileName}`);

    try {
      const schema = await analyzeExcelFile(filePath, relativePath);
      console.log(`  ✅ Analyzed ${schema.sheets.length} sheet(s)`);
      
      schema.sheets.forEach(sheet => {
        console.log(`     • ${sheet.name}: ${sheet.rows} rows, ${sheet.columns} columns, ${sheet.headers.length} headers`);
      });

      schemas.push(schema);
    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
  }

  // Save schemas
  const outputDir = path.join(process.cwd(), 'data', 'extracted-excel-schemas');
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const allFile = path.join(outputDir, 'all-schemas.json');
  await writeFile(allFile, JSON.stringify(schemas, null, 2));

  // Generate schema documentation
  const docFile = path.join(outputDir, 'schema-documentation.md');
  let doc = '# Excel Template Schema Documentation\n\n';
  
  for (const schema of schemas) {
    doc += `## ${schema.fileName}\n\n`;
    doc += `**Path:** ${schema.filePath}\n`;
    doc += `**Size:** ${(schema.size / 1024).toFixed(2)} KB\n\n`;

    for (const sheet of schema.sheets) {
      doc += `### Sheet: ${sheet.name}\n\n`;
      doc += `- **Rows:** ${sheet.rows}\n`;
      doc += `- **Columns:** ${sheet.columns}\n\n`;
      doc += `#### Headers (${sheet.headers.length}):\n\n`;
      
      sheet.headers.forEach((header, index) => {
        const dataType = sheet.dataTypes[header] || 'unknown';
        doc += `${index + 1}. \`${header}\` (${dataType})\n`;
      });

      if (sheet.sampleData.length > 0) {
        doc += `\n#### Sample Data (first ${sheet.sampleData.length} rows):\n\n`;
        doc += '```\n';
        doc += sheet.headers.join('\t') + '\n';
        sheet.sampleData.forEach(row => {
          doc += row.slice(0, sheet.headers.length).join('\t') + '\n';
        });
        doc += '```\n\n';
      }
    }
    doc += '---\n\n';
  }

  await writeFile(docFile, doc);

  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Analyzed ${schemas.length} Excel files`);
  
  let totalSheets = 0;
  let totalColumns = 0;
  schemas.forEach(s => {
    totalSheets += s.sheets.length;
    s.sheets.forEach(sh => {
      totalColumns += sh.headers.length;
    });
  });

  console.log(`\n📊 Total: ${totalSheets} sheets, ${totalColumns} unique columns/fields`);
  console.log(`\n💾 Saved to: ${outputDir}`);
  console.log(`📄 Documentation: ${docFile}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

