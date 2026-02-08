/**
 * Rebuild Battery Catalog from Source Files
 * Extracts data from HBE Excel files and combines with known specifications
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

const BATTERY_CATALOG_DIR = 'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine\\BATTERY_CATALOG';
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'battery-catalog.csv');

// Known specifications from existing catalog and product docs
const KNOWN_SPECS: { [model: string]: { powerKw: number; efficiency: number; warrantyYears: number; cRate: number } } = {
  // HBE Models
  'HBPES060': { powerKw: 40, efficiency: 0.90, warrantyYears: 10, cRate: 0.67 },
  'HBPES110': { powerKw: 62, efficiency: 0.90, warrantyYears: 10, cRate: 0.55 },
  'HBPES160': { powerKw: 90, efficiency: 0.90, warrantyYears: 10, cRate: 0.56 },
  'HBPES225': { powerKw: 100, efficiency: 0.90, warrantyYears: 10, cRate: 0.44 },
  'HBESS225I': { powerKw: 100, efficiency: 0.92, warrantyYears: 10, cRate: 0.44 },
  'HBESS225C': { powerKw: 100, efficiency: 0.92, warrantyYears: 10, cRate: 0.44 },
  'HBESS450I': { powerKw: 200, efficiency: 0.93, warrantyYears: 10, cRate: 0.44 },
  'HBESS450C': { powerKw: 200, efficiency: 0.92, warrantyYears: 15, cRate: 0.44 },
  'HBESS300': { powerKw: 150, efficiency: 0.92, warrantyYears: 10, cRate: 0.50 },
  'HBESS150': { powerKw: 75, efficiency: 0.90, warrantyYears: 10, cRate: 0.50 },
  'HBPES300': { powerKw: 150, efficiency: 0.91, warrantyYears: 10, cRate: 0.50 },
  'HBESS337C': { powerKw: 150, efficiency: 0.92, warrantyYears: 10, cRate: 0.44 },
  // POSH Models
  'POSH Station 207': { powerKw: 60, efficiency: 0.90, warrantyYears: 10, cRate: 0.29 },
};

interface BatteryRow {
  modelName: string;
  manufacturer: string;
  capacityKwh: number;
  powerKw: number;
  cRate: number;
  efficiency: number;
  warrantyYears: number;
  price1_10: number;
  price11_20: number;
  price21_50: number;
  price50Plus: number;
  active: string;
}

function parseCapacity(capStr: string): number {
  const cleaned = String(capStr).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

function parsePrice(price: any): number {
  if (typeof price === 'number') return price;
  const cleaned = String(price).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}

async function extractHBEFromExcel(): Promise<BatteryRow[]> {
  const excelPath = path.join(BATTERY_CATALOG_DIR, 'HBE', 'ESS Price.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.log('⚠ HBE Excel file not found');
    return [];
  }
  
  console.log('📖 Reading HBE ESS Price.xlsx...');
  const workbook = XLSX.readFile(excelPath);
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
  
  const batteries: BatteryRow[] = [];
  
  // Extract models (starting from row 5, column 3 = model, column 4 = capacity, columns 5-8 = prices)
  for (let i = 5; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[3]) continue;
    
    const modelName = String(row[3]).trim();
    if (!modelName || modelName.toLowerCase().includes('serial') || modelName === '') continue;
    
    const capacityStr = String(row[4] || '').trim();
    const capacity = parseCapacity(capacityStr);
    
    if (!capacity || capacity === 0) continue;
    
    const specs = KNOWN_SPECS[modelName] || {
      powerKw: Math.round(capacity * 0.44), // Default C-rate of 0.44C
      efficiency: 0.90,
      warrantyYears: 10,
      cRate: 0.44,
    };
    
    const price1_10 = parsePrice(row[5]);
    const price11_20 = parsePrice(row[6]);
    const price21_50 = parsePrice(row[7]);
    const price50Plus = parsePrice(row[8]);
    
    if (price1_10 === 0) continue; // Skip if no price data
    
    batteries.push({
      modelName,
      manufacturer: 'HBE',
      capacityKwh: capacity,
      powerKw: specs.powerKw,
      cRate: specs.cRate || (specs.powerKw / capacity),
      efficiency: specs.efficiency,
      warrantyYears: specs.warrantyYears,
      price1_10,
      price11_20: price11_20 || price1_10,
      price21_50: price21_50 || price1_10,
      price50Plus: price50Plus || price1_10,
      active: 'Yes',
    });
  }
  
  console.log(`  ✅ Extracted ${batteries.length} HBE batteries`);
  return batteries;
}

function getPOSHBatteries(): BatteryRow[] {
  // POSH data from existing catalog
  return [
    {
      modelName: 'POSH Station 207',
      manufacturer: 'POSH Energy',
      capacityKwh: 207,
      powerKw: 60,
      cRate: 0.29,
      efficiency: 0.90,
      warrantyYears: 10,
      price1_10: 180000,
      price11_20: 175000,
      price21_50: 170000,
      price50Plus: 165000,
      active: 'Yes',
    },
  ];
}

function mergeWithExistingCatalog(newBatteries: BatteryRow[]): BatteryRow[] {
  // Read existing catalog to preserve any models not in Excel
  const existingPath = path.join(process.cwd(), 'data', 'battery-catalog.csv');
  const allBatteries: Map<string, BatteryRow> = new Map();
  
  // Add existing batteries first
  if (fs.existsSync(existingPath)) {
    try {
      const existingContent = fs.readFileSync(existingPath, 'utf-8');
      const lines = existingContent.split('\n').filter(l => l.trim());
      const headers = lines[0]?.split(',') || [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < 3) continue;
        
        const modelName = values[0]?.trim();
        const manufacturer = values[1]?.trim();
        const key = `${manufacturer}-${modelName}`;
        
        if (!allBatteries.has(key)) {
          allBatteries.set(key, {
            modelName: values[0]?.trim() || '',
            manufacturer: values[1]?.trim() || '',
            capacityKwh: parseFloat(values[2]?.trim() || '0'),
            powerKw: parseFloat(values[3]?.trim() || '0'),
            cRate: parseFloat(values[4]?.trim() || '0'),
            efficiency: parseFloat(values[5]?.trim() || '90') / 100,
            warrantyYears: parseFloat(values[6]?.trim() || '10'),
            price1_10: parseFloat(values[7]?.trim() || '0'),
            price11_20: parseFloat(values[8]?.trim() || values[7]?.trim() || '0'),
            price21_50: parseFloat(values[9]?.trim() || values[7]?.trim() || '0'),
            price50Plus: parseFloat(values[10]?.trim() || values[7]?.trim() || '0'),
            active: values[11]?.trim() || 'Yes',
          });
        }
      }
    } catch (err) {
      console.log('⚠ Could not read existing catalog:', err);
    }
  }
  
  // Update/Add with new data
  newBatteries.forEach(battery => {
    const key = `${battery.manufacturer}-${battery.modelName}`;
    allBatteries.set(key, battery);
  });
  
  return Array.from(allBatteries.values());
}

async function main() {
  console.log('🔋 Rebuilding Battery Catalog from Source Files\n');
  console.log('=' .repeat(60));
  
  const allBatteries: BatteryRow[] = [];
  
  // Extract from HBE Excel
  const hbeBatteries = await extractHBEFromExcel();
  allBatteries.push(...hbeBatteries);
  
  // Add POSH batteries
  const poshBatteries = getPOSHBatteries();
  allBatteries.push(...poshBatteries);
  
  // Merge with existing catalog
  const merged = mergeWithExistingCatalog(allBatteries);
  
  // Sort by manufacturer, then model
  merged.sort((a, b) => {
    if (a.manufacturer !== b.manufacturer) {
      return a.manufacturer.localeCompare(b.manufacturer);
    }
    return a.modelName.localeCompare(b.modelName);
  });
  
  // Generate CSV
  const csvHeader = [
    'Model Name',
    'Manufacturer',
    'Capacity (kWh)',
    'Power (kW)',
    'C-Rate',
    'Efficiency (%)',
    'Warranty (Years)',
    'Price 1-10',
    'Price 11-20',
    'Price 21-50',
    'Price 50+',
    'Active',
  ];
  
  const csvRows = merged.map(b => [
    b.modelName,
    b.manufacturer,
    b.capacityKwh.toString(),
    b.powerKw.toString(),
    b.cRate.toFixed(2),
    Math.round(b.efficiency * 100).toString(),
    b.warrantyYears.toString(),
    Math.round(b.price1_10).toString(),
    Math.round(b.price11_20).toString(),
    Math.round(b.price21_50).toString(),
    Math.round(b.price50Plus).toString(),
    b.active,
  ]);
  
  const csvContent = [
    csvHeader.join(','),
    ...csvRows.map(row => row.join(',')),
  ].join('\n');
  
  // Ensure data directory exists
  const dataDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  await writeFile(OUTPUT_PATH, csvContent, 'utf-8');
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Battery catalog rebuilt successfully!`);
  console.log(`   Output: ${OUTPUT_PATH}`);
  console.log(`   Total batteries: ${merged.length}`);
  console.log('\n📊 Summary by Manufacturer:');
  const byManufacturer: { [m: string]: number } = {};
  merged.forEach(b => {
    byManufacturer[b.manufacturer] = (byManufacturer[b.manufacturer] || 0) + 1;
  });
  Object.entries(byManufacturer).sort().forEach(([m, count]) => {
    console.log(`   ${m}: ${count} models`);
  });
  
  console.log('\n📋 Models:');
  merged.forEach(b => {
    console.log(`   ${b.manufacturer} ${b.modelName}: ${b.capacityKwh}kWh / ${b.powerKw}kW @ $${b.price1_10.toLocaleString()}`);
  });
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
