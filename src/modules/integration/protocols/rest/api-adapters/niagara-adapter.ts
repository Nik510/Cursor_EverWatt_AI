/**
 * Niagara REST Adapter (minimal)
 *
 * Niagara commonly exposes data via platform-specific endpoints or proxy gateways.
 * This adapter currently behaves like the GenericRESTAdapter and supports per-point
 * configuration through `protocolData`.
 *
 * When we decide on a specific Niagara REST contract, we can add:
 * - Tag/point browsing
 * - History queries
 * - Write semantics and validation
 */

import type { DiscoveryFilter, DataPointReference, RESTConfig, UnifiedDataPoint, WriteCommand } from '../../../types';
import { GenericRESTAdapter } from './generic-adapter';

export class NiagaraAdapter {
  private base = new GenericRESTAdapter();

  async readPoint(cfg: RESTConfig, ref: DataPointReference): Promise<UnifiedDataPoint> {
    return await this.base.readPoint(cfg, ref);
  }

  async writePoint(cfg: RESTConfig, cmd: WriteCommand): Promise<void> {
    await this.base.writePoint(cfg, cmd);
  }

  async discoverPoints(cfg: RESTConfig, filter?: DiscoveryFilter): Promise<UnifiedDataPoint[]> {
    return await this.base.discoverPoints(cfg, filter);
  }
}


