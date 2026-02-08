/**
 * BACnet Smoke Test (Node-only)
 *
 * Usage (PowerShell):
 *   $env:BACNET_TARGET="192.168.1.43"
 *   $env:BACNET_OBJECT="ANALOG_INPUT:1"
 *   npx tsx src/modules/integration/protocols/bacnet/test-bacnet.ts
 *
 * Optional:
 *   $env:BACNET_PROPERTY="PRESENT_VALUE"
 *
 * Notes:
 * - Requires L2 network access to a BACnet/IP device or simulator (e.g., YABE).
 * - This script is intentionally minimal: whoIs + readProperty.
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Bacnet = require('bacstack');

const target = (process.env.BACNET_TARGET || '').trim();
const objectStr = (process.env.BACNET_OBJECT || 'ANALOG_INPUT:1').trim();
const propertyStr = (process.env.BACNET_PROPERTY || 'PRESENT_VALUE').trim();
const timeoutMs = Number.parseInt(process.env.BACNET_TIMEOUT_MS || '2500', 10) || 2500;

function normalizeKey(s: string): string {
  return s
    .trim()
    .replace(/[-\s]+/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

function parseObjectId(s: string): { type: number; instance: number } {
  const [typeRaw, instanceRaw] = s.split(':');
  const typeKey = normalizeKey(typeRaw || '');
  const instance = Number.parseInt(instanceRaw || '', 10);
  const type = Bacnet.enum.ObjectType[typeKey];
  if (typeof type !== 'number' || !Number.isFinite(instance)) {
    throw new Error(`Invalid BACnet object '${s}'. Use format like ANALOG_INPUT:1`);
  }
  return { type, instance };
}

function parsePropertyId(s: string): number {
  const key = normalizeKey(s);
  const id = Bacnet.enum.PropertyIdentifier[key];
  if (typeof id !== 'number') throw new Error(`Unknown BACnet property '${s}'`);
  return id;
}

async function main(): Promise<void> {
  if (!target) {
    console.log('Set BACNET_TARGET to the device IP, e.g. 192.168.1.43');
    process.exit(1);
  }

  const objectId = parseObjectId(objectStr);
  const propertyId = parsePropertyId(propertyStr);

  const client = new Bacnet({ apduTimeout: timeoutMs });

  client.on('iAm', (device: any) => {
    console.log('iAm:', device);
  });

  console.log(`Sending Who-Is (unicast): ${target}`);
  client.whoIs({ address: target });

  console.log(`Reading ${propertyStr} from ${objectStr} @ ${target}`);
  const result = await new Promise<any>((resolve, reject) => {
    client.readProperty(target, objectId, propertyId, (err: any, value: any) => {
      if (err) return reject(err);
      resolve(value);
    });
  });

  console.log('readProperty result:', JSON.stringify(result, null, 2));
  client.close();
}

main().catch((err) => {
  console.error('BACnet test failed:', err);
  process.exit(1);
});


