/**
 * Transform messy 3P programs JSON into clean, structured format
 * This script intelligently extracts program information from scattered entries
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { ThreePartyProgram, StructuredThreePartyPrograms } from '../utils/programs/types/3p-program-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RawProgram {
  name: string;
  section?: string | null;
  description: string;
  details: string[];
  utility?: string | null;
  implementer?: string | null;
  category?: string | null;
}

interface RawData {
  programs: RawProgram[];
}

// Utility name patterns
const UTILITY_PATTERNS = {
  'PG&E': /PG&E|Pacific Gas and Electric/gi,
  'SCE': /SCE|Southern California Edison/gi,
  'SDG&E': /SDG&E|San Diego Gas & Electric/gi,
  'SoCalGas': /SoCalGas|Southern California Gas/gi,
  'LADWP': /LADWP|Los Angeles Department of Water and Power/gi,
  'SMUD': /SMUD|Sacramento Municipal Utility District/gi,
};

// Sector patterns
const SECTOR_PATTERNS = {
  'Commercial': /commercial|business|office|retail|restaurant|lodging|hospitality|foodservice/gi,
  'Industrial': /industrial|manufacturing|factory|production|ISOP/gi,
  'Residential': /residential|home|multifamily|MESP|HER/gi,
  'Public': /public|government|school|K-12|GK12|university|government/gi,
  'Agricultural': /agricultural|agriculture|farm/gi,
  'Healthcare': /healthcare|health|hospital|HEFI|medical/gi,
};

// Implementer extraction patterns
function extractImplementerName(text: string): string | null {
  // Pattern 1: "Implementer: Company Name"
  let match = text.match(/Implementer:\s*([^0-9\n]+?)(?:\s*\d+|$)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Pattern 2: "Implementer Company Name"
  match = text.match(/Implementer\s+([A-Z][a-zA-Z\s&]+?)(?:\s*\d+|$)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Pattern 3: Just company name after "Implementer:"
  match = text.match(/Implementer:\s*([A-Z][a-zA-Z\s&]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return null;
}

// Program type patterns
function extractProgramType(text: string, programName: string): string {
  const combined = `${programName} ${text}`.toLowerCase();
  
  if (combined.includes('upstream')) return 'Upstream';
  if (combined.includes('midstream')) return 'Midstream';
  if (combined.includes('market transformation') || combined.includes('technical assistance')) return 'Market Transformation';
  if (combined.includes('market access') || combined.includes('map')) return 'Market Access';
  if (combined.includes('direct install') || combined.includes('no-cost') || combined.includes('free')) return 'Direct Install';
  if (combined.includes('performance-based') || combined.includes('measured savings')) return 'Performance-Based';
  if (combined.includes('sem') || combined.includes('strategic energy management')) return 'Strategic Energy Management';
  
  return 'Custom';
}

function extractUtilities(text: string): string[] {
  const utilities: string[] = [];
  for (const [utility, pattern] of Object.entries(UTILITY_PATTERNS)) {
    if (pattern.test(text)) {
      utilities.push(utility);
    }
  }
  return [...new Set(utilities)];
}

function extractSectors(text: string, programName: string): string[] {
  const sectors: string[] = [];
  const combinedText = `${programName} ${text}`.toLowerCase();
  
  for (const [sector, pattern] of Object.entries(SECTOR_PATTERNS)) {
    if (pattern.test(combinedText)) {
      sectors.push(sector);
    }
  }
  return [...new Set(sectors)];
}

function determineScope(programName: string, utilities: string[]): string {
  if (programName.toLowerCase().includes('statewide')) {
    return 'Statewide';
  }
  if (utilities.length > 1) {
    return 'Regional';
  }
  return 'Territory-Specific';
}

function isProgramName(name: string): boolean {
  // Skip if it's clearly not a program name
  if (name.length < 5) return false;
  if (name.startsWith('Implementer:')) return false;
  if (name.startsWith('Lead Administrator:')) return false;
  if (name.startsWith('Target:')) return false;
  if (name.startsWith('Measures:')) return false;
  if (name.startsWith('Eligible')) return false;
  if (name.includes('?')) return false;
  if (name === 'Description:' || name === 'Scope:' || name === 'Mechanism:') return false;
  if (name.endsWith(':') && name.length < 30) return false;
  if (name.match(/^\d+\.\d+/)) return false; // Section numbers
  if (name.toLowerCase().includes('works cited')) return false;
  if (name.match(/^https?:\/\//)) return false;
  if (name.includes('accessed') && name.includes('http')) return false;
  
  // Good indicators of program names
  if (name[0] === name[0].toUpperCase() && name.length > 10) {
    // Check for common program name patterns
    if (name.includes('(') && name.includes(')')) return true; // e.g., "Program Name (Subtitle)"
    if (name.includes('Program')) return true;
    if (name.includes('Initiative')) return true;
    if (name.includes('Rebates')) return true;
    if (name.split(' ').length >= 2 && name.split(' ').length <= 8) return true; // Reasonable length
  }
  
  return false;
}

function transformPrograms(rawData: RawData): StructuredThreePartyPrograms {
  const programs: ThreePartyProgram[] = [];
  const rawPrograms = rawData.programs;
  
  // First pass: identify program entries and their context
  interface ProgramContext {
    name: string;
    startIndex: number;
    implementer: string | null;
    utilities: string[];
    sectors: string[];
    description: string;
    details: string[];
    leadAdministrator: string | null;
    eligibleCustomers: string | null;
    incentiveStructure: string | null;
    eligibleEquipment: string[];
    methodology: string | null;
  }
  
  const programContexts: ProgramContext[] = [];
  
  for (let i = 0; i < rawPrograms.length; i++) {
    const entry = rawPrograms[i];
    const name = entry.name.trim();
    
    if (isProgramName(name)) {
      // Look ahead and behind to gather context
      const context: ProgramContext = {
        name,
        startIndex: i,
        implementer: null,
        utilities: [],
        sectors: [],
        description: entry.description || '',
        details: [...(entry.details || [])],
        leadAdministrator: null,
        eligibleCustomers: null,
        incentiveStructure: null,
        eligibleEquipment: [],
        methodology: null,
      };
      
      // Look ahead up to 10 entries for related info
      for (let j = i + 1; j < Math.min(rawPrograms.length, i + 15); j++) {
        const nextEntry = rawPrograms[j];
        const nextName = nextEntry.name.trim();
        const nextDesc = nextEntry.description || '';
        const combinedText = `${nextName} ${nextDesc}`;
        
        // Stop if we hit another program name
        if (isProgramName(nextName) && j > i + 2) break;
        
        // Extract implementer
        if (nextName.includes('Implementer:')) {
          const impl = extractImplementerName(combinedText);
          if (impl && !context.implementer) {
            context.implementer = impl;
          }
        }
        
        // Extract lead administrator
        if (nextName.includes('Lead Administrator:')) {
          const match = nextName.match(/Lead Administrator:\s*([^0-9\n]+)/i);
          if (match && match[1]) {
            context.leadAdministrator = match[1].trim();
          }
        }
        
        // Extract target/eligible customers
        if (nextName.includes('Target:') || nextName.toLowerCase().includes('eligible')) {
          context.eligibleCustomers = nextDesc || nextName;
        }
        
        // Extract incentive structure
        if (nextName.toLowerCase().includes('incentive') || nextName.toLowerCase().includes('rebate')) {
          context.incentiveStructure = nextDesc || nextName;
        }
        
        // Extract equipment
        if (nextName.toLowerCase().includes('equipment') || nextName.toLowerCase().includes('measures')) {
          const equipmentText = nextDesc || nextName;
          // Try to extract list items
          const lines = equipmentText.split('\n').filter(l => l.trim().length > 0);
          lines.forEach(line => {
            if (line.match(/^[•\-\*]/) || line.match(/^[A-Z][a-z]+/)) {
              context.eligibleEquipment.push(line.replace(/^[•\-\*]\s*/, '').trim());
            }
          });
        }
        
        // Accumulate description and details
        if (nextDesc && !nextDesc.includes('http') && nextDesc.length > 20) {
          if (!context.description) {
            context.description = nextDesc;
          } else if (nextDesc.length > context.description.length) {
            context.description = nextDesc; // Use longer description
          }
        }
        
        if (nextEntry.details && nextEntry.details.length > 0) {
          nextEntry.details.forEach(detail => {
            if (detail && !detail.includes('http') && detail.length > 10) {
              context.details.push(detail);
            }
          });
        }
      }
      
      // Look behind for implementer/utility info
      for (let j = Math.max(0, i - 5); j < i; j++) {
        const prevEntry = rawPrograms[j];
        const prevText = `${prevEntry.name} ${prevEntry.description}`;
        
        if (prevEntry.name.includes('Implementer:')) {
          const impl = extractImplementerName(prevText);
          if (impl && !context.implementer) {
            context.implementer = impl;
          }
        }
      }
      
      // Extract utilities and sectors from all accumulated text
      const allText = `${context.name} ${context.description} ${context.details.join(' ')}`;
      context.utilities = extractUtilities(allText);
      context.sectors = extractSectors(allText, context.name);
      
      // Extract methodology
      if (allText.toLowerCase().includes('nmec')) {
        if (allText.toLowerCase().includes('site-level')) {
          context.methodology = 'Site-Level NMEC';
        } else if (allText.toLowerCase().includes('population-level')) {
          context.methodology = 'Population-Level NMEC';
        } else {
          context.methodology = 'NMEC';
        }
      } else if (allText.toLowerCase().includes('sem') || allText.toLowerCase().includes('strategic energy management')) {
        context.methodology = 'Strategic Energy Management (SEM)';
      }
      
      programContexts.push(context);
    }
  }
  
  // Second pass: convert contexts to structured programs
  programContexts.forEach((ctx, idx) => {
    // Skip if no real content
    if (!ctx.description && ctx.details.length === 0) return;
    
    const program: ThreePartyProgram = {
      id: `program-${idx + 1}`,
      programName: ctx.name,
      implementer: ctx.implementer || 'Unknown',
      utilities: ctx.utilities.length > 0 ? ctx.utilities : ['Multiple'],
      sectors: ctx.sectors.length > 0 ? ctx.sectors : ['General'],
      programType: extractProgramType(`${ctx.description} ${ctx.details.join(' ')}`, ctx.name),
      scope: determineScope(ctx.name, ctx.utilities),
      description: ctx.description || ctx.details[0] || '',
      notes: ctx.details.length > 1 ? ctx.details.slice(1) : undefined,
    };
    
    if (ctx.leadAdministrator) {
      program.leadAdministrator = ctx.leadAdministrator;
    }
    
    if (ctx.eligibleCustomers) {
      program.eligibleCustomers = ctx.eligibleCustomers;
    }
    
    if (ctx.incentiveStructure) {
      program.incentiveStructure = ctx.incentiveStructure;
      // Try to extract rates
      const rateMatch = ctx.incentiveStructure.match(/\$[\d.,]+(?:\/[kK][Ww][Hh]?|\/[kK][Ww])/g);
      if (rateMatch) {
        program.incentiveRates = rateMatch.join(', ');
      }
    }
    
    if (ctx.eligibleEquipment.length > 0) {
      program.eligibleEquipment = ctx.eligibleEquipment.slice(0, 20); // Limit to 20 items
    }
    
    if (ctx.methodology) {
      program.methodology = ctx.methodology;
    }
    
    programs.push(program);
  });
  
  // Generate metadata
  const allUtilities = new Set<string>();
  const allImplementers = new Set<string>();
  const allSectors = new Set<string>();
  const allProgramTypes = new Set<string>();
  
  programs.forEach(p => {
    p.utilities.forEach(u => allUtilities.add(u));
    allImplementers.add(p.implementer);
    p.sectors.forEach(s => allSectors.add(s));
    allProgramTypes.add(p.programType);
  });
  
  return {
    programs: programs.filter(p => p.programName && p.description.length > 20), // Filter out incomplete entries
    metadata: {
      totalPrograms: programs.length,
      utilities: Array.from(allUtilities).sort(),
      implementers: Array.from(allImplementers).sort(),
      sectors: Array.from(allSectors).sort(),
      programTypes: Array.from(allProgramTypes).sort(),
    },
  };
}

// Main execution
function main() {
  const inputPath = path.join(__dirname, '../utils/programs/data/3p-programs.json');
  const outputPath = path.join(__dirname, '../utils/programs/data/3p-programs-structured.json');
  
  console.log('Reading raw data...');
  const rawData: RawData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  
  console.log(`Found ${rawData.programs.length} raw entries`);
  console.log('Transforming data...');
  
  const structured = transformPrograms(rawData);
  
  console.log(`\n✅ Created ${structured.programs.length} structured programs`);
  console.log('\nMetadata:');
  console.log(`  Utilities: ${structured.metadata.utilities.join(', ')}`);
  console.log(`  Implementers: ${structured.metadata.implementers.length} unique`);
  console.log(`  Sectors: ${structured.metadata.sectors.join(', ')}`);
  console.log(`  Program Types: ${structured.metadata.programTypes.join(', ')}`);
  
  fs.writeFileSync(outputPath, JSON.stringify(structured, null, 2), 'utf-8');
  console.log(`\n✅ Saved structured data to: ${outputPath}`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('transform-3p-programs')) {
  main();
}

export { transformPrograms };

