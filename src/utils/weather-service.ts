/**
 * Weather Data Service
 * Fetches historical weather data from Open-Meteo API (free, no API key required)
 * and provides utilities to merge weather data with interval load data
 */

export interface WeatherDataPoint {
  timestamp: Date;
  temperatureF: number;
  humidity?: number;
  dewPointF?: number;
}

export interface DailyWeatherData {
  date: Date;
  avgTemperatureF: number;
  maxTemperatureF: number;
  minTemperatureF: number;
  heatingDegreeDays: number;
  coolingDegreeDays: number;
}

export interface WeatherFetchResult {
  success: boolean;
  data: WeatherDataPoint[];
  dailyData: DailyWeatherData[];
  source: 'api' | 'upload' | 'default';
  error?: string;
}

export interface LoadIntervalWithWeather {
  timestamp: Date;
  kw: number;
  temperatureF: number;
  hdd?: number;
  cdd?: number;
}

// Default base temperature for degree day calculations
const BASE_TEMP_F = 65;

/**
 * Fetch weather data from Open-Meteo API
 * Open-Meteo provides free weather data without API key
 */
export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  startDate: Date,
  endDate: Date
): Promise<WeatherFetchResult> {
  try {
    // Format dates for API
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    // Open-Meteo Archive API for historical data
    const url = `https://archive-api.open-meteo.com/v1/archive?` +
      `latitude=${latitude}&longitude=${longitude}` +
      `&start_date=${start}&end_date=${end}` +
      `&hourly=temperature_2m,relative_humidity_2m,dew_point_2m` +
      `&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min` +
      `&temperature_unit=fahrenheit` +
      `&timezone=America/Los_Angeles`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API returned status ${response.status}`);
    }

    const result = await response.json();

    // Parse hourly data
    const hourlyData: WeatherDataPoint[] = [];
    if (result.hourly && result.hourly.time) {
      for (let i = 0; i < result.hourly.time.length; i++) {
        hourlyData.push({
          timestamp: new Date(result.hourly.time[i]),
          temperatureF: result.hourly.temperature_2m[i],
          humidity: result.hourly.relative_humidity_2m?.[i],
          dewPointF: result.hourly.dew_point_2m?.[i],
        });
      }
    }

    // Parse daily data and calculate degree days
    const dailyData: DailyWeatherData[] = [];
    if (result.daily && result.daily.time) {
      for (let i = 0; i < result.daily.time.length; i++) {
        const avgTemp = result.daily.temperature_2m_mean[i];
        dailyData.push({
          date: new Date(result.daily.time[i]),
          avgTemperatureF: avgTemp,
          maxTemperatureF: result.daily.temperature_2m_max[i],
          minTemperatureF: result.daily.temperature_2m_min[i],
          heatingDegreeDays: Math.max(0, BASE_TEMP_F - avgTemp),
          coolingDegreeDays: Math.max(0, avgTemp - BASE_TEMP_F),
        });
      }
    }

    return {
      success: true,
      data: hourlyData,
      dailyData,
      source: 'api',
    };
  } catch (error) {
    console.error('Weather API fetch failed:', error);
    return {
      success: false,
      data: [],
      dailyData: [],
      source: 'api',
      error: error instanceof Error ? error.message : 'Unknown error fetching weather data',
    };
  }
}

/**
 * Parse weather data from user-uploaded CSV file
 * Expected columns: date/timestamp, temperature (F)
 */
export function parseWeatherUpload(csvContent: string): WeatherFetchResult {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const header = lines[0].toLowerCase().split(',');
    
    // Find column indices
    const dateIdx = header.findIndex(h => 
      h.includes('date') || h.includes('time') || h.includes('timestamp')
    );
    const tempIdx = header.findIndex(h => 
      h.includes('temp') || h.includes('temperature')
    );
    const humidityIdx = header.findIndex(h => 
      h.includes('humid') || h.includes('rh')
    );

    if (dateIdx === -1 || tempIdx === -1) {
      throw new Error('CSV must have date/timestamp and temperature columns');
    }

    const data: WeatherDataPoint[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length <= Math.max(dateIdx, tempIdx)) continue;

      const timestamp = new Date(values[dateIdx].trim());
      const temperatureF = parseFloat(values[tempIdx].trim());
      
      if (isNaN(timestamp.getTime()) || isNaN(temperatureF)) continue;

      data.push({
        timestamp,
        temperatureF,
        humidity: humidityIdx >= 0 ? parseFloat(values[humidityIdx]) : undefined,
      });
    }

    if (data.length === 0) {
      throw new Error('No valid weather data rows found in CSV');
    }

    // Aggregate to daily data
    const dailyData = aggregateToDailyWeather(data);

    return {
      success: true,
      data,
      dailyData,
      source: 'upload',
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      dailyData: [],
      source: 'upload',
      error: error instanceof Error ? error.message : 'Failed to parse weather CSV',
    };
  }
}

/**
 * Aggregate hourly/sub-hourly weather data to daily summaries
 */
function aggregateToDailyWeather(data: WeatherDataPoint[]): DailyWeatherData[] {
  const dailyMap = new Map<string, WeatherDataPoint[]>();

  // Group by date
  for (const point of data) {
    const dateKey = point.timestamp.toISOString().split('T')[0];
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, []);
    }
    dailyMap.get(dateKey)!.push(point);
  }

  // Calculate daily statistics
  const dailyData: DailyWeatherData[] = [];
  
  for (const [dateKey, points] of dailyMap) {
    const temps = points.map(p => p.temperatureF);
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const maxTemp = Math.max(...temps);
    const minTemp = Math.min(...temps);

    dailyData.push({
      date: new Date(dateKey),
      avgTemperatureF: avgTemp,
      maxTemperatureF: maxTemp,
      minTemperatureF: minTemp,
      heatingDegreeDays: Math.max(0, BASE_TEMP_F - avgTemp),
      coolingDegreeDays: Math.max(0, avgTemp - BASE_TEMP_F),
    });
  }

  return dailyData.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Generate default weather data when no weather source available
 * Uses 65°F baseline (no heating or cooling degree days)
 */
export function generateDefaultWeatherData(
  startDate: Date,
  endDate: Date
): WeatherFetchResult {
  const data: WeatherDataPoint[] = [];
  const dailyData: DailyWeatherData[] = [];

  const current = new Date(startDate);
  while (current <= endDate) {
    // Add hourly points at 65°F
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(current);
      timestamp.setHours(hour, 0, 0, 0);
      data.push({
        timestamp,
        temperatureF: BASE_TEMP_F,
      });
    }

    // Add daily summary
    dailyData.push({
      date: new Date(current),
      avgTemperatureF: BASE_TEMP_F,
      maxTemperatureF: BASE_TEMP_F,
      minTemperatureF: BASE_TEMP_F,
      heatingDegreeDays: 0,
      coolingDegreeDays: 0,
    });

    current.setDate(current.getDate() + 1);
  }

  return {
    success: true,
    data,
    dailyData,
    source: 'default',
  };
}

/**
 * Merge weather data with load interval data by matching timestamps
 */
export function mergeWeatherWithIntervals(
  intervals: Array<{ timestamp: Date; kw: number }>,
  weatherData: WeatherDataPoint[],
  dailyWeather: DailyWeatherData[]
): LoadIntervalWithWeather[] {
  // Build lookup maps for efficient matching
  const hourlyWeatherMap = new Map<string, WeatherDataPoint>();
  for (const point of weatherData) {
    // Key by hour (ignore minutes)
    const key = `${point.timestamp.toISOString().slice(0, 13)}`;
    hourlyWeatherMap.set(key, point);
  }

  const dailyWeatherMap = new Map<string, DailyWeatherData>();
  for (const day of dailyWeather) {
    const key = day.date.toISOString().split('T')[0];
    dailyWeatherMap.set(key, day);
  }

  // Merge data
  const result: LoadIntervalWithWeather[] = [];

  for (const interval of intervals) {
    const hourKey = `${interval.timestamp.toISOString().slice(0, 13)}`;
    const dayKey = interval.timestamp.toISOString().split('T')[0];

    const hourlyWeather = hourlyWeatherMap.get(hourKey);
    const dailyWeatherPoint = dailyWeatherMap.get(dayKey);

    result.push({
      timestamp: interval.timestamp,
      kw: interval.kw,
      temperatureF: hourlyWeather?.temperatureF ?? dailyWeatherPoint?.avgTemperatureF ?? BASE_TEMP_F,
      hdd: dailyWeatherPoint?.heatingDegreeDays,
      cdd: dailyWeatherPoint?.coolingDegreeDays,
    });
  }

  return result;
}

/**
 * Calculate weather correlation statistics
 */
export interface WeatherCorrelation {
  rSquared: number;
  slope: number;
  intercept: number;
  baseload: number;
  coolingSlope: number;
  heatingSlope: number;
  weatherSensitivity: 'high' | 'medium' | 'low';
}

export function calculateWeatherCorrelation(
  data: LoadIntervalWithWeather[]
): WeatherCorrelation {
  if (data.length < 10) {
    return {
      rSquared: 0,
      slope: 0,
      intercept: 0,
      baseload: 0,
      coolingSlope: 0,
      heatingSlope: 0,
      weatherSensitivity: 'low',
    };
  }

  // Aggregate to daily for cleaner correlation
  const dailyMap = new Map<string, { totalKw: number; count: number; temp: number; hdd: number; cdd: number }>();
  
  for (const point of data) {
    const key = point.timestamp.toISOString().split('T')[0];
    if (!dailyMap.has(key)) {
      dailyMap.set(key, { totalKw: 0, count: 0, temp: 0, hdd: 0, cdd: 0 });
    }
    const day = dailyMap.get(key)!;
    day.totalKw += point.kw;
    day.count++;
    day.temp = point.temperatureF; // Use last temp as daily avg approximation
    day.hdd = point.hdd ?? 0;
    day.cdd = point.cdd ?? 0;
  }

  const dailyPoints = Array.from(dailyMap.values()).map(d => ({
    avgKw: d.totalKw / d.count,
    temp: d.temp,
    hdd: d.hdd,
    cdd: d.cdd,
  }));

  // Simple linear regression of kW vs temperature
  const n = dailyPoints.length;
  const temps = dailyPoints.map(d => d.temp);
  const loads = dailyPoints.map(d => d.avgKw);

  const meanTemp = temps.reduce((a, b) => a + b, 0) / n;
  const meanLoad = loads.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (temps[i] - meanTemp) * (loads[i] - meanLoad);
    denominator += (temps[i] - meanTemp) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanLoad - slope * meanTemp;

  // Calculate R-squared
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * temps[i] + intercept;
    ssRes += (loads[i] - predicted) ** 2;
    ssTot += (loads[i] - meanLoad) ** 2;
  }
  const rSquared = ssTot !== 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  // Estimate cooling and heating slopes from degree days
  const hddPoints = dailyPoints.filter(d => d.hdd > 0);
  const cddPoints = dailyPoints.filter(d => d.cdd > 0);

  let heatingSlope = 0;
  if (hddPoints.length > 5) {
    const hddLoads = hddPoints.map(d => d.avgKw);
    const hdds = hddPoints.map(d => d.hdd);
    const meanHdd = hdds.reduce((a, b) => a + b, 0) / hddPoints.length;
    const meanHddLoad = hddLoads.reduce((a, b) => a + b, 0) / hddPoints.length;
    let num = 0, den = 0;
    for (let i = 0; i < hddPoints.length; i++) {
      num += (hdds[i] - meanHdd) * (hddLoads[i] - meanHddLoad);
      den += (hdds[i] - meanHdd) ** 2;
    }
    heatingSlope = den !== 0 ? num / den : 0;
  }

  let coolingSlope = 0;
  if (cddPoints.length > 5) {
    const cddLoads = cddPoints.map(d => d.avgKw);
    const cdds = cddPoints.map(d => d.cdd);
    const meanCdd = cdds.reduce((a, b) => a + b, 0) / cddPoints.length;
    const meanCddLoad = cddLoads.reduce((a, b) => a + b, 0) / cddPoints.length;
    let num = 0, den = 0;
    for (let i = 0; i < cddPoints.length; i++) {
      num += (cdds[i] - meanCdd) * (cddLoads[i] - meanCddLoad);
      den += (cdds[i] - meanCdd) ** 2;
    }
    coolingSlope = den !== 0 ? num / den : 0;
  }

  // Estimate baseload (load at 65°F)
  const baseload = slope * BASE_TEMP_F + intercept;

  // Determine sensitivity level
  let weatherSensitivity: 'high' | 'medium' | 'low';
  if (rSquared > 0.7) {
    weatherSensitivity = 'high';
  } else if (rSquared > 0.4) {
    weatherSensitivity = 'medium';
  } else {
    weatherSensitivity = 'low';
  }

  return {
    rSquared,
    slope,
    intercept,
    baseload: Math.max(0, baseload),
    coolingSlope: Math.max(0, coolingSlope),
    heatingSlope: Math.max(0, heatingSlope),
    weatherSensitivity,
  };
}

/**
 * Get coordinates from address using free geocoding
 * Falls back to California center if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  // Default to California center
  const defaultCoords = { lat: 36.7783, lng: -119.4179 };

  if (!address || address.trim().length === 0) {
    return defaultCoords;
  }

  try {
    // Use Nominatim (OpenStreetMap) geocoding - free, no API key
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EverWatt Engine/1.0',
      },
    });

    if (!response.ok) {
      console.warn('Geocoding API returned non-OK status');
      return defaultCoords;
    }

    const results = await response.json();
    
    if (results && results.length > 0) {
      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
      };
    }

    return defaultCoords;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return defaultCoords;
  }
}


