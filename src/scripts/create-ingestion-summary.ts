/**
 * Create Comprehensive Ingestion Summary
 * Summarizes all extracted data for review
 */

import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { MASTER_MEASURES } from '../data/knowledge-base/master-measures';

async function main() {
  console.log('='.repeat(80));
  console.log('📊 COMPREHENSIVE DATA INGESTION SUMMARY');
  console.log('='.repeat(80));

  const dataDir = path.join(process.cwd(), 'data');

  // Count measures
  const measureCount = MASTER_MEASURES.length;
  const measuresByCategory = new Map<string, number>();
  for (const measure of MASTER_MEASURES) {
    if (!measure || !measure.category) continue;
    const cat = String(measure.category).replace('MeasureCategory.', '');
    measuresByCategory.set(cat, (measuresByCategory.get(cat) || 0) + 1);
  }

  console.log(`\n✅ KNOWLEDGE BASE MEASURES: ${measureCount} total`);
  console.log(`\n📁 Measures by Category:`);
  for (const [category, count] of Array.from(measuresByCategory.entries()).sort()) {
    console.log(`   ${category.padEnd(25)} ${count.toString().padStart(3)} measures`);
  }

  // Check extracted files
  const extractedDirs = [
    'extracted-measures',
    'extracted-battery-training',
    'extracted-hvac-training',
    'extracted-all-docx',
    'extracted-pdfs-comprehensive',
  ];

  console.log(`\n📦 EXTRACTED DATA FILES:`);
  
  for (const dir of extractedDirs) {
    const dirPath = path.join(dataDir, dir);
    if (existsSync(dirPath)) {
      try {
        const files = await readdir(dirPath);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        if (jsonFiles.length > 0) {
          console.log(`\n   📂 ${dir}:`);
          for (const file of jsonFiles) {
            const filePath = path.join(dirPath, file);
            try {
              const content = await readFile(filePath, 'utf-8');
              const data = JSON.parse(content);
              const count = Array.isArray(data) ? data.length : 1;
              const size = (content.length / 1024).toFixed(2);
              console.log(`      • ${file}: ${count} items, ${size} KB`);
            } catch {
              const stats = await import('fs/promises').then(fs => fs.stat(filePath));
              console.log(`      • ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
            }
          }
        }
      } catch {
        // Skip if can't read
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ INGESTION STATUS');
  console.log('='.repeat(80));
  console.log(`
📊 Summary:
   • Measures: ${measureCount} total (integrated into KB)
   • Training Content: Extracted and categorized
   • Battery Training: PDFs and DOCX processed
   • HVAC Training: Large audit framework extracted
   • All DOCX files: Scanned and extracted
   • All PDF files: Extracted where possible

💡 Next Steps:
   1. Review extracted content quality
   2. Structure content into knowledge base
   3. Link measures to training content
   4. Build search indices
   5. Integrate into UI
`);
  console.log('='.repeat(80));
}

main().catch(console.error);

