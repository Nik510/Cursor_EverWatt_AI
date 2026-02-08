/**
 * Extract ALL information from ALL EE MEASURES 2.0.docx
 * Comprehensive extraction to ensure nothing is missed
 */

import mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';

// Use environment variable or default to external path for one-time extraction
// For production, source files should be in data/ folder
const DOCX_PATH = process.env.TRAINING_DATA_PATH || 
  'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine\\EVERWATT AI\\TRAINING DATA\\ALL EE MEASURES 2.0.docx';
const OUTPUT_DIR = path.join(process.cwd(), 'data', 'extracted-all-ee-measures-2');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'full-extraction.json');

async function extractAllMeasures() {
  console.log('📄 Extracting ALL information from ALL EE MEASURES 2.0.docx...');
  console.log(`   File: ${DOCX_PATH}`);
  console.log();

  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Extract the document using mammoth directly
    const result = await mammoth.extractRawText({ path: DOCX_PATH });
    const fullText = result.value;
    
    // Extract title (first non-empty line)
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const title = lines[0] || 'ALL EE MEASURES 2.0';
    
    const extraction = {
      extractedAt: new Date().toISOString(),
      sourceFile: DOCX_PATH,
      title,
      fullText,
      textLength: fullText.length,
      
      // Parse structured measures
      measures: parseMeasures(fullText),
      
      // Extract all categories
      categories: extractCategories(fullText),
      
      // Extract all equipment types
      equipmentTypes: extractEquipmentTypes(fullText),
      
      // Extract all technologies
      technologies: extractTechnologies(fullText),
      
      // Extract all subcategories
      subcategories: extractSubcategories(fullText),
    };

    // Save full extraction
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(extraction, null, 2), 'utf-8');
    
    console.log('✅ Extraction complete!');
    console.log(`   Full text length: ${extraction.textLength.toLocaleString()} characters`);
    console.log(`   Measures parsed: ${extraction.measures.length}`);
    console.log(`   Categories found: ${extraction.categories.length}`);
    console.log(`   Subcategories found: ${extraction.subcategories.length}`);
    console.log(`   Equipment types found: ${extraction.equipmentTypes.length}`);
    console.log(`   Technologies found: ${extraction.technologies.length}`);
    console.log();
    console.log(`   Output saved to: ${OUTPUT_FILE}`);
    
    // Save a summary
    const summaryFile = path.join(OUTPUT_DIR, 'summary.txt');
    const summary = generateSummary(extraction);
    fs.writeFileSync(summaryFile, summary, 'utf-8');
    console.log(`   Summary saved to: ${summaryFile}`);
    
    // Also save the full text for reference
    const textFile = path.join(OUTPUT_DIR, 'full-text.txt');
    fs.writeFileSync(textFile, fullText, 'utf-8');
    console.log(`   Full text saved to: ${textFile}`);
    
    return extraction;
    
  } catch (error) {
    console.error('❌ Error extracting document:', error);
    throw error;
  }
}

function parseMeasures(text: string): Array<{
  id: string;
  name: string;
  category?: string;
  subcategory?: string;
  description?: string;
  keywords: string[];
}> {
  const measures: Array<{
    id: string;
    name: string;
    category?: string;
    subcategory?: string;
    description?: string;
    keywords: string[];
  }> = [];

  // Split into lines and look for measure patterns
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentCategory = '';
  let currentSubcategory = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect category headers (usually numbered like "1.", "2.", or with emojis)
    const categoryMatch = line.match(/^[🟦🔥🟩🟥⚡🟫❄️🚰⚙️🔋🏭🏥🖥️🔌\s]*\d+\.\s*([A-Z][A-Z\s&]+(?:SYSTEMS?|MEASURES?|LOADS?|CONTROLS?|ELECTRIFICATION))/i);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      currentSubcategory = '';
      continue;
    }
    
    // Detect subcategory headers (usually numbered like "1.1", "1.2", etc.)
    const subcategoryMatch = line.match(/^\d+\.\d+\s+([A-Z][^\n]+)/i);
    if (subcategoryMatch) {
      currentSubcategory = subcategoryMatch[1].trim();
      continue;
    }
    
    // Detect measure names
    // Look for lines that are standalone items (not headers, not numbers only)
    if (line.length > 3 && line.length < 150 && 
        !line.match(/^[A-Z\s]{20,}$/) && // Not all caps headers
        !line.match(/^\d+$/) && // Not just numbers
        !line.match(/^---/) && // Not separators
        line.match(/^[A-Za-z]/)) {
      
      // Clean up the measure name
      let measureName = line
        .replace(/^[-•▪▫▸▹►▻]\s+/, '')
        .replace(/^\d+[\.\)]\s+/, '')
        .trim();
      
      if (measureName.length < 3 || measureName.length > 150) continue;
      
      // Skip if it looks like a header or separator
      if (measureName.match(/^(COOLING|HEATING|VENTILATION|CONTROLS|ELECTRIFICATION|CATEGORY|SUBCATEGORY|EVERWATT|MASTER|DATABASE)/i)) continue;
      if (measureName === '---' || measureName.match(/^={3,}$/)) continue;
      
      // Extract keywords
      const keywords = extractKeywords(measureName);
      
      measures.push({
        id: `measure-${measures.length + 1}`,
        name: measureName,
        category: currentCategory || undefined,
        subcategory: currentSubcategory || undefined,
        keywords,
      });
    }
  }
  
  return measures;
}

