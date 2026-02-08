export type WeatherSeriesPoint = { timestampIso: string; tempF: number };

export type WeatherSeries = {
  points: WeatherSeriesPoint[];
  source?: string;
};

