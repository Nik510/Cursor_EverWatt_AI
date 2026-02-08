/**
 * Extract Images from Bulb Types DOCX
 * Extracts base64 images and saves them as files
 */

import mammoth from 'mammoth';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Use environment variable or fallback to original source location
// Note: These are one-time extraction scripts. Extracted data is stored in data/ folder.
const DOCX_PATH = process.env.TRAINING_DATA_BASE_PATH 
  ? path.join(process.env.TRAINING_DATA_BASE_PATH, 'TRAINING_APP', 'bulb types.docx')
  : 'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine\\TRAINING_APP\\bulb types.docx';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'images', 'bulb-types');

async function extractImages() {
  try {
    console.log('📄 Extracting images from DOCX...\n');
    
    // Extract HTML to get images
    const htmlResult = await mammoth.convertToHtml({ path: DOCX_PATH });
    const html = htmlResult.value;
    
    // Find all base64 images
    const imageRegex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/g;
    const images: Array<{ format: string; data: string; index: number }> = [];
    let match;
    let index = 0;
    
    while ((match = imageRegex.exec(html)) !== null) {
      images.push({
        format: match[1],
        data: match[2],
        index: index++
      });
    }
    
    console.log(`🖼️  Found ${images.length} images\n`);
    
    // Create output directory
    await mkdir(OUTPUT_DIR, { recursive: true });
    
    // Save each image
    for (const img of images) {
      const imagePath = path.join(OUTPUT_DIR, `bulb-types-${img.index + 1}.${img.format === 'png' ? 'png' : 'jpg'}`);
      const imageBuffer = Buffer.from(img.data, 'base64');
      await writeFile(imagePath, imageBuffer);
      console.log(`✅ Saved: ${imagePath}`);
    }
    
    console.log(`\n✅ Extracted ${images.length} images to: ${OUTPUT_DIR}`);
    
    // Also save HTML for reference
    await writeFile(
      path.join(OUTPUT_DIR, 'bulb-types-reference.html'),
      html,
      'utf-8'
    );
    
  } catch (error) {
    console.error('❌ Error extracting images:', error);
    throw error;
  }
}

extractImages().catch(console.error);


