/**
 * Unified BMS Interface
 * 
 * Vendor-agnostic API for BMS/EMS integration.
 * This is the ONLY interface the rest of EverWatt.AI should use.
 * 
 * Protocol-specific details are completely hidden in adapters.
 * 
 * @see EVERWATT_AI_CORE_VISION.md - Must remain vendor-agnostic
 */

import type {
  UnifiedDataPoint,
  DataPointReference,
  WriteCommand,
  BMSConnection,
  Subscription,
  DiscoveryFilter,
  ConnectionStatus,
  DiscoveryResult,
} from './types';
import { BaseProtocolAdapter } from './protocols/base-protocol';
import { BMSIntegrationError, ConnectionError } from './types';
import { checkWriteConstraints } from './safety/constraint-checker';
import { validateWriteCommand } from './safety/command-validator';
import { withBestEffortRollback } from './safety/rollback-manager';

/**
 * Unified BMS Interface
 * 
 * Provides a single, vendor-agnostic API for all BMS/EMS systems.
 * Routes requests to the appropriate protocol adapter.
 */
export class UnifiedBMSInterface {
  private connections: Map<string, BMSConnection> = new Map();
  private adapters: Map<string, BaseProtocolAdapter> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private subscriptionIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Add a BMS connection
   */
  async addConnection(connection: BMSConnection): Promise<void> {
    this.connections.set(connection.id, connection);

    // Create adapter for this connection
    const adapter = await this.createAdapter(connection);
    this.adapters.set(connection.id, adapter);

    // Connect if enabled
    if (connection.enabled) {
      await adapter.connect();
    }
  }

  /**
   * Remove a connection
   */
  async removeConnection(connectionId: string): Promise<void> {
    const adapter = this.adapters.get(connectionId);
    if (adapter) {
      await adapter.disconnect();
      this.adapters.delete(connectionId);
    }
    this.connections.delete(connectionId);

    // Cancel any subscriptions for this connection
    for (const [subId, sub] of this.subscriptions.entries()) {
      if (sub.points.some((p) => p.connectionId === connectionId)) {
        await this.unsubscribe(subId);
      }
    }
  }

  /**
   * Read a single data point
   */
  async readPoint(ref: DataPointReference): Promise<UnifiedDataPoint> {
    const adapter = this.getAdapter(ref.connectionId);
    return await adapter.readPoint(ref);
  }

  /**
   * Read multiple data points
   */
  async readPoints(refs: DataPointReference[]): Promise<UnifiedDataPoint[]> {
    // Group by connection for efficiency
    const byConnection = new Map<string, DataPointReference[]>();
    for (const ref of refs) {
      if (!byConnection.has(ref.connectionId)) {
        byConnection.set(ref.connectionId, []);
      }
      byConnection.get(ref.connectionId)!.push(ref);
    }

    // Read from each connection
    const results: UnifiedDataPoint[] = [];
    for (const [connectionId, connectionRefs] of byConnection.entries()) {
      const adapter = this.getAdapter(connectionId);
      const points = await adapter.readPoints(connectionRefs);
      results.push(...points);
    }

    return results;
  }

  /**
   * Write a value to a point
   */
  async writePoint(command: WriteCommand): Promise<void> {
    validateWriteCommand(command);
    checkWriteConstraints(command);
    const adapter = this.getAdapter(command.point.connectionId);
    return await withBestEffortRollback(
      () => adapter.readPoint(command.point),
      (cmd) => adapter.writePoint(cmd),
      command
    );
  }

  /**
   * Write multiple values
   */
  async writePoints(commands: WriteCommand[]): Promise<void> {
    // Group by connection
    const byConnection = new Map<string, WriteCommand[]>();
    for (const cmd of commands) {
      validateWriteCommand(cmd);
      checkWriteConstraints(cmd);
      if (!byConnection.has(cmd.point.connectionId)) {
        byConnection.set(cmd.point.connectionId, []);
      }
      byConnection.get(cmd.point.connectionId)!.push(cmd);
    }

    // Write to each connection
    for (const [connectionId, connectionCommands] of byConnection.entries()) {
      const adapter = this.getAdapter(connectionId);
      // Best-effort rollback per command (keeps semantics safe)
      for (const cmd of connectionCommands) {
        await withBestEffortRollback(
          () => adapter.readPoint(cmd.point),
          (c) => adapter.writePoint(c),
          cmd
        );
      }
    }
  }

  /**
   * Subscribe to real-time updates
   */
  async subscribe(subscription: Subscription): Promise<string> {
    this.subscriptions.set(subscription.id, subscription);

    // Start polling (or push if protocol supports)
    const interval = subscription.interval || 5000; // Default 5 seconds
    const intervalId = setInterval(async () => {
      try {
        const data = await this.readPoints(subscription.points);
        subscription.callback(data);
      } catch (error) {
        console.error(`Subscription ${subscription.id} error:`, error);
      }
    }, interval);

    this.subscriptionIntervals.set(subscription.id, intervalId);

    return subscription.id;
  }

  /**
   * Unsubscribe from updates
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const intervalId = this.subscriptionIntervals.get(subscriptionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.subscriptionIntervals.delete(subscriptionId);
    }
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Discover available points
   */
  async discoverPoints(
    connectionId: string,
    filter?: DiscoveryFilter
  ): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const adapter = this.getAdapter(connectionId);
    const points = await adapter.discoverPoints(filter);

    return {
      connectionId,
      points,
      totalFound: points.length,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(connectionId: string): Promise<ConnectionStatus> {
    const adapter = this.getAdapter(connectionId);
    return await adapter.getConnectionStatus();
  }

  /**
   * Get all connections
   */
  getConnections(): BMSConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get adapter for a connection
   */
  private getAdapter(connectionId: string): BaseProtocolAdapter {
    const adapter = this.adapters.get(connectionId);
    if (!adapter) {
      throw new ConnectionError(
        `No adapter found for connection: ${connectionId}`,
        connectionId
      );
    }
    return adapter;
  }

  /**
   * Create adapter for a connection
   * 
   * Factory method that creates the appropriate adapter
   * based on the protocol type.
   */
  private async createAdapter(
    connection: BMSConnection
  ): Promise<BaseProtocolAdapter> {
    // Lazy load adapters to avoid circular dependencies
    switch (connection.protocol) {
      case 'bacnet':
        const { BACnetAdapter } = await import('./protocols/bacnet/bacnet-client');
        return new BACnetAdapter(connection);

      case 'modbus':
        const { ModbusAdapter } = await import('./protocols/modbus/modbus-client');
        return new ModbusAdapter(connection);

      case 'rest':
        const { RESTAdapter } = await import('./protocols/rest/rest-connector');
        return new RESTAdapter(connection);

      case 'opcua':
        // Future implementation
        throw new BMSIntegrationError(
          'OPC-UA adapter not yet implemented',
          'NOT_IMPLEMENTED'
        );

      default:
        throw new BMSIntegrationError(
          `Unknown protocol: ${connection.protocol}`,
          'UNKNOWN_PROTOCOL'
        );
    }
  }
}

/**
 * Singleton instance (optional - can also instantiate per use case)
 */
let defaultInstance: UnifiedBMSInterface | null = null;

/**
 * Get the default unified interface instance
 */
export function getUnifiedBMSInterface(): UnifiedBMSInterface {
  if (!defaultInstance) {
    defaultInstance = new UnifiedBMSInterface();
  }
  return defaultInstance;
}

