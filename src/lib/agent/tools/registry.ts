// Tool registry: single source of truth for the agent's available tools.
// Each tool has: name, description (for LLM prompt), param schema, executor.

import { getWeather, type WeatherResult } from './weather';
import { recommendCrops, type FarmProfile, type RecommendResult } from './recommend';
import { computeFinancials, type FinancialResult } from './financials';
import { getCropCalendar, type CropCalendarResult } from './calendar';
import { ragSearch, formatRetrievedContext, KB_STATS, type RetrievalResult } from '@/lib/kb/rag';
import { VERIFIED_FACTS } from '@/lib/kb/verified_facts';

import {
  getFertilizerSchedule,
  getIrrigationSchedule,
  assessPestDiseaseRisk,
  checkWeatherTriggers,
  simulateScenario,
} from './tier1_tools';
import { compareSuppliers, compareSuppliersForPlan, getMarketPriceIntelligence } from './tier2_tools';

export type ToolName =
  | 'get_weather'
  | 'rag_search'
  | 'get_kb_facts_by_crop'
  | 'recommend_crops'
  | 'compute_financials'
  | 'get_crop_calendar'
  | 'save_profile'
  | 'get_fertilizer_schedule'
  | 'get_irrigation_schedule'
  | 'assess_pest_disease_risk'
  | 'check_weather_triggers'
  | 'simulate_scenario'
  | 'compare_suppliers'
  | 'get_market_price_intelligence';

