/**
 * Modbus Protocol Adapter (TCP/RTU)
 *
 * Implements Modbus integration for industrial controllers and building systems.
 *
 * Implementation uses `modbus-serial` (pure JavaScript Modbus RTU/TCP client).
 * This adapter is intended to run on the server (Node.js), not in the browser.
 *
 * @see EVERWATT_AI_CORE_VISION.md - Vendor-agnostic design
 */

import { BaseProtocolAdapter } from '../base-protocol';
import { createRequire } from 'module';
import type {
  UnifiedDataPoint,
  DataPointReference,
  WriteCommand,
  BMSConnection,
  DiscoveryFilter,
  ConnectionStatus,
  ModbusConfig,
} from '../../types';
import { BMSIntegrationError, ConnectionError, ReadError, WriteError, ValidationError } from '../../types';

const require = createRequire(import.meta.url);
const ModbusRTU = require('modbus-serial');
type ModbusClient = any;

export class ModbusAdapter extends BaseProtocolAdapter {
  private config: ModbusConfig;
  private client: ModbusClient | null = null;
  private lastError?: string;
  private errorCount: number = 0;

  constructor(connection: BMSConnection) {
    super(connection);
    if (connection.protocol !== 'modbus') {
      throw new Error('ModbusAdapter requires Modbus connection');
    }
    this.config = connection.config as ModbusConfig;
  }

