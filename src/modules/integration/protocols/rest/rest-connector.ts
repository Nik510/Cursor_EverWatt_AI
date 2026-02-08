/**
 * REST Protocol Adapter
 *
 * Implements vendor-agnostic REST API integration for modern BMS/EMS platforms.
 *
 * This adapter uses server-side `fetch` (Node >=18). It is intended to run on the server.
 *
 * Vendor-specific adapters live under `api-adapters/` and normalize data to UnifiedDataPoint.
 *
 * @see EVERWATT_AI_CORE_VISION.md - Vendor-agnostic design
 */

import { BaseProtocolAdapter } from '../base-protocol';
import type {
  UnifiedDataPoint,
  DataPointReference,
  WriteCommand,
  BMSConnection,
  DiscoveryFilter,
  ConnectionStatus,
  RESTConfig,
} from '../../types';
import { BMSIntegrationError, ConnectionError, ReadError, WriteError, ValidationError } from '../../types';

import { IgnitionAdapter } from './api-adapters/ignition-adapter';
import { NiagaraAdapter } from './api-adapters/niagara-adapter';
import { GenericRESTAdapter } from './api-adapters/generic-adapter';

type VendorAdapter = {
  readPoint: (cfg: RESTConfig, ref: DataPointReference) => Promise<UnifiedDataPoint>;
  writePoint: (cfg: RESTConfig, cmd: WriteCommand) => Promise<void>;
  discoverPoints: (cfg: RESTConfig, filter?: DiscoveryFilter) => Promise<UnifiedDataPoint[]>;
};

export class RESTAdapter extends BaseProtocolAdapter {
  private config: RESTConfig;
  private adapterImpl: VendorAdapter;
  private lastError?: string;
  private errorCount: number = 0;

  constructor(connection: BMSConnection) {
    super(connection);
    if (connection.protocol !== 'rest') {
      throw new Error('RESTAdapter requires REST connection');
    }
    this.config = connection.config as RESTConfig;
    this.adapterImpl = this.createVendorAdapter(this.config.adapter);
  }

  async connect(): Promise<void> {
    try {
      // REST generally does not require a persistent connection.
      // We still mark as connected to satisfy the unified interface contract.
      this.connected = true;
      this.connection.lastConnected = new Date();
    } catch (error) {
      this.connected = false;
      throw new ConnectionError(
        `Failed to initialize REST adapter: ${error instanceof Error ? error.message : String(error)}`,
        this.connection.id
      );
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async readPoint(ref: DataPointReference): Promise<UnifiedDataPoint> {
    this.ensureConnected();
    try {
      return await this.adapterImpl.readPoint(this.config, ref);
    } catch (error) {
      this.errorCount += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      throw new ReadError(
        `Failed to read REST point: ${error instanceof Error ? error.message : String(error)}`,
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
    try {
      await this.adapterImpl.writePoint(this.config, command);
    } catch (error) {
      this.errorCount += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      throw new WriteError(
        `Failed to write REST point: ${error instanceof Error ? error.message : String(error)}`,
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
    try {
      return await this.adapterImpl.discoverPoints(this.config, _filter);
    } catch (error) {
      this.errorCount += 1;
      this.lastError = error instanceof Error ? error.message : String(error);
      throw new BMSIntegrationError(
        `REST discovery failed: ${error instanceof Error ? error.message : String(error)}`,
        'DISCOVERY_FAILED',
        this.connection.id
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
      protocol: 'rest',
    };
  }

  protected toUnified(_protocolData: any, _ref: DataPointReference): UnifiedDataPoint {
    throw new Error('Use vendor adapters for REST; toUnified is not used.');
  }

  protected fromUnified(_command: WriteCommand): any {
    return {};
  }

  private createVendorAdapter(kind: RESTConfig['adapter']): VendorAdapter {
    switch (kind) {
      case 'ignition':
        return new IgnitionAdapter();
      case 'niagara':
        return new NiagaraAdapter();
      case 'generic':
      default:
        return new GenericRESTAdapter();
    }
  }
}


