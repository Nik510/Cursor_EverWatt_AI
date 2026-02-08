/**
 * Generic REST Adapter
 *
 * Assumes the BMS exposes REST endpoints that map 1:1 to point IDs.
 *
 * Conventions:
 * - `pointId` is appended to `baseUrl`:
 *     GET  {baseUrl}/{pointId}
 *     PUT  {baseUrl}/{pointId}  body: { value: ... }
 *
 * Supported response shapes (first match wins):
 * - { value, unit?, name? }
 * - { data: { value, unit?, name? } }
 * - any primitive -> treated as value
 */

import type { DiscoveryFilter, DataPointReference, RESTConfig, UnifiedDataPoint, WriteCommand } from '../../../types';
import { ValidationError } from '../../../types';

export class GenericRESTAdapter {
  async readPoint(cfg: RESTConfig, ref: DataPointReference): Promise<UnifiedDataPoint> {
    const url = this.pointUrl(cfg, ref.pointId, ref.protocolData?.path as string | undefined);
    const res = await fetch(url, {
      method: 'GET',
      headers: this.headers(cfg),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const json = await this.safeJson(res);

    const { value, unit, name } = this.extract(json);
    return {
      id: `${ref.connectionId}:${ref.pointId}`,
      name: (ref.protocolData?.name as string | undefined) ?? name ?? ref.pointId,
      value: (ref.protocolData?.valueTransform as any)?.(value) ?? value,
      unit: (ref.protocolData?.unit as string | undefined) ?? unit ?? '',
      timestamp: new Date(),
      quality: 'good',
      _ref: ref,
    };
  }

  async writePoint(cfg: RESTConfig, cmd: WriteCommand): Promise<void> {
    const url = this.pointUrl(cfg, cmd.point.pointId, cmd.point.protocolData?.path as string | undefined);
    const payload = (cmd.point.protocolData?.payload as any) ?? { value: cmd.value };
    const res = await fetch(url, {
      method: (cmd.point.protocolData?.method as string | undefined) ?? 'PUT',
      headers: {
        ...this.headers(cfg),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  async discoverPoints(cfg: RESTConfig, filter?: DiscoveryFilter): Promise<UnifiedDataPoint[]> {
    const discoveryPath = (filter?.objectType as string | undefined) ?? (cfg as any).discoveryPath ?? 'points';
    const url = this.pointUrl(cfg, discoveryPath);
    const res = await fetch(url, { method: 'GET', headers: this.headers(cfg) });
    if (!res.ok) return [];
    const json = await this.safeJson(res);
    const items = Array.isArray(json) ? json : Array.isArray(json?.points) ? json.points : [];

    const limit = filter?.limit ?? 200;
    return items.slice(0, limit).map((p: any, idx: number) => {
      const pointId = String(p?.id ?? p?.pointId ?? p?.path ?? `point-${idx}`);
      const name = String(p?.name ?? pointId);
      const unit = String(p?.unit ?? '');
      return {
        id: `rest:discovered:${pointId}`,
        name,
        value: '',
        unit,
        timestamp: new Date(),
        quality: 'good',
        _ref: {
          protocol: 'rest',
          connectionId: 'rest',
          pointId,
          protocolData: p,
        },
      } as UnifiedDataPoint;
    });
  }

  private pointUrl(cfg: RESTConfig, pointId: string, overridePath?: string): string {
    const base = cfg.baseUrl.replace(/\/+$/, '');
    const path = (overridePath ?? pointId).replace(/^\/+/, '');
    if (!base) throw new ValidationError('REST baseUrl is required');
    return `${base}/${path}`;
  }

  private headers(cfg: RESTConfig): Record<string, string> {
    const headers: Record<string, string> = {};
    if (cfg.apiKey) headers['x-api-key'] = cfg.apiKey;
    if (cfg.auth?.type === 'bearer' && cfg.auth.credentials?.token) {
      headers['Authorization'] = `Bearer ${cfg.auth.credentials.token}`;
    }
    if (cfg.auth?.type === 'basic' && cfg.auth.credentials?.username && cfg.auth.credentials?.password) {
      const b64 = Buffer.from(`${cfg.auth.credentials.username}:${cfg.auth.credentials.password}`).toString('base64');
      headers['Authorization'] = `Basic ${b64}`;
    }
    return headers;
  }

  private async safeJson(res: Response): Promise<any> {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return await res.json();
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private extract(json: any): { value: any; unit?: string; name?: string } {
    if (json && typeof json === 'object') {
      if ('value' in json) return { value: (json as any).value, unit: (json as any).unit, name: (json as any).name };
      if (json.data && typeof json.data === 'object' && 'value' in json.data) {
        return { value: json.data.value, unit: json.data.unit, name: json.data.name };
      }
    }
    return { value: json };
  }
}