export interface ToolDefinition {
  name: ToolName;
  description: string;
  paramSchema: { name: string; type: 'string' | 'number' | 'boolean'; required: boolean; description: string }[];
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_weather',
    description: 'Fetch real 7-day weather forecast (temperature, rainfall, wind) for a Bangladesh location using Open-Meteo. Use this whenever the farmer mentions a location and we need to ground recommendations in actual weather. Returns lat/long, daily forecast, and a summary (total rain, avg temp, next rain event).',
    paramSchema: [
      { name: 'location', type: 'string', required: true, description: 'District or upazila name, e.g. "Jashore", "Bogura", "Mymensingh"' },
    ],
  },
  {
    name: 'rag_search',
    description: `Search the local Bangladesh agriculture knowledge base (${KB_STATS.verifiedChunks} verified facts from BARI/BWMRI/BRRI/FAO + structured crop calendars) for crop/soil/fertilizer/pest/season/irrigation information. Use this AGGRESSIVELY — call it multiple times per plan with different query angles (e.g. once for fertilizer, once for pests, once for variety recommendations). Returns ranked text chunks with source citations including URLs. Every agronomic claim in your final answer MUST trace back to a rag_search result.`,
    paramSchema: [
      { name: 'query', type: 'string', required: true, description: 'Natural-language query. Be specific: include crop name + topic. Examples: "T. Aman rice fertilizer schedule", "wheat variety BARI Gom-28 yield", "potato late blight disease management", "mustard irrigation schedule loamy soil", "maize stem borer pest scouting"' },
    ],
  },
  {
    name: 'get_kb_facts_by_crop',
    description: `Retrieve ALL verified facts for a specific crop from the knowledge base (${KB_STATS.verifiedChunks} facts total). Use this when you need comprehensive coverage of one crop — varieties, fertilizer, calendar, irrigation, pests, diseases, yield. Returns up to 50 facts with full source citations. Use rag_search for targeted topical queries; use this tool when you want exhaustive coverage of one crop.`,
    paramSchema: [
      { name: 'crop', type: 'string', required: true, description: 'Crop name as it appears in the KB. Examples: "Tomato", "T. Aman Rice", "Potato", "Maize", "Wheat", "BARI Gom-28", "Bt Brinjal", "Onion", "Mustard", "Mungbean". Use exact casing from the crop list in your system prompt.' },
      { name: 'category', type: 'string', required: false, description: 'Optional category filter. Examples: "Fertilizer", "Variety trait", "Crop calendar", "Irrigation", "Pest management", "Disease management", "Yield", "Soil". Omit to return all categories.' },
    ],
  },
  {
    name: 'recommend_crops',
    description: 'Rank at least 3 candidate crops for the current farm profile + season + retrieved weather. Returns each crop with suitability score, water need, risk level, profit estimate, and rationale citing soil/weather/KB evidence. Call AFTER get_weather and at least one rag_search.',
    paramSchema: [
      { name: 'profile', type: 'string', required: true, description: 'JSON object: {location, farmSizeDecimal, soilType, waterSource, budgetBdt, targetSeason}' },
      { name: 'weather', type: 'string', required: false, description: 'JSON of the weather result (omit if not yet fetched)' },
    ],
  },
  {
    name: 'compute_financials',
    description: 'Compute itemized per-acre cost breakdown (fertilizer, seed, labour, irrigation, land prep, pest mgmt), revenue, net profit, ROI, and break-even price/yield for a chosen crop and farm size. Math is inspectable and internally consistent.',
    paramSchema: [
      { name: 'cropId', type: 'string', required: true, description: 'Crop ID, e.g. "rice-boro", "wheat", "potato", "mustard"' },
      { name: 'farmSizeDecimal', type: 'number', required: true, description: 'Farm size in decimal (1 acre = 100 decimal)' },
      { name: 'sowingDate', type: 'string', required: false, description: 'ISO date string e.g. "2025-11-20"' },
    ],
  },
  {
    name: 'get_crop_calendar',
    description: 'Produce a dated season calendar (land preparation → harvest) for a chosen crop, anchored on the farmer\'s sowing date. Includes weather-aware advisories for fertilizer timing, irrigation, etc. Returns dated events and proactive weather alerts.',
    paramSchema: [
      { name: 'cropId', type: 'string', required: true, description: 'Crop ID, e.g. "rice-aman"' },
      { name: 'sowingDate', type: 'string', required: true, description: 'ISO date string' },
      { name: 'weatherForecast', type: 'string', required: false, description: 'JSON array of forecast days from get_weather (omit if unavailable)' },
    ],
  },
  {
    name: 'save_profile',
    description: 'Save or update farmer profile fields (location, soilType, waterSource, budgetBdt, targetSeason, farmSizeDecimal, chosenCrop, sowingDate). Use this whenever the farmer provides new profile information so it persists across turns.',
    paramSchema: [
      { name: 'updates', type: 'string', required: true, description: 'JSON object with any subset of the profile fields to update' },
    ],
  },
  {
    name: 'get_fertilizer_schedule',
    description: 'Retrieve verified growth-stage specific fertilizer application schedule, doses (Urea, TSP, MoP, Gypsum, etc.), organic alternatives, and costs for a crop and soil type from BARI/BRRI records.',
    paramSchema: [
      { name: 'crop', type: 'string', required: true, description: 'Crop name, e.g. "Potato", "Tomato", "T. Aman Rice", "Maize", "Wheat"' },
      { name: 'soilType', type: 'string', required: false, description: 'Soil type, e.g. "sandy", "loamy", "clay"' },
      { name: 'farmSizeDecimal', type: 'number', required: false, description: 'Farm size in decimal' },
    ],
  },
  {
    name: 'get_irrigation_schedule',
    description: 'Retrieve growth-stage specific irrigation requirements, intervals, ETc values, and critical water deficit warnings for a crop.',
    paramSchema: [
      { name: 'crop', type: 'string', required: true, description: 'Crop name' },
      { name: 'soilType', type: 'string', required: false, description: 'Soil type' },
      { name: 'farmSizeDecimal', type: 'number', required: false, description: 'Farm size in decimal' },
    ],
  },
  {
    name: 'assess_pest_disease_risk',
    description: 'Assess BAMIS weather-grounded pest and disease scouting risks for a crop based on growth stage and actual weather parameters. Pass temperature, humidity and rainfall from get_weather; missing inputs are reported rather than guessed.',
    paramSchema: [
      { name: 'crop', type: 'string', required: true, description: 'Crop name' },
      { name: 'growthStage', type: 'string', required: false, description: 'Growth stage, e.g. "Vegetative stage", "Flowering stage"' },
      { name: 'temperatureC', type: 'number', required: false, description: 'Current or forecast temperature in Celsius' },
      { name: 'humidityPercent', type: 'number', required: false, description: 'Current or forecast relative humidity percentage' },
      { name: 'rainfallMm', type: 'number', required: false, description: 'Actual forecast rainfall in millimetres from get_weather' },
      { name: 'farmSizeDecimal', type: 'number', required: false, description: 'Farm size in decimal, used to scale the pest/IPM planning allowance' },
    ],
  },
  {
    name: 'check_weather_triggers',
    description: 'Evaluate 7-day weather forecast against proactive trigger rules to recommend crop schedule adjustments (e.g. delay nitrogen fertilizer due to heavy rain).',
    paramSchema: [
      { name: 'crop', type: 'string', required: true, description: 'Crop name' },
      { name: 'growthStage', type: 'string', required: false, description: 'Growth stage' },
      { name: 'weatherForecast', type: 'string', required: false, description: 'JSON string of 7-day weather forecast' },
    ],
  },
  {
    name: 'simulate_scenario',
    description: 'Run a "what if" deterministic scenario simulation (e.g. budget cut %, rainfall drop %, selling price drop %, sowing delay days) and get recalculated cost, revenue, profit, ROI, and break-even math.',
    paramSchema: [
      { name: 'cropId', type: 'string', required: true, description: 'Crop ID e.g. "potato", "rice-boro", "wheat"' },
      { name: 'farmSizeDecimal', type: 'number', required: true, description: 'Farm size in decimal' },
      { name: 'scenarioType', type: 'string', required: true, description: 'Scenario type: "budget_cut_percent", "rainfall_change_percent", "selling_price_change_percent", "input_price_change_percent", or "sowing_delay_days"' },
      { name: 'changeValue', type: 'number', required: true, description: 'Numeric change value: use 30 for a 30% budget cut, -30 for a 30% rainfall/price drop, or 10 for a 10-day delay' },
      { name: 'sowingDate', type: 'string', required: false, description: 'ISO sowing date e.g. "2025-11-20"' },
    ],
  },
  {
    name: 'compare_suppliers',
    description: 'Tier 2 marketplace tool. Match a JSON list of farm input needs to the seeded mock supplier catalog, calculate packages and delivered cost, enforce stock, and rank by the published weights for price, official market-distance proxy, delivery time, rating, and stock. All commercial data is explicitly labeled MOCK.',
    paramSchema: [
      { name: 'needs', type: 'string', required: false, description: 'Optional JSON array such as [{"productName":"Urea","quantity":55,"unit":"kg"}]. Prefer cropId + farmSizeDecimal for an existing plan so quantities are derived without LLM arithmetic.' },
      { name: 'cropId', type: 'string', required: false, description: 'Existing structured crop ID, e.g. maize or potato. Supply with farmSizeDecimal to derive plan needs.' },
      { name: 'farmSizeDecimal', type: 'number', required: false, description: 'Farm size used with cropId to derive total input quantities.' },
      { name: 'farmerLocation', type: 'string', required: false, description: 'Farmer location from the persisted profile. The catalog distance remains a market-to-district-HQ proxy, not route distance.' },
      { name: 'limit', type: 'number', required: false, description: 'Maximum ranked suppliers per input, default 5.' },
    ],
  },
  {
    name: 'get_market_price_intelligence',
    description: 'Tier 2 market intelligence tool. Fetch the live official DAM headline ticker, discover an official historical monthly commodity series, and apply deterministic sell-now/store-or-wait/monitor rules. It refuses decision math when unit, market, price type, current price, or future-price assumptions are unresolved.',
    paramSchema: [
      { name: 'commodity', type: 'string', required: true, description: 'Specific DAM commodity/grade when known, e.g. "Aman-Fine", "Potato", "Tomato", "Mung". A broad crop may return clarification candidates.' },
      { name: 'priceType', type: 'string', required: false, description: 'Growers, Retail, or Wholesale. Use Growers for farm selling unless the farmer specifies otherwise.' },
      { name: 'historicalYear', type: 'number', required: false, description: 'Preferred historical year; the tool checks up to three earlier years when empty.' },
      { name: 'verifiedCurrentPricePerUnit', type: 'number', required: false, description: 'Current price only when its unit, market, and price type are confirmed.' },
      { name: 'currentUnit', type: 'string', required: false, description: 'Confirmed current-price unit, e.g. kg, maund, or quintal.' },
      { name: 'market', type: 'string', required: false, description: 'Specific current market matching the price.' },
      { name: 'expectedFuturePricePerUnit', type: 'number', required: false, description: 'Explicit non-guaranteed future-price assumption in the same unit.' },
      { name: 'immediateTransportCostPerUnit', type: 'number', required: false, description: 'Transport cost per unit if sold now.' },
      { name: 'storageCostPerUnit', type: 'number', required: false, description: 'Storage cost per unit for the waiting period.' },
      { name: 'spoilageLossPercent', type: 'number', required: false, description: 'Expected percentage value loss during storage.' },
      { name: 'financingCostPerUnit', type: 'number', required: false, description: 'Financing/opportunity cost per unit while waiting.' },
      { name: 'laterTransportCostPerUnit', type: 'number', required: false, description: 'Transport cost per unit when sold later.' },
      { name: 'storageFeasible', type: 'boolean', required: false, description: 'Whether safe storage is actually available for this crop and duration.' },
    ],
  },
];