  async connect(): Promise<void> {
    try {
      this.client = new ModbusRTU();
      // Configure unit id and timeout
      this.client.setID(this.config.unitId);
      this.client.setTimeout(this.config.timeout ?? 3000);

      if (this.config.type === 'tcp') {
        await this.client.connectTCP(this.config.address, { port: this.config.port ?? 502 });
      } else {
        // RTU requires serialport in most environments; this will throw if not available
        const baudRate = this.config.serialConfig?.baudRate ?? 9600;
        const dataBits = this.config.serialConfig?.dataBits ?? 8;
        const stopBits = this.config.serialConfig?.stopBits ?? 1;
        const parity = this.config.serialConfig?.parity ?? 'none';
        await this.client.connectRTUBuffered(this.config.address, {
          baudRate,
          dataBits,
          stopBits,
          parity,
        });
      }

      this.connected = true;
      this.connection.lastConnected = new Date();
    } catch (error) {
      this.connected = false;
      this.client = null;
      throw new ConnectionError(
        `Failed to connect to Modbus device: ${error instanceof Error ? error.message : String(error)}`,
        this.connection.id
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client?.close?.();
    } catch {
      // ignore
    } finally {
      this.client = null;
    }
    this.connected = false;
  }

  async readPoint(ref: DataPointReference): Promise<UnifiedDataPoint> {
    this.ensureConnected();
    if (!this.client) throw new ConnectionError('Modbus client not initialized', this.connection.id);
    try {
      const target = this.parsePointId(ref.pointId);
      const unit = (ref.protocolData?.unit as string | undefined) ?? '';
      const name = (ref.protocolData?.name as string | undefined) ?? ref.pointId;

      let raw: any;
      switch (target.kind) {
        case 'holding-register':
          raw = await this.client.readHoldingRegisters(target.address, target.length);
          break;
        case 'input-register':
          raw = await this.client.readInputRegisters(target.address, target.length);
          break;
        case 'coil':
          raw = await this.client.readCoils(target.address, target.length);
          break;
        case 'discrete-input':
          raw = await this.client.readDiscreteInputs(target.address, target.length);
          break;
        default:
          throw new ValidationError(`Unsupported Modbus point kind: ${String((target as any).kind)}`, this.connection.id, ref.pointId);
      }

      const value = this.extractFirstValue(target.kind, raw);
      return {
        id: `${ref.connectionId}:${ref.pointId}`,
        name,
        value,
        unit,
        timestamp: new Date(),
        quality: 'good',
        _ref: ref,
      };
    } catch (error) {
      this.errorCount += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      throw new ReadError(
        `Failed to read Modbus point: ${error instanceof Error ? error.message : String(error)}`,
        ref.connectionId,
        ref.pointId
      );
    }
  }

  async readPoints(refs: DataPointReference[]): Promise<UnifiedDataPoint[]> {
    return Promise.all(refs.map((r) => this.readPoint(r)));
  }

  async writePoint(command: WriteCommand): Promise<void> {
    this.ensureConnected();
    if (!this.client) throw new ConnectionError('Modbus client not initialized', this.connection.id);
    try {
      const target = this.parsePointId(command.point.pointId);
      if (target.length !== 1) {
        throw new ValidationError('Modbus writes currently support only length=1 points', this.connection.id, command.point.pointId);
      }

      switch (target.kind) {
        case 'holding-register': {
          const v = typeof command.value === 'number' ? Math.trunc(command.value) : Number(command.value);
          if (!Number.isFinite(v)) throw new ValidationError('Invalid value for holding-register write', this.connection.id, command.point.pointId);
          await this.client.writeRegister(target.address, v);
          break;
        }
        case 'coil': {
          const v = typeof command.value === 'boolean' ? command.value : Boolean(command.value);
          await this.client.writeCoil(target.address, v);
          break;
        }
        default:
          throw new ValidationError(`Writes not supported for ${target.kind}`, this.connection.id, command.point.pointId);
      }
    } catch (error) {
      this.errorCount += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      throw new WriteError(
        `Failed to write Modbus point: ${error instanceof Error ? error.message : String(error)}`,
        command.point.connectionId,
        command.point.pointId
      );
    }
  }

  async writePoints(commands: WriteCommand[]): Promise<void> {
    await Promise.all(commands.map((c) => this.writePoint(c)));
  }

  async discoverPoints(_filter?: DiscoveryFilter): Promise<UnifiedDataPoint[]> {
    this.ensureConnected();
    if (!this.client) throw new ConnectionError('Modbus client not initialized', this.connection.id);

    // Modbus has no self-describing discovery; we provide a controlled scan when a range is specified.
    // Use filter.objectType to specify what to scan:
    //   "holding-register:0-99"
    //   "input-register:0-99"
    //   "coil:0-99"
    //   "discrete-input:0-99"
    const spec = _filter?.objectType;
    if (!spec) return [];

    const { kind, start, end } = this.parseScanSpec(spec);
    const limit = _filter?.limit ?? 200;
    const maxEnd = Math.min(end, start + limit - 1);

    const points: UnifiedDataPoint[] = [];

    if (kind === 'holding-register' || kind === 'input-register') {
      // registers can be read in blocks (max 125 typical)
      const readFn =
        kind === 'holding-register'
          ? (addr: number, len: number) => this.client!.readHoldingRegisters(addr, len)
          : (addr: number, len: number) => this.client!.readInputRegisters(addr, len);

      const maxBlock = 100;
      for (let addr = start; addr <= maxEnd; addr += maxBlock) {
        const len = Math.min(maxBlock, maxEnd - addr + 1);
        const res = await readFn(addr, len);
        const data: any[] = Array.isArray(res?.data) ? res.data : [];
        for (let i = 0; i < data.length; i++) {
          const pointId = `${kind}:${addr + i}`;
          points.push({
            id: `${this.connection.id}:${pointId}`,
            name: pointId,
            value: data[i],
            unit: '',
            timestamp: new Date(),
            quality: 'good',
            _ref: { protocol: 'modbus', connectionId: this.connection.id, pointId },
          });
        }
      }
      return points;
    }

    if (kind === 'coil' || kind === 'discrete-input') {
      const readFn =
        kind === 'coil'
          ? (addr: number, len: number) => this.client!.readCoils(addr, len)
          : (addr: number, len: number) => this.client!.readDiscreteInputs(addr, len);

      const maxBlock = 200;
      for (let addr = start; addr <= maxEnd; addr += maxBlock) {
        const len = Math.min(maxBlock, maxEnd - addr + 1);
        const res = await readFn(addr, len);
        const data: any[] = Array.isArray(res?.data) ? res.data : [];
        for (let i = 0; i < data.length; i++) {
          const pointId = `${kind}:${addr + i}`;
          points.push({
            id: `${this.connection.id}:${pointId}`,
            name: pointId,
            value: Boolean(data[i]),
            unit: '',
            timestamp: new Date(),
            quality: 'good',
            _ref: { protocol: 'modbus', connectionId: this.connection.id, pointId },
          });
        }
      }
      return points;
    }

    return [];
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return {
      connectionId: this.connection.id,
      connected: this.connected,
      lastConnected: this.connection.lastConnected,
      lastError: this.lastError,
      errorCount: this.errorCount,
      protocol: 'modbus',
    };
  }

  protected toUnified(_protocolData: any, _ref: DataPointReference): UnifiedDataPoint {
    throw new Error('Use readPoint() for Modbus; toUnified is not used.');
  }

  protected fromUnified(_command: WriteCommand): any {
    return {};
  }

  private parsePointId(pointId: string): { kind: 'holding-register' | 'input-register' | 'coil' | 'discrete-input'; address: number; length: number } {
    // Supported formats:
    // - holding-register:40001
    // - input-register:30001
    // - coil:1
    // - discrete-input:10001
    const trimmed = String(pointId || '').trim();
    const [kindRaw, addrRaw] = trimmed.split(':');
    if (!kindRaw || !addrRaw) throw new ValidationError(`Invalid Modbus pointId format: ${pointId}`, this.connection.id, pointId);
    const kind = kindRaw.toLowerCase() as any;
    const address = Number.parseInt(addrRaw, 10);
    if (!Number.isFinite(address)) throw new ValidationError(`Invalid Modbus address: ${addrRaw}`, this.connection.id, pointId);
    // NOTE: We treat the provided address as 0-based for now. If you use 1-based (40001),
    // we will add support for offset normalization in bms-8 with proper conventions.
    return { kind, address, length: 1 };
  }

  private extractFirstValue(kind: string, result: any): number | boolean {
    // modbus-serial returns { data: [...] }
    const data = result?.data;
    if (!Array.isArray(data) || data.length === 0) return kind === 'coil' || kind === 'discrete-input' ? false : 0;
    return data[0];
  }

  private parseScanSpec(spec: string): { kind: 'holding-register' | 'input-register' | 'coil' | 'discrete-input'; start: number; end: number } {
    const [kindRaw, rangeRaw] = String(spec || '').split(':');
    const kind = (kindRaw || '').toLowerCase() as any;
    const range = (rangeRaw || '').trim();
    const m = range.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!m) {
      throw new ValidationError(`Invalid Modbus scan spec '${spec}'. Use e.g. holding-register:0-99`, this.connection.id);
    }
    const start = Number.parseInt(m[1], 10);
    const end = Number.parseInt(m[2], 10);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      throw new ValidationError(`Invalid Modbus scan range '${range}'`, this.connection.id);
    }
    return { kind, start, end };
  }
}


