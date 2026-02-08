/**
 * BACnet Protocol Adapter
 * 
 * Implements BACnet/IP integration for building automation systems.
 * 
 * Implementation uses `bacstack` (pure JavaScript BACnet/IP stack).
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
  BACnetConfig,
} from '../../types';
import { ReadError, WriteError, ConnectionError, ValidationError } from '../../types';

const require = createRequire(import.meta.url);
const Bacnet = require('bacstack');
type BacnetClient = any;

/**
 * BACnet Adapter
 * 
 * Connects to BACnet/IP devices and reads/writes points.
 */
export class BACnetAdapter extends BaseProtocolAdapter {
  private config: BACnetConfig;
  private client: BacnetClient | null = null;
  private lastError?: string;
  private errorCount: number = 0;

  constructor(connection: BMSConnection) {
    super(connection);
    if (connection.protocol !== 'bacnet') {
      throw new Error('BACnetAdapter requires BACnet connection');
    }
    this.config = connection.config as BACnetConfig;
  }

  async connect(): Promise<void> {
    try {
      // bacstack binds a UDP socket immediately on construction
      this.client = new Bacnet({
        port: this.config.port || 47808,
        apduTimeout: this.config.timeout || 3000,
      });

      this.client.on('error', (err: any) => {
        this.errorCount += 1;
        this.lastError = err instanceof Error ? err.message : String(err);
      });

      this.connected = true;
      this.connection.lastConnected = new Date();

      // Best-effort discovery ping (won't fail connect if no device responds)
      try {
        this.client.whoIs({ address: this.config.address });
      } catch {
        // ignore
      }
    } catch (error) {
      this.connected = false;
      this.client = null;
      throw new ConnectionError(
        `Failed to connect to BACnet device: ${error instanceof Error ? error.message : String(error)}`,
        this.connection.id
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.client?.close?.();
    } catch {
      // ignore
    } finally {
      this.client = null;
    }
    this.connected = false;
  }

  async readPoint(ref: DataPointReference): Promise<UnifiedDataPoint> {
    this.ensureConnected();
    if (!this.client) throw new ConnectionError('BACnet client not initialized', this.connection.id);

    try {
      const target = this.getTargetAddress(ref);
      const objectId = this.parsePointId(ref.pointId);
      const propertyId =
        (ref.protocolData?.propertyId as number | undefined) ??
        Bacnet.enum.PropertyIdentifier.PRESENT_VALUE;

      const result = await new Promise<any>((resolve, reject) => {
        this.client!.readProperty(target, objectId, propertyId, (err: any, value: any) => {
          if (err) return reject(err);
          resolve(value);
        });
      });

      return this.toUnified(result, ref);
    } catch (error) {
      this.errorCount += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      throw new ReadError(
        `Failed to read BACnet point: ${error instanceof Error ? error.message : String(error)}`,
        ref.connectionId,
        ref.pointId
      );
    }
  }

  async readPoints(refs: DataPointReference[]): Promise<UnifiedDataPoint[]> {
    // Read points in parallel for efficiency
    const promises = refs.map((ref) => this.readPoint(ref));
    return Promise.all(promises);
  }

  async writePoint(command: WriteCommand): Promise<void> {
    this.ensureConnected();
    if (!this.client) throw new ConnectionError('BACnet client not initialized', this.connection.id);

    try {
      const target = this.getTargetAddress(command.point);
      const objectId = this.parsePointId(command.point.pointId);
      const propertyId =
        (command.point.protocolData?.propertyId as number | undefined) ??
        Bacnet.enum.PropertyIdentifier.PRESENT_VALUE;

      const values = [this.jsValueToBacnetValue(command.value)];
      const options = {
        priority: command.constraints?.min !== undefined || command.constraints?.max !== undefined ? undefined : undefined,
      };

      await new Promise<void>((resolve, reject) => {
        this.client!.writeProperty(target, objectId, propertyId, values, options, (err: any) => {
          if (err) return reject(err);
          resolve();
        });
      });
    } catch (error) {
      this.errorCount += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      throw new WriteError(
        `Failed to write BACnet point: ${error instanceof Error ? error.message : String(error)}`,
        command.point.connectionId,
        command.point.pointId
      );
    }
  }

  async writePoints(commands: WriteCommand[]): Promise<void> {
    // Write points in parallel
    const promises = commands.map((cmd) => this.writePoint(cmd));
    await Promise.all(promises);
  }

  async discoverPoints(filter?: DiscoveryFilter): Promise<UnifiedDataPoint[]> {
    this.ensureConnected();
    if (!this.client) throw new ConnectionError('BACnet client not initialized', this.connection.id);

    try {
      const limit = filter?.limit ?? 100;
      const target = this.config.address;
      const deviceObjectId = { type: Bacnet.enum.ObjectType.DEVICE, instance: this.config.deviceId };
      const objectList = await new Promise<any>((resolve, reject) => {
        this.client!.readProperty(
          target,
          deviceObjectId,
          Bacnet.enum.PropertyIdentifier.OBJECT_LIST,
          (err: any, value: any) => (err ? reject(err) : resolve(value))
        );
      });

      const values: any[] = Array.isArray(objectList?.values) ? objectList.values : [];

      const objectIds: Array<{ type: number; instance: number }> = values
        .map((v) => v?.value)
        .filter((oid) => oid && typeof oid.type === 'number' && typeof oid.instance === 'number')
        .slice(0, limit);

      if (objectIds.length === 0) return [];

      // Pull name/value/units in one RPM call for efficiency.
      const requestArray = objectIds.map((oid) => ({
        objectId: { type: oid.type, instance: oid.instance },
        properties: [
          { id: Bacnet.enum.PropertyIdentifier.OBJECT_NAME },
          { id: Bacnet.enum.PropertyIdentifier.PRESENT_VALUE },
          { id: Bacnet.enum.PropertyIdentifier.UNITS },
        ],
      }));

      const rpm = await new Promise<any>((resolve, reject) => {
        this.client!.readPropertyMultiple(target, requestArray, (err: any, value: any) =>
          err ? reject(err) : resolve(value)
        );
      });

      const rows: any[] = Array.isArray(rpm?.values) ? rpm.values : [];
      const points: UnifiedDataPoint[] = [];
      for (const row of rows) {
        const oid = row?.objectId;
        if (!oid || typeof oid.type !== 'number' || typeof oid.instance !== 'number') continue;
        const pointId = `${this.objectTypeToId(oid.type)}:${oid.instance}`;
        const props: any[] = Array.isArray(row?.values) ? row.values : [];

        const getProp = (pid: number) => props.find((p) => p?.id === pid)?.value?.[0];
        const nameVal = getProp(Bacnet.enum.PropertyIdentifier.OBJECT_NAME);
        const pvVal = getProp(Bacnet.enum.PropertyIdentifier.PRESENT_VALUE);
        const unitVal = getProp(Bacnet.enum.PropertyIdentifier.UNITS);

        points.push({
          id: `${this.connection.id}:${pointId}`,
          name: typeof nameVal?.value === 'string' ? nameVal.value : pointId,
          value: pvVal?.value ?? '',
          unit: unitVal?.value != null ? String(unitVal.value) : '',
          timestamp: new Date(),
          quality: 'good',
          _ref: {
            protocol: 'bacnet',
            connectionId: this.connection.id,
            pointId,
            protocolData: { address: target },
          },
        });
      }

      // Optional filter by name pattern
      if (filter?.namePattern) {
        const re = new RegExp(filter.namePattern, 'i');
        return points.filter((p) => re.test(p.name));
      }

      return points;
    } catch (error) {
      throw new Error(
        `Failed to discover BACnet points: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    return {
      connectionId: this.connection.id,
      connected: this.connected,
      lastConnected: this.connection.lastConnected,
      lastError: this.lastError,
      errorCount: this.errorCount,
      protocol: 'bacnet',
    };
  }

  protected toUnified(protocolData: any, ref: DataPointReference): UnifiedDataPoint {
    const values: any[] = Array.isArray(protocolData?.values) ? protocolData.values : [];
    const first = values[0];
    const value = first?.value ?? '';
    const unit = (ref.protocolData?.unit as string | undefined) ?? '';

    return {
      id: `${ref.connectionId}:${ref.pointId}`,
      name: (ref.protocolData?.name as string | undefined) ?? ref.pointId,
      value: value,
      unit,
      timestamp: new Date(),
      quality: 'good',
      _ref: ref,
    };
  }

  protected fromUnified(command: WriteCommand): any {
    return this.jsValueToBacnetValue(command.value);
  }

  /**
   * Parse BACnet point ID from string format
   * 
   * Expected format: "analog-input:1" or "analog-output:5"
   */
  private parsePointId(pointId: string): { objectType: number; instance: number } {
    const trimmed = String(pointId || '').trim();
    const [typeRaw, instanceRaw] = trimmed.split(':');
    if (!typeRaw || instanceRaw === undefined) {
      throw new ValidationError(`Invalid BACnet pointId format: ${pointId}`, this.connection.id, pointId);
    }

    const instance = Number.parseInt(instanceRaw, 10);
    if (!Number.isFinite(instance)) {
      throw new ValidationError(`Invalid BACnet instance: ${instanceRaw}`, this.connection.id, pointId);
    }

    const key = this.normalizeObjectTypeKey(typeRaw);
    const objectType = Bacnet.enum.ObjectType[key];
    if (typeof objectType !== 'number') {
      throw new ValidationError(`Unknown BACnet object type: ${typeRaw}`, this.connection.id, pointId);
    }

    return { objectType, instance };
  }

  private normalizeObjectTypeKey(typeRaw: string): string {
    return String(typeRaw || '')
      .trim()
      .replace(/[-\s]+/g, '_')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toUpperCase();
  }

  private getTargetAddress(ref: DataPointReference): string {
    // Prefer explicit per-point address if provided; otherwise use connection address.
    const addr = (ref.protocolData?.address as string | undefined) ?? this.config.address;
    if (!addr) throw new ValidationError('Missing BACnet target address', this.connection.id, ref.pointId);
    return addr;
  }

  private jsValueToBacnetValue(value: number | boolean | string): { type: number; value: any } {
    if (typeof value === 'boolean') {
      return { type: Bacnet.enum.ApplicationTags.BOOLEAN, value };
    }
    if (typeof value === 'number') {
      return { type: Bacnet.enum.ApplicationTags.REAL, value };
    }
    if (typeof value === 'string') {
      return { type: Bacnet.enum.ApplicationTags.CHARACTER_STRING, value };
    }
    // Fallback
    return { type: Bacnet.enum.ApplicationTags.CHARACTER_STRING, value: String(value) };
  }

  private objectTypeToId(objectType: number): string {
    // Try to reverse-map the enum for human-readable IDs.
    const entries = Object.entries(Bacnet.enum.ObjectType) as Array<[string, any]>;
    const found = entries.find(([, v]) => v === objectType)?.[0];
    return found ? found.toLowerCase().replace(/_/g, '-') : String(objectType);
  }
}

