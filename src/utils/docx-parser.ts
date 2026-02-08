/**
 * DOCX Parser Utility
 * Extracts text and structure from DOCX files
 */

import mammoth from 'mammoth';

export interface ParsedDocument {
  title?: string;
  sections: DocumentSection[];
  rawText: string;
}

export interface DocumentSection {
  heading?: string;
  level: number;
  content: string;
  subsections?: DocumentSection[];
}

export async function parseDocx(filePath: string): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const htmlResult = await mammoth.convertToHtml({ path: filePath });

    const rawText = result.value;
    const html = htmlResult.value;

    // Extract title (usually first line or paragraph)
    const lines = rawText.split('\n').filter(line => line.trim().length > 0);
    const title = lines[0]?.trim() || undefined;

    // Parse sections from HTML
    const sections = parseSectionsFromHtml(html);

    return {
      title,
      sections,
      rawText,
    };
  } catch (error) {
    throw new Error(`Failed to parse DOCX file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseSectionsFromHtml(html: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract headings and content
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p');

  let currentSection: DocumentSection | null = null;
  let currentLevel = 0;

  headings.forEach((element) => {
    const tagName = element.tagName.toLowerCase();
    const isHeading = tagName.startsWith('h');
    const text = element.textContent?.trim() || '';

    if (isHeading) {
      const level = parseInt(tagName.charAt(1)) || 1;

      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        heading: text,
        level,
        content: '',
      };
      currentLevel = level;
    } else if (currentSection && text.length > 0) {
      // Add content to current section
      if (currentSection.content) {
        currentSection.content += '\n\n' + text;
      } else {
        currentSection.content = text;
      }
    }
  });

  // Add last section
  if (currentSection) {
    sections.push(currentSection);
  }

  // If no sections found, create one from raw text
  if (sections.length === 0) {
    const fullText = doc.body.textContent || '';
    if (fullText.trim().length > 0) {
      sections.push({
        heading: undefined,
        level: 0,
        content: fullText,
      });
    }
  }

  return sections;
}