function extractCategories(text: string): string[] {
  const categories: string[] = [];
  const lines = text.split('\n').map(l => l.trim());
  
  for (const line of lines) {
    // Look for category patterns (numbered with emojis)
    const match = line.match(/^[🟦🔥🟩🟥⚡🟫❄️🚰⚙️🔋🏭🏥🖥️🔌\s]*\d+\.\s*([A-Z][A-Z\s&]+(?:SYSTEMS?|MEASURES?|LOADS?|CONTROLS?|ELECTRIFICATION))/i);
    if (match) {
      const category = match[1].trim();
      if (!categories.includes(category)) {
        categories.push(category);
      }
    }
  }
  
  return categories;
}

function extractSubcategories(text: string): string[] {
  const subcategories: string[] = [];
  const lines = text.split('\n').map(l => l.trim());
  
  for (const line of lines) {
    // Look for subcategory patterns (numbered like "1.1", "2.3", etc.)
    const match = line.match(/^\d+\.\d+\s+([A-Z][^\n]+)/i);
    if (match) {
      const subcategory = match[1].trim();
      if (subcategory.length > 3 && subcategory.length < 100 && 
          !subcategories.includes(subcategory)) {
        subcategories.push(subcategory);
      }
    }
  }
  
  return subcategories;
}

function extractEquipmentTypes(text: string): string[] {
  const equipmentTypes: Set<string> = new Set();
  const lines = text.split('\n').map(l => l.trim());
  
  // Common equipment type patterns
  const patterns = [
    /(Centrifugal|Screw|Scroll|Reciprocating|Absorption)\s+chiller/gi,
    /(Condensing|Standard|Steam)\s+boiler/gi,
    /(VRF|VRV|Heat\s+Pump|RTU|AHU|DOAS|ERV|HRV)/gi,
    /(VFD|ECM|EC)\s+(fan|motor|compressor|pump)/gi,
    /(Cooling\s+Tower|Chiller|Boiler|Heat\s+Pump)/gi,
    /(Battery|BESS|Solar\s+PV|Storage)/gi,
    /(NEMA\s+Premium|Soft\s+Starter|Smart\s+Panel)/gi,
  ];
  
  for (const line of lines) {
    for (const pattern of patterns) {
      const matches = line.match(pattern);
      if (matches) {
        matches.forEach(m => equipmentTypes.add(m.trim()));
      }
    }
  }
  
  return Array.from(equipmentTypes).sort();
}

function extractTechnologies(text: string): string[] {
  const technologies: Set<string> = new Set();
  
  // Known technology keywords
  const techKeywords = [
    'Chiller', 'Boiler', 'Heat Pump', 'VRF', 'VRV', 'AHU', 'DOAS',
    'VFD', 'ECM', 'Cooling Tower', 'Battery', 'BESS', 'Solar PV',
    'Refrigeration', 'Lighting', 'LED', 'Controls', 'BMS', 'EMS',
    'Insulation', 'Windows', 'Electrification', 'Compressed Air',
    'HPWH', 'Ice Storage', 'PCM', 'Microgrid', 'Solar Thermal',
  ];
  
  const lowerText = text.toLowerCase();
  
  for (const keyword of techKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      technologies.add(keyword);
    }
  }
  
  return Array.from(technologies).sort();
}

function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  const words = text.toLowerCase().split(/\s+/);
  
  // Important keywords to extract
  const importantTerms = [
    'vfd', 'ecm', 'ec', 'led', 'battery', 'solar', 'heat pump',
    'chiller', 'boiler', 'ahu', 'cooling tower', 'refrigeration',
    'electrification', 'insulation', 'controls', 'optimization',
    'retrofit', 'upgrade', 'replacement', 'efficiency', 'vrf', 'vrv',
    'bms', 'ems', 'doas', 'erv', 'hrv', 'hpwh', 'bess',
  ];
  
  for (const word of words) {
    const cleanWord = word.replace(/[.,;:!?()\[\]{}]/g, '').toLowerCase();
    if (importantTerms.includes(cleanWord) && !keywords.includes(cleanWord)) {
      keywords.push(cleanWord);
    }
  }
  
  return keywords;
}

function generateSummary(extraction: any): string {
  return `ALL EE MEASURES 2.0 - Extraction Summary
Generated: ${new Date().toISOString()}

SOURCE FILE:
${extraction.sourceFile}

STATISTICS:
- Full text length: ${extraction.textLength.toLocaleString()} characters
- Measures parsed: ${extraction.measures.length}
- Categories found: ${extraction.categories.length}
- Subcategories found: ${extraction.subcategories.length}
- Equipment types found: ${extraction.equipmentTypes.length}
- Technologies identified: ${extraction.technologies.length}

CATEGORIES (${extraction.categories.length}):
${extraction.categories.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}

SUBCATEGORIES (${extraction.subcategories.length}):
${extraction.subcategories.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}

EQUIPMENT TYPES (${extraction.equipmentTypes.length}):
${extraction.equipmentTypes.map((e: string, i: number) => `${i + 1}. ${e}`).join('\n')}

TECHNOLOGIES (${extraction.technologies.length}):
${extraction.technologies.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}

MEASURES (first 100 of ${extraction.measures.length}):
${extraction.measures.slice(0, 100).map((m: any, i: number) => 
  `${i + 1}. ${m.name}${m.category ? ` [${m.category}]` : ''}${m.subcategory ? ` > ${m.subcategory}` : ''}`
).join('\n')}

${extraction.measures.length > 100 ? `\n... and ${extraction.measures.length - 100} more measures\n` : ''}

COMPLETE MEASURE LIST:
${extraction.measures.map((m: any, i: number) => 
  `${i + 1}. ${m.name}${m.category ? ` [${m.category}]` : ''}${m.subcategory ? ` > ${m.subcategory}` : ''}`
).join('\n')}
`;
}

// Run extraction
extractAllMeasures()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
