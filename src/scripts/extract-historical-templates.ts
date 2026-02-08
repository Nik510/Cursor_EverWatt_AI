/**
 * Extract Historical Project Templates
 * Processes the 3 historical project template Excel files
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
const HISTORIC_TEMPLATES_PATH = path.join(BASE_PATH, 'EVERWATT AI', 'TRAINING DATA', 'HISTORIC PROJECT LIBRARY');

interface TemplateSchema {
  fileName: string;
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

async function analyzeTemplate(filePath: string): Promise<TemplateSchema> {
  const stats = await stat(filePath);
  const workbook = XLSX.readFile(filePath);

  const sheets: SheetInfo[] = [];

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    const headers = data.length > 0 ? data[0].map((h: any) => String(h || '')).filter((h: string) => h.trim().length > 0) : [];

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
    sheets,
    size: stats.size,
  };
}

async function main() {
  console.log('='.repeat(80));
  console.log('📊 EXTRACTING HISTORICAL PROJECT TEMPLATES');
  console.log('='.repeat(80));

  if (!existsSync(HISTORIC_TEMPLATES_PATH)) {
    console.error(`❌ Path not found: ${HISTORIC_TEMPLATES_PATH}`);
    process.exit(1);
  }

  const files = await readdir(HISTORIC_TEMPLATES_PATH);
  const excelFiles = files.filter(f => f.endsWith('.xlsx'));

  console.log(`\n✅ Found ${excelFiles.length} Excel template files\n`);

  const templates: TemplateSchema[] = [];

  for (const fileName of excelFiles) {
    const filePath = path.join(HISTORIC_TEMPLATES_PATH, fileName);
    console.log(`📊 Processing: ${fileName}`);

    try {
      const schema = await analyzeTemplate(filePath);
      console.log(`  ✅ Analyzed ${schema.sheets.length} sheet(s)`);
      
      schema.sheets.forEach(sheet => {
        console.log(`     • ${sheet.name}: ${sheet.rows} rows, ${sheet.headers.length} headers`);
      });

      templates.push(schema);
    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
  }

  // Save schemas
  const outputDir = path.join(process.cwd(), 'data', 'historical-project-templates');
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const schemasFile = path.join(outputDir, 'template-schemas.json');
  await writeFile(schemasFile, JSON.stringify(templates, null, 2));

  // Generate documentation
  let doc = '# Historical Project Template Schemas\n\n';
  doc += `Generated: ${new Date().toISOString()}\n\n`;
  doc += `**Total Templates:** ${templates.length}\n\n`;

  for (const template of templates) {
    doc += `## ${template.fileName}\n\n`;
    doc += `**Size:** ${(template.size / 1024).toFixed(2)} KB\n\n`;

    for (const sheet of template.sheets) {
      doc += `### Sheet: ${sheet.name}\n\n`;
      doc += `- **Rows:** ${sheet.rows}\n`;
      doc += `- **Columns:** ${sheet.columns}\n`;
      doc += `- **Headers:** ${sheet.headers.length}\n\n`;
      doc += `#### Fields:\n\n`;
      
      sheet.headers.forEach((header, index) => {
        const dataType = sheet.dataTypes[header] || 'unknown';
        doc += `${index + 1}. \`${header}\` (${dataType})\n`;
      });

      if (sheet.sampleData.length > 0) {
        doc += `\n#### Sample Data:\n\n`;
        doc += '```\n';
        doc += sheet.headers.join(' | ') + '\n';
        doc += '--- | '.repeat(sheet.headers.length - 1) + '---\n';
        sheet.sampleData.slice(0, 3).forEach(row => {
          doc += row.slice(0, sheet.headers.length).map(cell => String(cell || '')).join(' | ') + '\n';
        });
        doc += '```\n\n';
      }
      doc += '---\n\n';
    }
  }

  const docFile = path.join(outputDir, 'schema-documentation.md');
  await writeFile(docFile, doc);

  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Analyzed ${templates.length} template files`);
  
  let totalSheets = 0;
  let totalFields = 0;
  templates.forEach(t => {
    totalSheets += t.sheets.length;
    t.sheets.forEach(s => {
      totalFields += s.headers.length;
    });
  });

  console.log(`\n📊 Total: ${totalSheets} sheets, ${totalFields} unique fields`);
  console.log(`\n💾 Saved to: ${outputDir}`);
  console.log(`📄 Documentation: ${docFile}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

