// Tool 2: recommend_crops — ranks 3+ candidate crops for the farm profile + season + weather
// Tier 0 #3. Each recommendation cites the retrieved KB data + weather it used.

import { CROPS, SOILS, INPUT_COSTS, type CropRecord, type Season } from '@/lib/kb/crops';
import { getCropsForSeason, ragSearch } from '@/lib/kb/rag';
import type { WeatherResult } from './weather';

export interface FarmProfile {
  location?: string;
  farmSizeDecimal?: number;
  soilType?: string;
  waterSource?: string;
  budgetBdt?: number;
  targetSeason?: string;
}

export interface CropRecommendation {
  rank: number;
  cropId: string;
  cropName: string;
  bnName: string;
  suitabilityScore: number;        // 0-100
  waterNeed: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  estimatedYieldMaund: number;     // per acre
  estimatedRevenueBdt: number;     // per acre
  estimatedCostBdt: number;        // per acre
  estimatedProfitBdt: number;      // per acre
  roiPercent: number;              // profit/cost * 100
  rationale: string[];             // bullet reasons — each citing inputs/data
  kbEvidence: string[];            // source citations
}

export interface RecommendResult {
  profile: FarmProfile;
  weather: WeatherResult | null;
  recommendations: CropRecommendation[];
  notes: string;
}

function waterNeedLabel(mm: number): 'low' | 'medium' | 'high' {
  if (mm < 300) return 'low';
  if (mm < 700) return 'medium';
  return 'high';
}

function computePerAcreCost(crop: CropRecord): number {
  const f = crop.fertilizerKgPerAcre;
  const c = INPUT_COSTS;
  let cost = 0;
  cost += (f.npk15_15_15 || 0) * c.npk15PerKg;
  cost += (f.urea || 0) * c.ureaPerKg;
  cost += (f.tsp || 0) * c.tspPerKg;
  cost += (f.mop || 0) * c.mopPerKg;
  cost += (f.gypsum || 0) * c.gypsumPerKg;
  cost += (f.zinc || 0) * c.zincPerKg;
  cost += (f.boron || 0) * c.boronPerKg;

  // Seed cost — varies by crop
  const seedKgPerAcre: Record<string, number> = {
    'rice-boro': 25, 'rice-aman': 22, 'rice-aus': 30,
    'wheat': 50, 'maize': 25, 'potato': 700, 'mustard': 6,
    'lentil': 25, 'jute': 7, 'tomato': 0.3, 'brinjal': 0.3, 'chili': 0.5,
  };
  const seedUnit: Record<string, number> = {
    'rice-boro': c.seedRicePerKg, 'rice-aman': c.seedRicePerKg, 'rice-aus': c.seedRicePerKg,
    'wheat': c.seedWheatPerKg, 'maize': c.seedMaizePerKg, 'potato': c.seedPotatoPerKg,
    'mustard': c.seedMustardPerKg, 'lentil': c.seedLentilPerKg, 'jute': c.seedJutePerKg,
    'tomato': c.seedTomatoPer10g * 100, 'brinjal': c.seedBrinjalPer10g * 100,
    'chili': c.seedChiliPer10g * 100,
  };
  cost += (seedKgPerAcre[crop.id] || 0) * (seedUnit[crop.id] || 0);

  // Labour — rough person-days per acre per crop
  const labourDays: Record<string, number> = {
    'rice-boro': 35, 'rice-aman': 30, 'rice-aus': 18,
    'wheat': 18, 'maize': 22, 'potato': 50, 'mustard': 14,
    'lentil': 12, 'jute': 45, 'tomato': 70, 'brinjal': 75, 'chili': 80,
  };
  cost += (labourDays[crop.id] || 20) * c.labourPerDay;

  // Irrigation events
  const irrigEvents: Record<string, number> = {
    'rice-boro': 18, 'rice-aman': 4, 'rice-aus': 2,
    'wheat': 3, 'maize': 4, 'potato': 5, 'mustard': 2,
    'lentil': 1, 'jute': 2, 'tomato': 12, 'brinjal': 14, 'chili': 10,
  };
  cost += (irrigEvents[crop.id] || 3) * c.irrigationPerApplication;

  // Land preparation diesel
  cost += 18 * c.dieselPerLitre; // ~18 L/acre for ploughing

  // Pesticide/pest management flat estimate
  const pestCost: Record<string, number> = {
    'rice-boro': 1500, 'rice-aman': 1000, 'rice-aus': 600,
    'wheat': 800, 'maize': 1200, 'potato': 3000, 'mustard': 600,
    'lentil': 800, 'jute': 1000, 'tomato': 4500, 'brinjal': 5000, 'chili': 5500,
  };
  cost += pestCost[crop.id] || 1000;

  return Math.round(cost);
}

