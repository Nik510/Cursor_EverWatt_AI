/**
 * Merge All Extracted Content
 * Combines PDF, DOCX, and Excel extracted content into unified structure
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

async function main() {
  console.log('='.repeat(80));
  console.log('🔄 MERGING ALL EXTRACTED CONTENT');
  console.log('='.repeat(80));

  const dataDir = path.join(process.cwd(), 'data');

  // Load all extracted content
  const allContent: any[] = [];

  // Load DOCX content
  try {
    const docxPath = path.join(dataDir, 'extracted-all-docx', 'all-extracted.json');
    const docxContent = JSON.parse(await readFile(docxPath, 'utf-8'));
    console.log(`\n📄 Loaded ${docxContent.length} DOCX files`);
    allContent.push(...docxContent.map((doc: any) => ({
      ...doc,
      sourceType: 'docx',
      extractedFrom: doc.fileName,
    })));
  } catch (error) {
    console.log(`  ⚠️  Could not load DOCX content: ${error}`);
  }

  // Load PDF content
  try {
    const pdfPath = path.join(dataDir, 'extracted-pdfs-v2', 'all-pdfs-extracted.json');
    const pdfContent = JSON.parse(await readFile(pdfPath, 'utf-8'));
    console.log(`📄 Loaded ${pdfContent.length} PDF files`);
    allContent.push(...pdfContent.map((pdf: any) => ({
      fileName: pdf.fileName,
      filePath: pdf.filePath,
      title: pdf.title,
      content: pdf.text, // PDF uses 'text' field
      size: pdf.size,
      category: pdf.category,
      sourceType: 'pdf',
      extractedFrom: pdf.fileName,
      pages: pdf.pages,
    })));
  } catch (error) {
    console.log(`  ⚠️  Could not load PDF content: ${error}`);
  }

  // Remove duplicates (by filename)
  const uniqueContent = new Map<string, any>();
  for (const item of allContent) {
    const key = item.fileName.toLowerCase();
    // Prefer PDF if both exist (more recent extraction)
    if (!uniqueContent.has(key) || item.sourceType === 'pdf') {
      uniqueContent.set(key, item);
    }
  }

  console.log(`\n✅ Total unique documents: ${uniqueContent.size}`);

  // Save merged content
  const mergedContent = Array.from(uniqueContent.values());
  const outputPath = path.join(dataDir, 'merged-all-content.json');
  await writeFile(outputPath, JSON.stringify(mergedContent, null, 2));

  // Summary by type
  const byType = new Map<string, number>();
  const byCategory = new Map<string, number>();
  
  mergedContent.forEach(item => {
    byType.set(item.sourceType || 'unknown', (byType.get(item.sourceType || 'unknown') || 0) + 1);
    byCategory.set(item.category || 'unknown', (byCategory.get(item.category || 'unknown') || 0) + 1);
  });

  console.log(`\n📊 By Source Type:`);
  for (const [type, count] of Array.from(byType.entries()).sort()) {
    console.log(`   ${type}: ${count} files`);
  }

  console.log(`\n📁 By Category:`);
  for (const [category, count] of Array.from(byCategory.entries()).sort()) {
    console.log(`   ${category}: ${count} files`);
  }

  // Total content size
  const totalContentSize = mergedContent.reduce((sum, item) => {
    const contentSize = typeof item.content === 'string' ? item.content.length : 0;
    return sum + contentSize;
  }, 0);

  console.log(`\n💾 Total extracted content: ${(totalContentSize / 1024).toFixed(2)} KB`);
  console.log(`💾 Saved merged content to: ${outputPath}`);
  console.log('='.repeat(80));
}

main().catch(console.error);

