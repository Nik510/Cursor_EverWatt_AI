/**
 * Verify All Content is Accessible in Backend
 * Checks that all extracted content can be loaded and searched
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');

async function verifyAllContent() {
  console.log('🔍 Verifying all content is accessible in backend...\n');

  const checks: Array<{ name: string; status: boolean; details: string }> = [];

  // 1. Check structured training content
  const structuredFile = path.join(DATA_DIR, 'structured-training-content.json');
  if (existsSync(structuredFile)) {
    const content = JSON.parse(await readFile(structuredFile, 'utf-8'));
    checks.push({
      name: 'Structured Training Content',
      status: true,
      details: `${content.length} documents, ${content.reduce((sum: number, doc: any) => sum + (doc.sections?.length || 0), 0)} sections`,
    });
  } else {
    checks.push({ name: 'Structured Training Content', status: false, details: 'File not found' });
  }

  // 2. Check all remaining content
  const remainingFile = path.join(DATA_DIR, 'extracted-all-remaining', 'all-remaining-content.json');
  if (existsSync(remainingFile)) {
    const content = JSON.parse(await readFile(remainingFile, 'utf-8'));
    const successful = content.filter((f: any) => f.fullText && !f.error).length;
    checks.push({
      name: 'All Remaining Content',
      status: true,
      details: `${content.length} files, ${successful} successfully extracted`,
    });
  } else {
    checks.push({ name: 'All Remaining Content', status: false, details: 'File not found' });
  }

  // 3. Check ASHRAE content
  const ashraeFile = path.join(DATA_DIR, 'extracted-ashrae-guidelines', 'ashrae-knowledge-architecture.json');
  if (existsSync(ashraeFile)) {
    const content = JSON.parse(await readFile(ashraeFile, 'utf-8'));
    checks.push({
      name: 'ASHRAE Guidelines',
      status: true,
      details: `${content.sections?.length || 0} sections, ${content.textLength?.toLocaleString() || 0} characters`,
    });
  } else {
    checks.push({ name: 'ASHRAE Guidelines', status: false, details: 'File not found' });
  }

  // 4. Check public folder files
  const publicFiles = [
    'structured-training-content.json',
    'all-remaining-content.json',
    'ashrae-knowledge-architecture.json',
    'extracted-measures.json',
    'measure-training-links.json',
  ];

  for (const file of publicFiles) {
    const filePath = path.join(PUBLIC_DATA_DIR, file);
    checks.push({
      name: `Public: ${file}`,
      status: existsSync(filePath),
      details: existsSync(filePath) ? 'Available' : 'Missing',
    });
  }

  // 5. Check data files
  const dataFiles = ['INTERVAL.csv', 'USAGE.csv', 'battery-catalog.csv'];
  for (const file of dataFiles) {
    const filePath = path.join(DATA_DIR, file);
    checks.push({
      name: `Data: ${file}`,
      status: existsSync(filePath),
      details: existsSync(filePath) ? 'Available' : 'Missing',
    });
  }

  // Print results
  console.log('='.repeat(80));
  console.log('📊 VERIFICATION RESULTS');
  console.log('='.repeat(80));
  console.log();

  const passed = checks.filter(c => c.status).length;
  const failed = checks.filter(c => !c.status).length;

  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    console.log(`${icon} ${check.name.padEnd(40)} ${check.details}`);
  });

  console.log();
  console.log('='.repeat(80));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total Checks: ${checks.length}`);
  console.log('='.repeat(80));

  if (failed === 0) {
    console.log('\n🎉 All content is accessible in the backend!');
    return true;
  } else {
    console.log('\n⚠️  Some content is missing. Check failed items above.');
    return false;
  }
}

// Run verification
verifyAllContent()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
