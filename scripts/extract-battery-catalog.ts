/**
 * Extract Battery Catalog from Excel Files
 * Reads HBE ESS Price.xlsx and other sources to create comprehensive battery catalog
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

const BATTERY_CATALOG_DIR = 'C:\\Users\\nikjo\\OneDrive\\Desktop\\EverWatt_Engine\\BATTERY_CATALOG';

interface BatteryRow {
  'Model Name': string;
  'Manufacturer': string;
  'Capacity (kWh)': number;
  'Power (kW)': number;
  'C-Rate': number;
  'Efficiency (%)': number;
  'Warranty (Years)': number;
  'Price 1-10': number;
  'Price 11-20': number;
  'Price 21-50': number;
  'Price 50+': number;
  'Active': 'Yes' | 'No';
}

async function extractFromHBEExcel() {
  const excelPath = path.join(BATTERY_CATALOG_DIR, 'HBE', 'ESS Price.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.log('HBE Excel file not found, skipping...');
    return [];
  }
  
  console.log(`Reading ${excelPath}...`);
  const workbook = XLSX.readFile(excelPath);
  
  // Try all sheets
  const batteries: BatteryRow[] = [];
  
  for (const sheetName of workbook.SheetNames) {
    console.log(`  Processing sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    
    if (data.length < 2) continue;
    
    // Try to find header row
    let headerRow = 0;
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      const rowStr = row.map((c: any) => String(c).toLowerCase()).join(' ');
      if (rowStr.includes('model') || rowStr.includes('capacity') || rowStr.includes('kwh')) {
        headerRow = i;
        break;
      }
    }
    
    const headers = data[headerRow].map((h: any) => String(h || '').trim());
    console.log(`  Headers: ${headers.slice(0, 10).join(', ')}...`);
    
    // Map column names
    const colMap: { [key: string]: number } = {};
    headers.forEach((h, idx) => {
      const hLower = h.toLowerCase();
      if (hLower.includes('model')) colMap.model = idx;
      if (hLower.includes('manufacturer') || hLower.includes('brand')) colMap.manufacturer = idx;
      if (hLower.includes('capacity') && hLower.includes('kwh')) colMap.capacity = idx;
      if ((hLower.includes('power') || hLower.includes('output')) && hLower.includes('kw')) colMap.power = idx;
      if (hLower.includes('c-rate') || hLower.includes('crate')) colMap.crate = idx;
      if (hLower.includes('efficiency')) colMap.efficiency = idx;
      if (hLower.includes('warranty')) colMap.warranty = idx;
      if (hLower.includes('price') && (hLower.includes('1-10') || hLower.includes('1 to 10'))) colMap.price1_10 = idx;
      if (hLower.includes('price') && (hLower.includes('11-20') || hLower.includes('11 to 20'))) colMap.price11_20 = idx;
      if (hLower.includes('price') && (hLower.includes('21-50') || hLower.includes('21 to 50'))) colMap.price21_50 = idx;
      if (hLower.includes('price') && (hLower.includes('50') || hLower.includes('50+'))) colMap.price50 = idx;
    });
    
    // Process rows
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const modelName = String(row[colMap.model] || '').trim();
      const manufacturer = String(row[colMap.manufacturer] || 'HBE').trim();
      
      if (!modelName || modelName.toLowerCase() === 'model name' || modelName.toLowerCase() === 'model') continue;
      
      const capacity = parseFloat(String(row[colMap.capacity] || '0').replace(/[^0-9.]/g, ''));
      const power = parseFloat(String(row[colMap.power] || '0').replace(/[^0-9.]/g, ''));
      
      if (!capacity || !power || capacity === 0 || power === 0) {
        // Try to calculate from other fields or skip
        continue;
      }
      
      const efficiency = parseFloat(String(row[colMap.efficiency] || '90').replace(/[^0-9.]/g, ''));
      const warranty = parseFloat(String(row[colMap.warranty] || '10').replace(/[^0-9.]/g, ''));
      const crate = parseFloat(String(row[colMap.crate] || (power / capacity).toFixed(2)).replace(/[^0-9.]/g, ''));
      
      const price1_10 = parseFloat(String(row[colMap.price1_10] || '0').replace(/[^0-9.]/g, ''));
      const price11_20 = parseFloat(String(row[colMap.price11_20] || price1_10).replace(/[^0-9.]/g, ''));
      const price21_50 = parseFloat(String(row[colMap.price21_50] || price1_10).replace(/[^0-9.]/g, ''));
      const price50 = parseFloat(String(row[colMap.price50] || price1_10).replace(/[^0-9.]/g, ''));
      
      batteries.push({
        'Model Name': modelName,
        'Manufacturer': manufacturer || 'HBE',
        'Capacity (kWh)': capacity,
        'Power (kW)': power,
        'C-Rate': crate || parseFloat((power / capacity).toFixed(2)),
        'Efficiency (%)': efficiency || 90,
        'Warranty (Years)': warranty || 10,
        'Price 1-10': price1_10,
        'Price 11-20': price11_20,
        'Price 21-50': price21_50,
        'Price 50+': price50,
        'Active': 'Yes',
      });
    }
  }
  
  console.log(`  Extracted ${batteries.length} batteries from HBE Excel`);
  return batteries;
}

async function extractFromPOSHPDF() {
  // For now, we'll manually add POSH data or extract from PDFs later
  // Returning known POSH models from existing catalog
  return [
    {
      'Model Name': 'POSH Station 207',
      'Manufacturer': 'POSH Energy',
      'Capacity (kWh)': 207,
      'Power (kW)': 60,
      'C-Rate': 0.29,
      'Efficiency (%)': 90,
      'Warranty (Years)': 10,
      'Price 1-10': 180000,
      'Price 11-20': 175000,
      'Price 21-50': 170000,
      'Price 50+': 165000,
      'Active': 'Yes' as const,
    },
  ];
}

async function main() {
  console.log('Extracting battery catalog from source files...\n');
  
  const allBatteries: BatteryRow[] = [];
  
  // Extract from HBE Excel
  const hbeBatteries = await extractFromHBEExcel();
  allBatteries.push(...hbeBatteries);
  
  // Extract from POSH
  const poshBatteries = await extractFromPOSHPDF();
  allBatteries.push(...poshBatteries);
  
  // Sort by manufacturer, then model
  allBatteries.sort((a, b) => {
    if (a.Manufacturer !== b.Manufacturer) {
      return a.Manufacturer.localeCompare(b.Manufacturer);
    }
    return a['Model Name'].localeCompare(b['Model Name']);
  });
  
  // Write to CSV
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
  
  const csvRows = allBatteries.map(b => [
    b['Model Name'],
    b.Manufacturer,
    b['Capacity (kWh)'],
    b['Power (kW)'],
    b['C-Rate'],
    b['Efficiency (%)'],
    b['Warranty (Years)'],
    b['Price 1-10'],
    b['Price 11-20'],
    b['Price 21-50'],
    b['Price 50+'],
    b.Active,
  ]);
  
  const csvContent = [
    csvHeader.join(','),
    ...csvRows.map(row => row.join(',')),
  ].join('\n');
  
  const outputPath = path.join(process.cwd(), 'data', 'battery-catalog.csv');
  await writeFile(outputPath, csvContent, 'utf-8');
  
  console.log(`\n✅ Created battery catalog with ${allBatteries.length} batteries`);
  console.log(`   Output: ${outputPath}`);
  console.log(`\nManufacturers:`);
  const manufacturers = [...new Set(allBatteries.map(b => b.Manufacturer))];
  manufacturers.forEach(m => {
    const count = allBatteries.filter(b => b.Manufacturer === m).length;
    console.log(`   - ${m}: ${count} models`);
  });
}

main().catch(console.error);
