/**
 * Ignition REST Adapter (minimal)
 *
 * Ignition deployments vary widely (Gateway WebDev endpoints, Tag Historian, custom REST).
 * This adapter provides a thin shim on top of GenericRESTAdapter and lets you specify
 * per-point `protocolData.path` / `protocolData.payload` / `protocolData.method`.
 *
 * When a concrete Ignition API contract is chosen, we can specialize discovery and
 * tag read/write semantics.
 */

import type { DiscoveryFilter, DataPointReference, RESTConfig, UnifiedDataPoint, WriteCommand } from '../../../types';
import { GenericRESTAdapter } from './generic-adapter';

export class IgnitionAdapter {
  private base = new GenericRESTAdapter();

  async readPoint(cfg: RESTConfig, ref: DataPointReference): Promise<UnifiedDataPoint> {
    return await this.base.readPoint(cfg, ref);
  }

  async writePoint(cfg: RESTConfig, cmd: WriteCommand): Promise<void> {
    await this.base.writePoint(cfg, cmd);
  }

  async discoverPoints(cfg: RESTConfig, filter?: DiscoveryFilter): Promise<UnifiedDataPoint[]> {
    // If the Ignition project exposes a tags/points endpoint, you can set:
    // - cfg.discoveryPath (custom field) or filter.objectType
    return await this.base.discoverPoints(cfg, filter);
  }
}


