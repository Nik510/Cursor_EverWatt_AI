/**
 * Extract ASHRAE Guidelines Document
 * Extracts and structures the ASHRAE Knowledge Architecture compendium
 */

import mammoth from 'mammoth';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Use environment variable or fallback to original source location
const ASHRAE_DOCX_PATH = process.env.TRAINING_DATA_BASE_PATH 
  ? path.join(process.env.TRAINING_DATA_BASE_PATH, 'ASHRAE_GUIDELINES', 'The ASHRAE Knowledge Architecture_ A Compendium for Artificial Intelligence Model Training.docx')
  : 'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine\\ASHRAE_GUIDELINES\\The ASHRAE Knowledge Architecture_ A Compendium for Artificial Intelligence Model Training.docx';

const OUTPUT_DIR = path.join(process.cwd(), 'data', 'extracted-ashrae-guidelines');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'ashrae-knowledge-architecture.json');
const TEXT_FILE = path.join(OUTPUT_DIR, 'ashrae-full-text.txt');

interface ExtractedContent {
  extractedAt: string;
  sourceFile: string;
  title: string;
  fullText: string;
  textLength: number;
  sections: Array<{
    heading?: string;
    level: number;
    content: string;
  }>;
  categories: string[];
  keywords: string[];
}

async function extractASHRAEDocument() {
  console.log('📄 Extracting ASHRAE Knowledge Architecture Document...');
  console.log(`   File: ${ASHRAE_DOCX_PATH}`);
  console.log();

  if (!existsSync(ASHRAE_DOCX_PATH)) {
    console.error(`❌ File not found: ${ASHRAE_DOCX_PATH}`);
    process.exit(1);
  }

  try {
    // Ensure output directory exists
    if (!existsSync(OUTPUT_DIR)) {
      await mkdir(OUTPUT_DIR, { recursive: true });
    }

    // Extract text using mammoth
    console.log('📖 Extracting text content...');
    const textResult = await mammoth.extractRawText({ path: ASHRAE_DOCX_PATH });
    const fullText = textResult.value;
    
    // Extract HTML for structure
    const htmlResult = await mammoth.convertToHtml({ path: ASHRAE_DOCX_PATH });
    const html = htmlResult.value;

    // Extract title (first non-empty line or first heading)
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const title = lines[0] || 'ASHRAE Knowledge Architecture';

    // Parse sections from structure
    const sections = parseSections(fullText);

    // Extract categories and keywords
    const categories = extractCategories(fullText);
    const keywords = extractKeywords(fullText);

    const extracted: ExtractedContent = {
      extractedAt: new Date().toISOString(),
      sourceFile: ASHRAE_DOCX_PATH,
      title,
      fullText,
      textLength: fullText.length,
      sections,
      categories,
      keywords,
    };

    // Save JSON
    await writeFile(OUTPUT_FILE, JSON.stringify(extracted, null, 2), 'utf-8');
    console.log(`✅ Saved structured content to: ${OUTPUT_FILE}`);

    // Save full text
    await writeFile(TEXT_FILE, fullText, 'utf-8');
    console.log(`✅ Saved full text to: ${TEXT_FILE}`);

    // Generate summary
    const summary = generateSummary(extracted);
    const summaryFile = path.join(OUTPUT_DIR, 'summary.txt');
    await writeFile(summaryFile, summary, 'utf-8');
    console.log(`✅ Saved summary to: ${summaryFile}`);

    console.log();
    console.log('='.repeat(80));
    console.log('📊 EXTRACTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ Title: ${title}`);
    console.log(`📄 Text Length: ${extracted.textLength.toLocaleString()} characters`);
    console.log(`📑 Sections: ${sections.length}`);
    console.log(`🏷️  Categories: ${categories.length}`);
    console.log(`🔑 Keywords: ${keywords.length}`);
    console.log();
    console.log(`💾 Output Directory: ${OUTPUT_DIR}`);
    console.log('='.repeat(80));

    return extracted;

  } catch (error) {
    console.error('❌ Error extracting document:', error);
    throw error;
  }
}

function parseSections(text: string): Array<{ heading?: string; level: number; content: string }> {
  const sections: Array<{ heading?: string; level: number; content: string }> = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let currentSection: { heading?: string; level: number; content: string } | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    // Detect headings (all caps, numbered, or specific patterns)
    const isHeading = 
      /^[A-Z][A-Z\s&]+$/.test(line) && line.length < 100 && line.length > 5 ||
      /^\d+\.\s+[A-Z]/.test(line) ||
      /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*:/.test(line) ||
      /^(Chapter|Section|Part|Module)\s+\d+/i.test(line);

    if (isHeading) {
      // Save previous section
      if (currentSection) {
        currentSection.content = currentContent.join('\n');
        sections.push(currentSection);
      }

      // Determine level (1-3 based on formatting)
      let level = 1;
      if (/^\d+\.\d+\./.test(line)) level = 3;
      else if (/^\d+\./.test(line)) level = 2;
      else if (line.length < 50) level = 1;
      else level = 2;

      // Start new section
      currentSection = {
        heading: line,
        level,
        content: '',
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    } else {
      // Content before first heading
      if (!currentSection) {
        currentSection = {
          heading: undefined,
          level: 0,
          content: '',
        };
      }
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n');
    sections.push(currentSection);
  }

  return sections;
}

function extractCategories(text: string): string[] {
  const categories = new Set<string>();
  const lowerText = text.toLowerCase();

  // ASHRAE-specific categories
  const categoryPatterns = [
    /(hvac|heating|ventilation|air conditioning)/gi,
    /(energy efficiency|energy conservation)/gi,
    /(building systems|building automation)/gi,
    /(thermal comfort|indoor air quality|iaq)/gi,
    /(load calculation|cooling load|heating load)/gi,
    /(refrigeration|chiller|heat pump)/gi,
    /(controls|bms|building management)/gi,
    /(standards|guidelines|codes)/gi,
    /(sustainability|green building|leed)/gi,
    /(commissioning|retro-commissioning|rcx)/gi,
  ];

  for (const pattern of categoryPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => categories.add(m.trim()));
    }
  }

  return Array.from(categories).sort();
}

