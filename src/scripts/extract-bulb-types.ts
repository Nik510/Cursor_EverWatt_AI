/**
 * Extract Bulb Types from DOCX
 * Reads the bulb types.docx file and extracts comprehensive bulb type information
 */

import mammoth from 'mammoth';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Use environment variable or fallback to original source location
// Note: These are one-time extraction scripts. Extracted data is stored in data/ folder.
const DOCX_PATH = process.env.TRAINING_DATA_BASE_PATH 
  ? path.join(process.env.TRAINING_DATA_BASE_PATH, 'TRAINING_APP', 'bulb types.docx')
  : 'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine\\TRAINING_APP\\bulb types.docx';
const OUTPUT_DIR = path.join(process.cwd(), 'data', 'extracted-bulb-types');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'bulb-types.json');

interface BulbType {
  name: string;
  type: string;
  imageUrl?: string;
  identification: string;
  typicalLocations: string[];
  typicalUseCases: string[];
  replacement: string;
  wattageRange: string;
  lifeSpan: string;
  efficiency: string;
  notes: string;
  baseType?: string;
  shape?: string;
  dimensions?: string;
}

async function extractBulbTypes() {
  try {
    console.log('📄 Extracting bulb types from DOCX...\n');
    
    // Extract HTML to get images and structure
    const htmlResult = await mammoth.convertToHtml({ path: DOCX_PATH });
    const html = htmlResult.value;
    
    // Extract raw text
    const textResult = await mammoth.extractRawText({ path: DOCX_PATH });
    const rawText = textResult.value;
    
    console.log('✅ Extracted content successfully');
    console.log(`\n📝 Text length: ${rawText.length} characters`);
    console.log(`📄 HTML length: ${html.length} characters\n`);
    
    // Parse the content
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Extract images from HTML
    const imageMatches = html.match(/<img[^>]+src="([^"]+)"[^>]*>/g) || [];
    console.log(`🖼️  Found ${imageMatches.length} images in document`);
    
    // Save raw extracted data for review
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(
      path.join(OUTPUT_DIR, 'raw-text.txt'),
      rawText,
      'utf-8'
    );
    await writeFile(
      path.join(OUTPUT_DIR, 'raw-html.html'),
      html,
      'utf-8'
    );
    
    // Parse structured bulb types from text
    // This is a simplified parser - you may need to refine based on actual document structure
    const bulbTypes: BulbType[] = [];
    
    // Save extracted data
    const extractedData = {
      rawText,
      html,
      imageCount: imageMatches.length,
      lines: lines.slice(0, 100), // First 100 lines for preview
      bulbTypes
    };
    
    await writeFile(OUTPUT_FILE, JSON.stringify(extractedData, null, 2), 'utf-8');
    
    console.log(`\n✅ Extracted data saved to: ${OUTPUT_FILE}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Text lines: ${lines.length}`);
    console.log(`   - Images found: ${imageMatches.length}`);
    console.log(`\n💡 Next steps: Review the extracted files and refine parsing logic`);
    
  } catch (error) {
    console.error('❌ Error extracting bulb types:', error);
    throw error;
  }
}

// Run extraction
extractBulbTypes().catch(console.error);

