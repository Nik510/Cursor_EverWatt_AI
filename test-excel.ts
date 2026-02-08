/**
 * Test script for Excel billing data reader
 * Tests the smart Excel reader on the USAGE.csv file
 */

import { readMonthlyBills } from './src/utils/excel-reader';

import path from 'path';
const filePath = path.join(process.cwd(), 'data', 'USAGE.csv');

console.log('='.repeat(80));
console.log('TESTING EXCEL BILLING DATA READER');
console.log('='.repeat(80));
console.log();
console.log(`Reading file: ${filePath}`);
console.log();

try {
  const bills = readMonthlyBills(filePath);
  
  console.log(`✅ Successfully read ${bills.length} monthly bills`);
  console.log();
  console.log('='.repeat(80));
  console.log('MONTHLY BILLING DATA');
  console.log('='.repeat(80));
  console.log();
  console.log(
    'Date'.padEnd(15) +
    'Total Usage (kWh)'.padEnd(20) +
    'Peak Demand (kW)'.padEnd(20) +
    'Total Cost ($)'.padEnd(15)
  );
  console.log('-'.repeat(80));
  
  for (const bill of bills) {
    const dateStr = bill.date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const usageStr = bill.totalUsageKwh.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const demandStr = bill.peakDemandKw > 0 
      ? bill.peakDemandKw.toLocaleString('en-US', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : 'N/A';
    const costStr = bill.totalCost.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    console.log(
      dateStr.padEnd(15) +
      usageStr.padEnd(20) +
      demandStr.padEnd(20) +
      costStr.padEnd(15)
    );
  }
  
  console.log();
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log();
  
  const totalUsage = bills.reduce((sum, b) => sum + b.totalUsageKwh, 0);
  const avgUsage = totalUsage / bills.length;
  const maxDemand = Math.max(...bills.map(b => b.peakDemandKw));
  const totalCost = bills.reduce((sum, b) => sum + b.totalCost, 0);
  const avgCost = totalCost / bills.length;
  
  console.log(`Total Months: ${bills.length}`);
  console.log(`Total Usage: ${totalUsage.toLocaleString('en-US', { maximumFractionDigits: 0 })} kWh`);
  console.log(`Average Monthly Usage: ${avgUsage.toLocaleString('en-US', { maximumFractionDigits: 0 })} kWh`);
  console.log(`Maximum Peak Demand: ${maxDemand.toLocaleString('en-US', { maximumFractionDigits: 1 })} kW`);
  console.log(`Total Cost: ${totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`);
  console.log(`Average Monthly Cost: ${avgCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`);
  console.log();
  
} catch (error) {
  console.error('❌ Error reading file:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