// Execute a tool by name. Returns the raw result (will be JSON-serialized for the trace + LLM context).
export async function executeTool(name: ToolName, args: Record<string, any>): Promise<{
  result: any;
  durationMs: number;
}> {
  const start = Date.now();
  let result: any;

  try {
    switch (name) {
      case 'get_weather': {
        result = await getWeather(args.location);
        break;
      }
      case 'rag_search': {
        const results: RetrievalResult[] = ragSearch(args.query, 8);
        result = {
          query: args.query,
          numResults: results.length,
          formattedContext: formatRetrievedContext(results),
          rawChunks: results.map(r => ({
            id: r.chunk.id,
            score: Number(r.score.toFixed(3)),
            source: r.chunk.source,
            sourceUrl: r.chunk.sourceUrl,
            crop: r.chunk.cropName,
            category: r.chunk.category,
            factName: r.chunk.factName,
            value: r.chunk.value,
            unit: r.chunk.unit,
            text: r.chunk.text,
          })),
        };
        break;
      }
      case 'get_kb_facts_by_crop': {
        const cropQuery = String(args.crop || '').toLowerCase().trim();
        const categoryQuery = args.category ? String(args.category).toLowerCase().trim() : null;

        // Match crops that contain the query (case-insensitive)
        let matching = VERIFIED_FACTS.filter(f =>
          f.crop.toLowerCase().includes(cropQuery) || cropQuery.includes(f.crop.toLowerCase())
        );

        if (categoryQuery) {
          matching = matching.filter(f =>
            f.category.toLowerCase().includes(categoryQuery)
          );
        }

        // Cap at 50 facts to keep token budget reasonable
        const capped = matching.slice(0, 50);

        result = {
          crop: args.crop,
          category: args.category || null,
          totalMatches: matching.length,
          returned: capped.length,
          facts: capped.map(f => ({
            id: f.id,
            crop: f.crop,
            category: f.category,
            factName: f.factName,
            value: f.value,
            unit: f.unit,
            context: f.context,
            source: f.sourceInstitution,
            sourceTitle: f.sourceTitle,
            sourceUrl: f.sourceUrl,
          })),
        };
        break;
      }
      case 'recommend_crops': {
        const profile: FarmProfile = typeof args.profile === 'string' ? JSON.parse(args.profile) : args.profile;
        const weather = args.weather ? (typeof args.weather === 'string' ? JSON.parse(args.weather) : args.weather) as WeatherResult : null;
        result = await recommendCrops(profile, weather);
        break;
      }
      case 'compute_financials': {
        result = computeFinancials(args.cropId, Number(args.farmSizeDecimal), args.sowingDate);
        break;
      }
      case 'get_crop_calendar': {
        const cropId: string = args.cropId;
        const sowingDate: string = args.sowingDate;
        const weatherForecast = args.weatherForecast
          ? (typeof args.weatherForecast === 'string' ? JSON.parse(args.weatherForecast) : args.weatherForecast)
          : undefined;
        result = getCropCalendar(cropId, sowingDate, weatherForecast);
        break;
      }
      case 'save_profile': {
        const updates = typeof args.updates === 'string' ? JSON.parse(args.updates) : args.updates;
        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
          throw new Error('updates must be a JSON object');
        }
        const allowed = new Set(['name', 'location', 'latitude', 'longitude', 'farmSizeDecimal', 'soilType', 'waterSource', 'budgetBdt', 'targetSeason', 'chosenCrop', 'sowingDate']);
        const unknown = Object.keys(updates).filter(key => !allowed.has(key));
        if (unknown.length) throw new Error(`Unsupported profile field(s): ${unknown.join(', ')}`);
        for (const key of ['farmSizeDecimal', 'budgetBdt']) {
          if (updates[key] !== undefined && (!Number.isFinite(Number(updates[key])) || Number(updates[key]) <= 0)) {
            throw new Error(`${key} must be a positive number`);
          }
        }
        if (updates.soilType && !['sandy', 'loamy', 'clay', 'saline', 'silty'].includes(updates.soilType)) {
          throw new Error('soilType must be sandy, loamy, clay, saline, or silty');
        }
        if (updates.waterSource && !['tubewell', 'canal', 'rainfed', 'river', 'pond'].includes(updates.waterSource)) {
          throw new Error('waterSource must be tubewell, canal, rainfed, river, or pond');
        }
        if (updates.targetSeason && !['aus', 'aman', 'boro', 'rabi', 'kharif-1', 'kharif-2'].includes(updates.targetSeason)) {
          throw new Error('targetSeason is not supported');
        }
        result = { saved: true, fields: Object.keys(updates), updates };
        break;
      }
      case 'get_fertilizer_schedule': {
        result = getFertilizerSchedule(args.crop, args.soilType, Number(args.farmSizeDecimal || 100));
        break;
      }
      case 'get_irrigation_schedule': {
        result = getIrrigationSchedule(args.crop, args.soilType, Number(args.farmSizeDecimal || 100));
        break;
      }
      case 'assess_pest_disease_risk': {
        result = assessPestDiseaseRisk(
          args.crop,
          args.growthStage,
          args.temperatureC ? Number(args.temperatureC) : undefined,
          args.humidityPercent ? Number(args.humidityPercent) : undefined,
          args.rainfallMm ? Number(args.rainfallMm) : undefined,
          Number(args.farmSizeDecimal || 100),
        );
        break;
      }
      case 'check_weather_triggers': {
        const wf = args.weatherForecast ? (typeof args.weatherForecast === 'string' ? JSON.parse(args.weatherForecast) : args.weatherForecast) : null;
        result = checkWeatherTriggers(args.crop, args.growthStage, wf);
        break;
      }
      case 'simulate_scenario': {
        result = simulateScenario({
          cropId: args.cropId,
          farmSizeDecimal: Number(args.farmSizeDecimal || 100),
          scenarioType: args.scenarioType,
          changeValue: Number(args.changeValue),
          sowingDate: args.sowingDate,
        });
        break;
      }
      case 'compare_suppliers': {
        result = args.needs
          ? compareSuppliers(args.needs, args.farmerLocation, Number(args.limit || 5))
          : compareSuppliersForPlan(args.cropId, Number(args.farmSizeDecimal), args.farmerLocation, Number(args.limit || 5));
        break;
      }
      case 'get_market_price_intelligence': {
        const priceType = ['Growers', 'Retail', 'Wholesale'].includes(args.priceType) ? args.priceType : 'Growers';
        result = await getMarketPriceIntelligence({
          commodity: args.commodity,
          priceType,
          historicalYear: args.historicalYear === undefined ? undefined : Number(args.historicalYear),
          verifiedCurrentPricePerUnit: args.verifiedCurrentPricePerUnit === undefined ? undefined : Number(args.verifiedCurrentPricePerUnit),
          currentUnit: args.currentUnit,
          market: args.market,
          expectedFuturePricePerUnit: args.expectedFuturePricePerUnit === undefined ? undefined : Number(args.expectedFuturePricePerUnit),
          immediateTransportCostPerUnit: args.immediateTransportCostPerUnit === undefined ? undefined : Number(args.immediateTransportCostPerUnit),
          storageCostPerUnit: args.storageCostPerUnit === undefined ? undefined : Number(args.storageCostPerUnit),
          spoilageLossPercent: args.spoilageLossPercent === undefined ? undefined : Number(args.spoilageLossPercent),
          financingCostPerUnit: args.financingCostPerUnit === undefined ? undefined : Number(args.financingCostPerUnit),
          laterTransportCostPerUnit: args.laterTransportCostPerUnit === undefined ? undefined : Number(args.laterTransportCostPerUnit),
          storageFeasible: typeof args.storageFeasible === 'boolean' ? args.storageFeasible : undefined,
        });
        break;
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    result = { error: err.message, stack: err.stack };
  }

  const durationMs = Date.now() - start;
  return { result, durationMs };
}

// Pretty-print tool list for the system prompt
export function formatToolListForPrompt(): string {
  return TOOL_DEFINITIONS.map(t => {
    const params = t.paramSchema.map(p => `${p.name}${p.required ? '*' : ''}: ${p.type} — ${p.description}`).join('\n    ');
    return `### ${t.name}\n  ${t.description}\n  Parameters:\n    ${params}`;
  }).join('\n\n');
}
