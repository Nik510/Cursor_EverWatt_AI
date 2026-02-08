/**
 * Modbus Smoke Test (Node-only)
 *
 * Usage (PowerShell):
 *   $env:MODBUS_HOST="127.0.0.1"
 *   $env:MODBUS_PORT="502"
 *   $env:MODBUS_UNIT="1"
 *   $env:MODBUS_POINT="holding-register:0"
 *   npx tsx src/modules/integration/protocols/modbus/test-modbus.ts
 *
 * Notes:
 * - Requires a Modbus TCP device/simulator.
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ModbusRTU = require('modbus-serial');

const host = (process.env.MODBUS_HOST || '').trim();
const port = Number.parseInt(process.env.MODBUS_PORT || '502', 10) || 502;
const unitId = Number.parseInt(process.env.MODBUS_UNIT || '1', 10) || 1;
const pointId = (process.env.MODBUS_POINT || 'holding-register:0').trim();

function parsePoint(point: string): { kind: string; address: number } {
  const [kind, addressRaw] = point.split(':');
  const address = Number.parseInt(addressRaw || '', 10);
  if (!kind || !Number.isFinite(address)) throw new Error(`Invalid MODBUS_POINT '${point}'`);
  return { kind: kind.toLowerCase(), address };
}

async function main(): Promise<void> {
  if (!host) {
    console.log('Set MODBUS_HOST (and optionally MODBUS_PORT/MODBUS_UNIT/MODBUS_POINT).');
    process.exit(1);
  }

  const client = new ModbusRTU();
  await client.connectTCP(host, { port });
  client.setID(unitId);

  const { kind, address } = parsePoint(pointId);

  let res: any;
  if (kind === 'holding-register') res = await client.readHoldingRegisters(address, 1);
  else if (kind === 'input-register') res = await client.readInputRegisters(address, 1);
  else if (kind === 'coil') res = await client.readCoils(address, 1);
  else if (kind === 'discrete-input') res = await client.readDiscreteInputs(address, 1);
  else throw new Error(`Unsupported kind '${kind}'`);

  console.log('Result:', res);
  await client.close();
}

main().catch((err) => {
  console.error('Modbus test failed:', err);
  process.exit(1);
});


