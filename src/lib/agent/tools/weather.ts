// Tool 1: get_weather — calls Open-Meteo geocoding + forecast APIs (Tier 0 #2)
// Open-Meteo is free, requires no API key, covers Bangladesh.

export interface WeatherResult {
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
  forecast: {
    date: string;
    tempMaxC: number;
    tempMinC: number;
    precipitationMm: number;
    precipitationProbability: number;
    windMaxKmh: number;
    humidityMeanPercent: number | null;
    et0Mm: number | null;
  }[];
  summary: {
    totalRain7dMm: number;
    avgTempC: number;
    avgHumidityPercent: number | null;
    totalEt0Mm: number | null;
    rainyDays: number;
    nextRainEvent: { date: string; mm: number } | null;
  };
}

// Bangladesh district name aliases — Open-Meteo uses GeoNames which often
// uses older English spellings. Map common transliterations to the form
// GeoNames recognizes.
const BD_LOCATION_ALIASES: Record<string, string> = {
  'bogura': 'Bogra',
  'jashore': 'Jessore',
  'chattogram': 'Chittagong',
  'cumilla': 'Comilla',
  'barishal': 'Barisal',
  'kustia': 'Kushtia',
  'jhenaida': 'Jhenaidah',
  'coxsbazar': "Cox's Bazar",
  'chapainawabganj': 'Nawabganj',
  'moulvibazar': 'Maulvibazar',
};

function normalizeLocation(input: string): string {
  let result = input;
  for (const [alias, canonical] of Object.entries(BD_LOCATION_ALIASES)) {
    const re = new RegExp(`\\b${alias}\\b`, 'gi');
    result = result.replace(re, canonical);
  }
  return result;
}

export async function getWeather(location: string): Promise<WeatherResult> {
  // Normalize Bangladesh district transliterations (e.g. "Bogura" → "Bogra")
  const normalized = normalizeLocation(location);

  // Step 1: geocode the location name → lat/long
  // Always filter to Bangladesh (country=BD) first — this avoids "Bogura" matching
  // a Russian town "Bogurayev" instead of Bogra district in Bangladesh.
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(normalized)}&count=1&language=en&format=json&country=BD`;
  const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) {
    throw new Error(`Geocoding failed: ${geoRes.status} ${geoRes.statusText}`);
  }
  const geoData = await geoRes.json();
  if (!geoData.results || geoData.results.length === 0) {
    // Fallback: try without country filter (for non-Bangladesh queries)
    const geoUrl2 = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(normalized + ' Bangladesh')}&count=1&language=en&format=json`;
    const geoRes2 = await fetch(geoUrl2);
    if (!geoRes2.ok) throw new Error(`Fallback geocoding failed: ${geoRes2.status} ${geoRes2.statusText}`);
    const geoData2 = await geoRes2.json();
    if (!geoData2.results || geoData2.results.length === 0) {
      throw new Error(`Could not geocode location: ${location} (no Bangladesh match found)`);
    }
    return fetchForecast(location, geoData2.results[0]);
  }
  return fetchForecast(location, geoData.results[0]);
}

async function fetchForecast(location: string, geoResult: any): Promise<WeatherResult> {
  const { latitude, longitude, name, admin1, country } = geoResult;
  const prettyLocation = [name, admin1, country].filter(Boolean).join(', ');

  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration&hourly=relative_humidity_2m&timezone=Asia%2FDhaka&forecast_days=7`;
  const fcRes = await fetch(forecastUrl);
  if (!fcRes.ok) {
    throw new Error(`Forecast fetch failed: ${fcRes.status}`);
  }
  const fc = await fcRes.json();
  const d = fc.daily;

  if (!d?.time || !Array.isArray(d.time)) {
    throw new Error('Forecast response did not contain daily weather data');
  }

  // Open-Meteo exposes humidity hourly. Aggregate it by local calendar date so
  // pest/disease rules use real forecast humidity rather than a guessed value.
  const humidityByDate = new Map<string, number[]>();
  const hourlyTimes: string[] = fc.hourly?.time || [];
  const hourlyHumidity: Array<number | null> = fc.hourly?.relative_humidity_2m || [];
  hourlyTimes.forEach((time, i) => {
    const value = hourlyHumidity[i];
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    const date = time.slice(0, 10);
    const values = humidityByDate.get(date) || [];
    values.push(value);
    humidityByDate.set(date, values);
  });

  const forecast = d.time.map((date: string, i: number) => {
    const humidityValues = humidityByDate.get(date) || [];
    const humidityMeanPercent = humidityValues.length
      ? humidityValues.reduce((sum, value) => sum + value, 0) / humidityValues.length
      : null;
    const et0 = d.et0_fao_evapotranspiration?.[i];
    return {
      date,
      tempMaxC: Number(d.temperature_2m_max[i]),
      tempMinC: Number(d.temperature_2m_min[i]),
      precipitationMm: Number(d.precipitation_sum[i] || 0),
      precipitationProbability: Number(d.precipitation_probability_max[i] || 0),
      windMaxKmh: Number(d.wind_speed_10m_max[i] || 0),
      humidityMeanPercent: humidityMeanPercent === null ? null : Number(humidityMeanPercent.toFixed(1)),
      et0Mm: typeof et0 === 'number' ? et0 : null,
    };
  });
  if (forecast.length === 0) throw new Error('Forecast response contained no forecast days');

  const totalRain7dMm = forecast.reduce((s: number, f: any) => s + (f.precipitationMm || 0), 0);
  const avgTempC = forecast.reduce((s: number, f: any) => s + (f.tempMaxC + f.tempMinC) / 2, 0) / forecast.length;
  const humidityDays = forecast.filter(f => f.humidityMeanPercent !== null);
  const avgHumidityPercent = humidityDays.length
    ? humidityDays.reduce((sum, f) => sum + (f.humidityMeanPercent || 0), 0) / humidityDays.length
    : null;
  const et0Days = forecast.filter(f => f.et0Mm !== null);
  const totalEt0Mm = et0Days.length
    ? et0Days.reduce((sum, f) => sum + (f.et0Mm || 0), 0)
    : null;
  const rainyDays = forecast.filter((f: any) => f.precipitationMm >= 1).length;
  const firstRain = forecast.find((f: any) => f.precipitationMm >= 5);
  const nextRainEvent = firstRain ? { date: firstRain.date, mm: firstRain.precipitationMm } : null;

  return {
    location: prettyLocation,
    latitude,
    longitude,
    timezone: fc.timezone,
    forecast,
    summary: {
      totalRain7dMm: Number(totalRain7dMm.toFixed(1)),
      avgTempC: Number(avgTempC.toFixed(1)),
      avgHumidityPercent: avgHumidityPercent === null ? null : Number(avgHumidityPercent.toFixed(1)),
      totalEt0Mm: totalEt0Mm === null ? null : Number(totalEt0Mm.toFixed(1)),
      rainyDays,
      nextRainEvent,
    },
  };
}
