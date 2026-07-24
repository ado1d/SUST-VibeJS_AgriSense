// Tool 4: get_crop_calendar — dated schedule from land preparation to harvest
// Tier 0 #4. Produces a real dated calendar anchored on the farmer's sowing date.

import { CROPS } from '@/lib/kb/crops';

export interface CalendarEvent {
  day: number;          // relative day from sowing
  date: string;         // ISO date
  stage: string;
  action: string;
  advisory?: string;    // weather-aware advisory text
}

export interface CropCalendarResult {
  cropId: string;
  cropName: string;
  sowingDate: string;
  harvestDate: string;
  totalDays: number;
  events: CalendarEvent[];
  weatherAdvisories: string[];
}

function addDays(isoDate: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error('sowingDate must use YYYY-MM-DD format');
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error('sowingDate must be a valid date');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getCropCalendar(cropId: string, sowingDate: string, weatherForecast?: { date: string; precipitationMm: number }[]): CropCalendarResult {
  const crop = CROPS.find(c => c.id === cropId);
  if (!crop) throw new Error(`Unknown crop id: ${cropId}`);

  const weatherAdvisories: string[] = [];
  const events: CalendarEvent[] = [];

  for (const stage of crop.growthStages) {
    for (const action of stage.keyActions) {
      const day = stage.dayRange[0];
      const date = addDays(sowingDate, day);

      // Weather-aware advisory: check if any forecast day overlaps this stage window
      let advisory: string | undefined;
      if (weatherForecast && weatherForecast.length > 0) {
        const stageStart = addDays(sowingDate, stage.dayRange[0]);
        const stageEnd = addDays(sowingDate, stage.dayRange[1]);
        const overlappingRains = weatherForecast.filter(f => f.date >= stageStart && f.date <= stageEnd && f.precipitationMm >= 5);
        if (overlappingRains.length > 0) {
          const totalRain = overlappingRains.reduce((s, r) => s + r.precipitationMm, 0);
          if (action.toLowerCase().includes('urea') || action.toLowerCase().includes('top dress')) {
            advisory = `⚠ ${overlappingRains.length} rainy day(s) during this stage (total ${totalRain.toFixed(0)} mm). DELAY urea top dress by 2-3 days after rain to avoid runoff loss.`;
            weatherAdvisories.push(`${stage.name} (${date}): Heavy rain forecast during urea application window — delay by 2-3 days.`);
          } else if (crop.rainfallTolerance === 'low' && totalRain > 30) {
            advisory = `⚠ ${totalRain.toFixed(0)} mm rain during ${stage.name}. ${crop.name} has low rainfall tolerance — ensure drainage to avoid waterlogging/disease.`;
          } else if (action.toLowerCase().includes('irrigation')) {
            advisory = `Rain forecast in this window (${totalRain.toFixed(0)} mm) — skip or reduce irrigation.`;
          }
        }
      }

      events.push({ day, date, stage: stage.name, action, advisory });
    }
  }

  const harvestDate = addDays(sowingDate, crop.durationDays);

  return {
    cropId,
    cropName: crop.name,
    sowingDate,
    harvestDate,
    totalDays: crop.durationDays,
    events,
    weatherAdvisories,
  };
}