function computePerAcreRevenue(crop: CropRecord): { revenueBdt: number; yieldMaund: number } {
  // Use midpoint yield and midpoint price (conservative)
  const yieldMaund = (crop.typicalYieldPerAcre.min + crop.typicalYieldPerAcre.max) / 2;
  const priceMid = (crop.typicalPricePerUnit.min + crop.typicalPricePerUnit.max) / 2;
  const revenueBdt = Math.round(yieldMaund * priceMid);
  return { revenueBdt, yieldMaund };
}

export async function recommendCrops(profile: FarmProfile, weather: WeatherResult | null): Promise<RecommendResult> {
  if (!Number.isFinite(profile.farmSizeDecimal) || (profile.farmSizeDecimal as number) <= 0) {
    throw new Error('farmSizeDecimal must be a positive number before recommending crops');
  }
  const season = (profile.targetSeason || 'rabi') as Season;
  let candidates = getCropsForSeason(season);

  // Fallback: if no candidates (shouldn't happen), use all crops
  if (candidates.length === 0) candidates = CROPS.slice();

  // Score each candidate
  const scored = candidates.map(crop => {
    let score = 50; // baseline
    const rationale: string[] = [];
    const kbEvidence: string[] = [];

    // 1. Soil suitability (+20 if soil is in suitable list, -20 if not)
    if (profile.soilType) {
      const soilRecord = SOILS.find(s => s.type === profile.soilType);
      if (crop.suitableSoils.includes(profile.soilType)) {
        score += 20;
        rationale.push(`Your soil is ${profile.soilType}, which ${crop.name} tolerates well.`);
        if (soilRecord) {
          kbEvidence.push(`${profile.soilType.charAt(0).toUpperCase() + profile.soilType.slice(1)} soil fertility=${soilRecord.fertility}, water retention=${soilRecord.waterRetention} (BARC Soil Guide).`);
        }
      } else {
        score -= 25;
        rationale.push(`Your ${profile.soilType} soil is suboptimal for ${crop.name} (prefers ${crop.suitableSoils.join('/')}).`);
      }
    }

    // 2. Water availability match (+15 / -15)
    if (profile.waterSource && weather) {
      const prefSources = crop.waterSourcePreference;
      if (prefSources.includes(profile.waterSource)) {
        score += 15;
        rationale.push(`Your water source (${profile.waterSource}) is one of ${crop.name}'s preferred sources.`);
      } else if (profile.waterSource === 'rainfed' && crop.waterNeedMm > 700) {
        score -= 20;
        rationale.push(`${crop.name} needs ${crop.waterNeedMm} mm/season — too much for rainfed-only supply in your area.`);
      }

      // Weather check: heavy rain forecast for a low-rainfall-tolerance crop = bad
      const totalRain7d = weather.summary.totalRain7dMm;
      if (crop.rainfallTolerance === 'low' && totalRain7d > 50) {
        score -= 10;
        rationale.push(`Weather: ${totalRain7d.toFixed(0)} mm rain forecast in next 7 days. ${crop.name} has low rainfall tolerance — risk of disease/waterlogging.`);
      } else if (crop.rainfallTolerance === 'high' && totalRain7d > 30) {
        score += 5;
        rationale.push(`Weather: ${totalRain7d.toFixed(0)} mm rain forecast — favorable for ${crop.name} (high rainfall tolerance).`);
      }
    }

    // 3. Budget fit
    const farmSize = profile.farmSizeDecimal || 50;
    const perAcreCost = computePerAcreCost(crop);
    const totalCost = perAcreCost * (farmSize / 100);
    if (profile.budgetBdt) {
      if (totalCost > profile.budgetBdt * 1.1) {
        score -= 20;
        rationale.push(`Estimated total cost ৳${totalCost.toLocaleString()} exceeds your budget ৳${profile.budgetBdt.toLocaleString()}.`);
      } else if (totalCost < profile.budgetBdt * 0.7) {
        score += 5;
        rationale.push(`Estimated total cost ৳${totalCost.toLocaleString()} fits comfortably within your budget.`);
      } else {
        score += 10;
        rationale.push(`Estimated total cost ৳${totalCost.toLocaleString()} fits within your budget.`);
      }
    }

    // 4. Profitability bonus
    const { revenueBdt, yieldMaund } = computePerAcreRevenue(crop);
    const profit = revenueBdt - perAcreCost;
    const roi = (profit / perAcreCost) * 100;
    if (roi > 80) score += 15;
    else if (roi > 40) score += 8;
    else if (roi < 0) score -= 15;
    rationale.push(`Expected ROI ${roi.toFixed(0)}% (revenue ৳${revenueBdt.toLocaleString()}/acre − cost ৳${perAcreCost.toLocaleString()}/acre).`);
    kbEvidence.push(`${crop.name} typical yield ${crop.typicalYieldPerAcre.min}-${crop.typicalYieldPerAcre.max} ${crop.typicalYieldPerAcre.unit}/acre; price ৳${crop.typicalPricePerUnit.min}-${crop.typicalPricePerUnit.max}/${crop.typicalPricePerUnit.unit}. Source: ${crop.source}.`);

    // 5. Risk adjustment
    if (crop.riskLevel === 'low') score += 5;
    else if (crop.riskLevel === 'high') score -= 10;

    // 6. RAG-grounded evidence: pull MULTIPLE relevant KB chunks for evidence
    // Query for variety + soil + crop-specific facts
    const ragQuery = `${crop.name} ${profile.soilType || ''} ${season} season cultivation variety fertilizer`;
    const ragResults = ragSearch(ragQuery, 3);
    for (const r of ragResults) {
      const sourceUrl = r.chunk.sourceUrl ? ` (${r.chunk.sourceUrl})` : '';
      kbEvidence.push(`[${r.chunk.id}] ${r.chunk.text}${sourceUrl}`);
    }

    score = Math.max(0, Math.min(100, score));

    const rec: CropRecommendation = {
      rank: 0,
      cropId: crop.id,
      cropName: crop.name,
      bnName: crop.bnName,
      suitabilityScore: Math.round(score),
      waterNeed: waterNeedLabel(crop.waterNeedMm),
      riskLevel: crop.riskLevel,
      estimatedYieldMaund: Math.round(yieldMaund),
      estimatedRevenueBdt: revenueBdt,
      estimatedCostBdt: perAcreCost,
      estimatedProfitBdt: profit,
      roiPercent: Math.round(roi),
      rationale,
      kbEvidence,
    };
    return rec;
  });

  // Sort by score desc, take top 3+, assign ranks
  scored.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  const top = scored.slice(0, Math.min(5, scored.length)).filter(r => r.suitabilityScore > 0);
  top.forEach((r, i) => (r.rank = i + 1));

  return {
    profile,
    weather,
    recommendations: top,
    notes: `Ranked ${top.length} candidate crops for ${season} season using soil=${profile.soilType || '?'}, water=${profile.waterSource || '?'}, budget=৳${profile.budgetBdt?.toLocaleString() || '?'}, farm size=${profile.farmSizeDecimal || '?'} decimal. Scores combine soil fit, water match, budget fit, ROI, and risk.`,
  };
}
