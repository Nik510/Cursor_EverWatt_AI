/**
 * Base Protocol Adapter
 * 
 * Abstract base class for all protocol adapters (BACnet, Modbus, REST, etc.)
 * Ensures consistent interface across all protocols.
 * 
 * @see EVERWATT_AI_CORE_VISION.md - Vendor-agnostic design
 */

import type {
  UnifiedDataPoint,
  DataPointReference,
  WriteCommand,
  BMSConnection,
  DiscoveryFilter,
  ConnectionStatus,
} from '../types';

/**
 * Base class for all protocol adapters
 * 
 * Each protocol (BACnet, Modbus, REST) implements this interface.
 * This ensures the unified interface can work with any protocol.
 */
export abstract class BaseProtocolAdapter {
  protected connection: BMSConnection;
  protected connected: boolean = false;

  constructor(connection: BMSConnection) {
    this.connection = connection;
  }

  /**
   * Connect to the BMS system
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the BMS system
   */
  abstract disconnect(): Promise<void>;

  /**
   * Read a single data point
   */
  abstract readPoint(ref: DataPointReference): Promise<UnifiedDataPoint>;

  /**
   * Read multiple data points
   */
  abstract readPoints(refs: DataPointReference[]): Promise<UnifiedDataPoint[]>;

  /**
   * Write a value to a point
   */
  abstract writePoint(command: WriteCommand): Promise<void>;

  /**
   * Write multiple values
   */
  abstract writePoints(commands: WriteCommand[]): Promise<void>;

  /**
   * Discover available points
   */
  abstract discoverPoints(filter?: DiscoveryFilter): Promise<UnifiedDataPoint[]>;

  /**
   * Get connection status
   */
  abstract getConnectionStatus(): Promise<ConnectionStatus>;

  /**
   * Convert protocol-specific data to unified format
   * 
   * Each adapter implements this to convert their protocol's
   * data format to the unified UnifiedDataPoint format.
   */
  protected abstract toUnified(
    protocolData: any,
    ref: DataPointReference
  ): UnifiedDataPoint;

  /**
   * Convert unified format to protocol-specific command
   * 
   * Each adapter implements this to convert a WriteCommand
   * to their protocol's specific write format.
   */
  protected abstract fromUnified(command: WriteCommand): any;

  /**
   * Validate connection is ready
   */
  protected ensureConnected(): void {
    if (!this.connected) {
      throw new Error(
        `Not connected to ${this.connection.protocol} system: ${this.connection.id}`
      );
    }
  }

  /**
   * Get connection ID
   */
  getConnectionId(): string {
    return this.connection.id;
  }

  /**
   * Get protocol type
   */
  getProtocol(): string {
    return this.connection.protocol;
  }
}