function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();
  const lowerText = text.toLowerCase();

  // ASHRAE and HVAC keywords
  const importantTerms = [
    'ashrae', 'hvac', 'r-value', 'u-value', 'btu', 'ton', 'seer', 'eer', 'cop',
    'vfd', 'vav', 'ahu', 'rtu', 'chiller', 'boiler', 'heat pump', 'vrf',
    'bas', 'bms', 'ddc', 'pneumatic', 'economizer', 'enthalpy', 'psychrometric',
    'load calculation', 'cooling load', 'heating load', 'sensible', 'latent',
    'thermal comfort', 'pmv', 'ppd', 'iaq', 'ventilation', 'infiltration',
    'commissioning', 'retro-commissioning', 'm&v', 'energy audit',
    'energy star', 'leed', 'green building', 'sustainability',
  ];

  for (const term of importantTerms) {
    if (lowerText.includes(term.toLowerCase())) {
      keywords.add(term);
    }
  }

  return Array.from(keywords).sort();
}

function generateSummary(extracted: ExtractedContent): string {
  return `ASHRAE Knowledge Architecture - Extraction Summary
Generated: ${extracted.extractedAt}

SOURCE FILE:
${extracted.sourceFile}

STATISTICS:
- Title: ${extracted.title}
- Text Length: ${extracted.textLength.toLocaleString()} characters
- Sections: ${extracted.sections.length}
- Categories: ${extracted.categories.length}
- Keywords: ${extracted.keywords.length}

CATEGORIES (${extracted.categories.length}):
${extracted.categories.map((c, i) => `${i + 1}. ${c}`).join('\n')}

KEYWORDS (${extracted.keywords.length}):
${extracted.keywords.map((k, i) => `${i + 1}. ${k}`).join('\n')}

SECTIONS (first 20 of ${extracted.sections.length}):
${extracted.sections.slice(0, 20).map((s, i) => 
  `${i + 1}. ${s.heading || '(No heading)'} (Level ${s.level}, ${s.content.length} chars)`
).join('\n')}

${extracted.sections.length > 20 ? `\n... and ${extracted.sections.length - 20} more sections\n` : ''}

COMPLETE SECTION LIST:
${extracted.sections.map((s, i) => 
  `${i + 1}. ${s.heading || '(No heading)'} (Level ${s.level}, ${s.content.substring(0, 100)}...)`
).join('\n')}
`;
}

// Run extraction
extractASHRAEDocument()
  .then(() => {
    console.log('\n✅ Extraction complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
