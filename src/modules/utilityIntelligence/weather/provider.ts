import type { UtilityInputs } from '../types';
import type { WeatherSeries } from './types';

export interface WeatherProvider {
  /**
   * Deterministic adapter (no external web calls required for v1).
   * Implementations may read from cached files or preloaded datasets.
   */
  getWeatherSeries(args: { inputs: UtilityInputs; startIso: string; endIso: string }): Promise<WeatherSeries | null>;
}

