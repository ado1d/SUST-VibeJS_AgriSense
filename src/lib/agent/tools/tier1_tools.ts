import {
  getFertilizerRecords,
  getIrrigationRecords,
  getPestDiseaseRiskRecords,
  getWeatherTriggerRules,
  getScenarioSimulationData,
} from '@/lib/kb/tier1';
import { computeFinancials } from './financials';
import { CROPS, INPUT_COSTS } from '@/lib/kb/crops';

function cropMatches(recordCrop: string, requestedCrop: string): boolean {
  const record = recordCrop.toLowerCase().trim();
  const requested = requestedCrop.toLowerCase().trim();
  if (record === 'all crops' || record === 'all irrigated crops') return true;
  if (record === 'all non-rice crops') return !requested.includes('rice');
  return record.includes(requested) || requested.includes(record);
}

function validFarmSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error('farmSizeDecimal must be a positive number');
  return value;
}

function fertilizerRate(parameter: string): number | null {
  const name = parameter.toLowerCase();
  if (name.includes('urea')) return INPUT_COSTS.ureaPerKg;
  if (name.includes('tsp')) return INPUT_COSTS.tspPerKg;
  if (name.includes('mop')) return INPUT_COSTS.mopPerKg;
  if (name.includes('gypsum')) return INPUT_COSTS.gypsumPerKg;
  if (name.includes('zinc')) return INPUT_COSTS.zincPerKg;
  if (name.includes('boron')) return INPUT_COSTS.boronPerKg;
  if (name.includes('npk')) return INPUT_COSTS.npk15PerKg;
  return null;
}

/** Tier 1 fertilizer scheduler, grounded in the verified data pack. */
export function getFertilizerSchedule(crop: string, soilType?: string, farmSizeDecimal: number = 100) {
  const farmSize = validFarmSize(farmSizeDecimal);
  const matching = getFertilizerRecords().filter(record => cropMatches(record.crop, crop));

  if (matching.length === 0) {
    return { crop, found: false, message: `No verified fertilizer records were found for "${crop}".` };
  }

  const hectares = (farmSize / 100) * 0.404686;
  const quantityRecords = matching.filter(record => record.record_type === 'quantity');
  const fertilizerSchedule = quantityRecords.map(record => {
    const numericValue = typeof record.value === 'number' && Number.isFinite(record.value) ? record.value : null;
    const unit = String(record.unit || '').toLowerCase();
    let totalForFarm: string | null = null;
    let dosePerDecimal: string | null = null;
    let estimatedCostBdt: number | null = null;
    let scalingNote = `Cannot scale ${record.unit || 'this value'} without additional context.`;

    if (numericValue !== null && unit === 'kg/ha') {
      const totalKg = Number((numericValue * hectares).toFixed(2));
      totalForFarm = `${totalKg} kg`;
      dosePerDecimal = `${Number((numericValue * 0.00404686).toFixed(3))} kg/decimal`;
      const rate = fertilizerRate(record.parameter);
      estimatedCostBdt = rate === null ? null : Math.round(totalKg * rate);
      scalingNote = 'Scaled from the verified kg/ha dose.';
    } else if (numericValue !== null && unit === 'tonne/ha') {
      totalForFarm = `${Number((numericValue * hectares).toFixed(3))} tonnes`;
      dosePerDecimal = `${Number((numericValue * 4.04686).toFixed(2))} kg/decimal`;
      scalingNote = 'Scaled from the verified tonne/ha dose.';
    }

    return {
      id: record.id,
      parameter: record.parameter,
      category: record.category,
      recommendedValue: `${record.value} ${record.unit || ''}`.trim(),
      totalForFarm,
      dosePerDecimal,
      estimatedCostBdt,
      scalingNote,
      context: record.context,
      source: record.main_source?.title || 'BARI/BRRI/DAE Guide',
      sourceUrl: record.main_source?.url,
    };
  });

  const timingAndManagement = matching
    .filter(record => record.record_type !== 'quantity')
    .map(record => ({
      id: record.id,
      parameter: record.parameter,
      recommendation: String(record.value || record.content),
      context: record.context,
      source: record.main_source?.title || 'BARI/BRRI/DAE Guide',
      sourceUrl: record.main_source?.url,
    }));

  return {
    crop,
    soilType: soilType || 'loamy (standard)',
    farmSizeDecimal: farmSize,
    hectares: Number(hectares.toFixed(3)),
    found: true,
    totalRecords: matching.length,
    fertilizerSchedule,
    timingAndManagement,
    organicAlternatives: matching
      .filter(record => /cow\s*dung|compost|organic|vermi|manure|biofertilizer/i.test(`${record.parameter} ${record.content}`))
      .map(record => ({
        id: record.id,
        parameter: record.parameter,
        verifiedValue: `${record.value} ${record.unit || ''}`.trim(),
        guidance: record.content,
        sourceUrl: record.main_source?.url,
      })),
    contextSelectionRequired: new Set(quantityRecords.map(record => record.context).filter(Boolean)).size > 1,
    contextWarning: 'These records come from different varieties, AEZs, technologies, and cropping patterns. Select one matching context; do not add alternative doses together.',
    soilAdvice: soilType?.toLowerCase().includes('sandy')
      ? 'For sandy soil, use the verified split schedule and avoid applying before forecast rain to reduce leaching.'
      : soilType?.toLowerCase().includes('clay')
        ? 'For clay soil, verify drainage and use only the crop-specific timing records returned above.'
        : 'Follow the crop-specific verified timing records returned above.',
  };
}

/** Tier 1 irrigation scheduler. */
export function getIrrigationSchedule(crop: string, soilType?: string, farmSizeDecimal: number = 100) {
  const farmSize = validFarmSize(farmSizeDecimal);
  const matching = getIrrigationRecords().filter(record => cropMatches(record.crop, crop));

  const cropRecord = CROPS.find(record => cropMatches(record.name, crop));
  const irrigationLine = cropRecord
    ? computeFinancials(cropRecord.id, farmSize).perAcre.lineItems.find(item => item.category === 'Irrigation')
    : undefined;

  return {
    crop,
    soilType: soilType || 'loamy',
    farmSizeDecimal: farmSize,
    found: matching.length > 0,
    totalRecords: matching.length,
    irrigationRecords: matching.map(record => ({
      id: record.id,
      parameter: record.parameter || 'Irrigation guide',
      verifiedValue: record.value === undefined ? null : `${record.value} ${record.unit || ''}`.trim(),
      growthStage: record.growth_stage || 'All stages',
      content: record.content,
      source: record.main_source?.title || 'BARI/FAO Irrigation Guide',
      sourceUrl: record.main_source?.url,
    })),
    soilAdjustment: soilType?.toLowerCase().includes('sandy')
      ? 'Sandy soil generally needs smaller, more frequent applications; calculate the interval from soil-water status.'
      : 'Calculate irrigation from crop water need, effective rainfall and current soil-water status.',
    estimatedIrrigationCost: irrigationLine ? {
      eventsPerAcre: irrigationLine.quantityPerAcre,
      ratePerEventBdt: irrigationLine.rateBdt,
      totalFarmBdt: Math.round(irrigationLine.totalBdt * farmSize / 100),
      scope: 'Planning allowance; actual pumping cost depends on source and energy price',
    } : null,
  };
}

/** Tier 1 pest and disease risk assessment. Weather signals are scouting alerts, not diagnoses. */
export function assessPestDiseaseRisk(
  crop: string,
  growthStage?: string,
  temperatureC?: number,
  humidityPercent?: number,
  rainfallMm?: number,
  farmSizeDecimal: number = 100,
) {
  const farmSize = validFarmSize(farmSizeDecimal);
  const matching = getPestDiseaseRiskRecords().filter(record => cropMatches(record.crop, crop));
  const requestedStage = growthStage?.toLowerCase().trim();

  const alerts = matching.map(risk => {
    const conditions = risk.weather_conditions || {};
    const riskStage = risk.growth_stage.toLowerCase();
    const stageMatch = !requestedStage || riskStage.includes('all') ||
      riskStage.includes(requestedStage) || requestedStage.includes(riskStage);
    const checks: Array<{ name: string; available: boolean; matched: boolean }> = [];

    if (conditions.temperature_min_c !== undefined || conditions.temperature_max_c !== undefined) {
      checks.push({
        name: 'temperature',
        available: temperatureC !== undefined,
        matched: temperatureC !== undefined &&
          (conditions.temperature_min_c === undefined || temperatureC >= conditions.temperature_min_c) &&
          (conditions.temperature_max_c === undefined || temperatureC <= conditions.temperature_max_c),
      });
    }
    if (conditions.relative_humidity_min_percent !== undefined || conditions.relative_humidity_max_percent !== undefined) {
      checks.push({
        name: 'humidity',
        available: humidityPercent !== undefined,
        matched: humidityPercent !== undefined &&
          (conditions.relative_humidity_min_percent === undefined || humidityPercent >= conditions.relative_humidity_min_percent) &&
          (conditions.relative_humidity_max_percent === undefined || humidityPercent <= conditions.relative_humidity_max_percent),
      });
    }
    if (conditions.rainfall_mm_min !== undefined) {
      checks.push({
        name: 'rainfall',
        available: rainfallMm !== undefined,
        matched: rainfallMm !== undefined && rainfallMm >= conditions.rainfall_mm_min,
      });
    }

    const missingWeatherInputs = checks.filter(check => !check.available).map(check => check.name);
    const weatherMatched = checks.length > 0 && missingWeatherInputs.length === 0 && checks.every(check => check.matched);
    const riskLevel = !stageMatch
      ? 'NOT_CURRENT_STAGE'
      : checks.length === 0 || missingWeatherInputs.length > 0
        ? 'INSUFFICIENT_DATA'
        : weatherMatched ? 'HIGH' : 'LOW';

    return {
      id: risk.id,
      riskName: risk.risk_name,
      riskType: risk.risk_type,
      growthStage: risk.growth_stage,
      riskLevel,
      weatherMatched,
      missingWeatherInputs,
      favourableConditionsText: conditions.source_favourable_weather_text || risk.content,
      scoutingAdvice: `Inspect the field for ${risk.risk_name} symptoms during ${risk.growth_stage}; weather alone does not confirm infestation.`,
      preventiveAction: risk.preventive_or_nonchemical_action || 'Scout regularly and consult the local DAE officer if symptoms appear.',
      treatmentOption: risk.source_reported_treatment || 'No verified treatment is included in this record; verify current registration and the product label locally.',
      treatmentLabelValidationRequired: risk.treatment_label_validation_required ?? true,
      source: `${risk.main_source?.institution} - ${risk.main_source?.title}`,
      sourceUrl: risk.main_source?.url,
    };
  });

  const cropRecord = CROPS.find(record => cropMatches(record.name, crop));
  const managementLine = cropRecord
    ? computeFinancials(cropRecord.id, farmSize).perAcre.lineItems.find(item => item.category === 'Pest mgmt')
    : undefined;

  return {
    crop,
    stageEvaluated: growthStage || 'All growth stages',
    currentWeatherTested: {
      temperatureC: temperatureC ?? 'Not provided',
      humidityPercent: humidityPercent ?? 'Not provided',
      rainfallMm: rainfallMm ?? 'Not provided',
    },
    totalPestsAndDiseasesAssessed: matching.length,
    alerts,
    estimatedManagementCost: managementLine ? {
      perAcreBdt: managementLine.totalBdt,
      totalFarmBdt: Math.round(managementLine.totalBdt * farmSize / 100),
      scope: 'Planning allowance for pesticide + IPM, not a product-specific quote',
    } : null,
    safetyWarning: 'WEATHER RISK DOES NOT CONFIRM INFESTATION. Scout the field before any treatment.',
  };
}

type NormalizedForecastDay = {
  date?: string;
  temp?: number;
  humidity?: number;
  rain: number;
  et0?: number;
};

function normalizeForecast(weatherForecast: any): NormalizedForecastDay[] {
  const supplied = Array.isArray(weatherForecast)
    ? weatherForecast
    : Array.isArray(weatherForecast?.forecast) ? weatherForecast.forecast : [];

  return supplied.map((day: any) => ({
    date: day.date,
    temp: typeof day.tempMaxC === 'number' && typeof day.tempMinC === 'number'
      ? (day.tempMaxC + day.tempMinC) / 2 : undefined,
    humidity: typeof day.humidityMeanPercent === 'number' ? day.humidityMeanPercent : undefined,
    rain: Number(day.precipitationMm || 0),
    et0: typeof day.et0Mm === 'number' ? day.et0Mm : undefined,
  }));
}

/** Evaluate verified trigger rules against the exact shape returned by get_weather. */
export function checkWeatherTriggers(crop: string, growthStage?: string, weatherForecast: any = null) {
  const matchingRules = getWeatherTriggerRules().filter(rule => cropMatches(rule.crop, crop));
  const days = normalizeForecast(weatherForecast);
  const totalRain7Days = days.reduce((sum, day) => sum + day.rain, 0);
  const temperatures = days.flatMap(day => day.temp === undefined ? [] : [day.temp]);
  const activeTriggers: any[] = [];
  const pendingRules: any[] = [];

  for (const rule of matchingRules) {
    const conditions = rule.trigger?.weather_conditions;
    const operation = rule.operation_or_alert.toLowerCase();
    const ruleStage = rule.trigger?.growth_stage?.toLowerCase();
    const requestedStage = growthStage?.toLowerCase();
    const stageMatches = !requestedStage || !ruleStage || ruleStage.includes('all') ||
      ruleStage.includes(requestedStage) || requestedStage.includes(ruleStage);

    if (!stageMatches) {
      pendingRules.push({ ruleId: rule.id, reason: `Rule applies at ${rule.trigger?.growth_stage}, not ${growthStage}.` });
      continue;
    }

    let matchingDay: NormalizedForecastDay | undefined;
    let triggerReason = '';
    if (conditions && days.length > 0) {
      const needsTemperature = conditions.temperature_min_c !== undefined || conditions.temperature_max_c !== undefined;
      const needsHumidity = conditions.relative_humidity_min_percent !== undefined || conditions.relative_humidity_max_percent !== undefined;
      const needsRainfall = conditions.precipitation_sum_min_mm !== undefined;
      const hasNumericConditions = needsTemperature || needsHumidity || needsRainfall;
      const hasInputs = (!needsTemperature || days.some(day => day.temp !== undefined)) &&
        (!needsHumidity || days.some(day => day.humidity !== undefined));
      matchingDay = hasNumericConditions && hasInputs ? days.find(day =>
        (!needsTemperature || (day.temp !== undefined &&
          (conditions.temperature_min_c === undefined || day.temp >= conditions.temperature_min_c) &&
          (conditions.temperature_max_c === undefined || day.temp <= conditions.temperature_max_c))) &&
        (!needsHumidity || (day.humidity !== undefined &&
          (conditions.relative_humidity_min_percent === undefined || day.humidity >= conditions.relative_humidity_min_percent) &&
          (conditions.relative_humidity_max_percent === undefined || day.humidity <= conditions.relative_humidity_max_percent))) &&
        (!needsRainfall || day.rain >= (conditions.precipitation_sum_min_mm || 0))
      ) : undefined;
      const matchedValues = matchingDay ? [
        needsTemperature && matchingDay.temp !== undefined ? `mean temperature ${matchingDay.temp.toFixed(1)}°C` : null,
        needsHumidity && matchingDay.humidity !== undefined ? `humidity ${matchingDay.humidity.toFixed(1)}%` : null,
        needsRainfall ? `rain ${matchingDay.rain.toFixed(1)} mm` : null,
      ].filter(Boolean).join(', ') : '';
      triggerReason = matchingDay
        ? `${matchingDay.date}: ${matchedValues} match the verified thresholds.`
        : !hasNumericConditions ? 'This rule requires non-weather context that was not supplied.'
          : hasInputs ? 'No forecast day matched all verified numeric thresholds.' : 'A required forecast input is unavailable.';
    } else if (operation.includes('rainfall-based irrigation') && totalRain7Days > 0) {
      matchingDay = days.find(day => day.rain > 0);
      triggerReason = `${totalRain7Days.toFixed(1)} mm rain is forecast; recalculate the water deficit before changing irrigation.`;
    } else if (operation.includes('nitrogen') && totalRain7Days > 0 && /urea|nitrogen|top dress/i.test(growthStage || '')) {
      matchingDay = days.find(day => day.rain > 0);
      triggerReason = `${totalRain7Days.toFixed(1)} mm rain is forecast during the stated nitrogen operation window; review its date using an approved local threshold.`;
    }

    if (matchingDay) {
      activeTriggers.push({
        ruleId: rule.id,
        alertOrOperation: rule.operation_or_alert,
        action: rule.recommended_agent_action,
        reasoning: triggerReason,
        sourceReasoning: rule.reasoning,
        evidenceType: rule.evidence_type,
      });
    } else {
      pendingRules.push({
        ruleId: rule.id,
        reason: triggerReason || (days.length ? 'Required operational context was not supplied.' : 'No forecast days were supplied.'),
      });
    }
  }

  return {
    crop,
    growthStage: growthStage || 'Active season',
    weatherSummary: {
      totalRain7DaysMm: Number(totalRain7Days.toFixed(1)),
      maxMeanTemp7DaysC: temperatures.length ? Number(Math.max(...temperatures).toFixed(1)) : null,
      minMeanTemp7DaysC: temperatures.length ? Number(Math.min(...temperatures).toFixed(1)) : null,
    },
    evaluatedRulesCount: matchingRules.length,
    triggeredRulesCount: activeTriggers.length,
    proactiveAlerts: activeTriggers,
    pendingRules,
  };
}

function isoDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('sowingDate must use YYYY-MM-DD format');
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error('sowingDate must be a valid date');
  return date;
}

function shiftIsoDate(value: string, days: number): string {
  const date = isoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Deterministic Tier 1 scenario simulation. */
export function simulateScenario(params: {
  cropId: string;
  farmSizeDecimal: number;
  scenarioType: 'budget_cut_percent' | 'rainfall_change_percent' | 'selling_price_change_percent' | 'input_price_change_percent' | 'sowing_delay_days';
  changeValue: number;
  sowingDate?: string;
}) {
  const { cropId, scenarioType, sowingDate } = params;
  const farmSizeDecimal = validFarmSize(params.farmSizeDecimal);
  if (!Number.isFinite(params.changeValue)) throw new Error('changeValue must be a finite number');
  const crop = CROPS.find(record => record.id === cropId);
  if (!crop) throw new Error(`Unknown crop id: ${cropId}`);
  if (scenarioType !== 'sowing_delay_days' && params.changeValue <= -100) {
    throw new Error('Percentage changes must be greater than -100%');
  }

  const baseline = computeFinancials(cropId, farmSizeDecimal, sowingDate);
  const baseCost = baseline.totals.totalCost;
  const baseRevenue = baseline.totals.totalRevenue;
  const baseProfit = baseRevenue - baseCost;
  const baseRoi = Number(((baseProfit / baseCost) * 100).toFixed(1));
  const totalYield = baseline.perAcre.yieldPerAcre * (farmSizeDecimal / 100);
  const initialSowing = sowingDate || new Date().toISOString().slice(0, 10);
  isoDate(initialSowing);

  let revisedTotalCost = baseCost;
  let revisedRevenue = baseRevenue;
  let revisedSowingDate = initialSowing;
  let availableBudget = baseCost;
  let fundingShortfall = 0;
  let planAffordable = true;
  let explanation = '';
  const assumptions: string[] = [];

  switch (scenarioType) {
    case 'budget_cut_percent': {
      const cutPercent = Math.abs(params.changeValue);
      if (cutPercent >= 100) throw new Error('Budget cut must be less than 100%');
      availableBudget = Math.round(baseCost * (1 - cutPercent / 100));
      fundingShortfall = Math.max(0, baseCost - availableBudget);
      planAffordable = fundingShortfall === 0;
      explanation = `Available budget falls ${cutPercent}% to ৳${availableBudget.toLocaleString()}. The verified input plan still costs ৳${baseCost.toLocaleString()}, leaving a ৳${fundingShortfall.toLocaleString()} shortfall.`;
      assumptions.push('Agronomic quantities and yield were not reduced because the data pack contains no verified crop-response factor for arbitrary budget cuts.');
      break;
    }
    case 'rainfall_change_percent': {
      const irrigationPerAcre = baseline.perAcre.lineItems.find(item => item.category === 'Irrigation')?.totalBdt || 0;
      const irrigationTotal = Math.round(irrigationPerAcre * farmSizeDecimal / 100);
      const irrigationDelta = params.changeValue < 0
        ? Math.round(irrigationTotal * Math.abs(params.changeValue) / 100)
        : -Math.min(irrigationTotal, Math.round(irrigationTotal * params.changeValue / 100));
      revisedTotalCost = baseCost + irrigationDelta;
      explanation = `Rainfall changes ${params.changeValue}%; the irrigation planning allowance changes by ${irrigationDelta >= 0 ? '+' : '-'}৳${Math.abs(irrigationDelta).toLocaleString()}.`;
      assumptions.push('This is a proportional irrigation-cost sensitivity, not a water-balance result. A precise revision requires baseline rainfall, ETc, effective rainfall and soil-water status.');
      break;
    }
    case 'selling_price_change_percent': {
      revisedRevenue = Math.round(baseRevenue * (1 + params.changeValue / 100));
      explanation = `Selling price changes ${params.changeValue}%, so revenue changes from ৳${baseRevenue.toLocaleString()} to ৳${revisedRevenue.toLocaleString()} at unchanged marketable yield.`;
      break;
    }
    case 'input_price_change_percent': {
      revisedTotalCost = Math.round(baseCost * (1 + params.changeValue / 100));
      explanation = `All modeled input prices change ${params.changeValue}%, changing total cost from ৳${baseCost.toLocaleString()} to ৳${revisedTotalCost.toLocaleString()}.`;
      assumptions.push('The percentage is applied to every modeled cost item because no individual input item was specified.');
      break;
    }
    case 'sowing_delay_days': {
      const delayDays = Math.trunc(params.changeValue);
      revisedSowingDate = shiftIsoDate(initialSowing, delayDays);
      explanation = `Sowing shifts ${delayDays} day(s), from ${initialSowing} to ${revisedSowingDate}; all relative calendar dates shift equally.`;
      assumptions.push('Yield and prices remain unchanged until a verified late-sowing response and a revised weather forecast are supplied.');
      break;
    }
  }

  const revisedProfit = revisedRevenue - revisedTotalCost;
  const revisedRoi = Number(((revisedProfit / revisedTotalCost) * 100).toFixed(1));
  const revisedBreakEvenPrice = Number((revisedTotalCost / totalYield).toFixed(2));
  const expectedHarvestDate = shiftIsoDate(revisedSowingDate, crop.durationDays);
  const scenarioRule = getScenarioSimulationData().scenario_engine_rules.find(rule => rule.scenario === scenarioType);

  return {
    scenarioType,
    changeValue: params.changeValue,
    crop: baseline.cropName,
    farmSizeDecimal,
    unit: crop.typicalPricePerUnit.unit,
    baseline: {
      totalCostBdt: baseCost,
      expectedRevenueBdt: baseRevenue,
      expectedNetProfitBdt: baseProfit,
      roiPercent: baseRoi,
      breakEvenPricePerUnit: baseline.perAcre.breakEvenPricePerUnit,
      availableBudgetBdt: baseCost,
      fundingShortfallBdt: 0,
      planAffordable: true,
      sowingDate: initialSowing,
      expectedHarvestDate: shiftIsoDate(initialSowing, crop.durationDays),
    },
    simulated: {
      totalCostBdt: revisedTotalCost,
      expectedRevenueBdt: revisedRevenue,
      expectedNetProfitBdt: revisedProfit,
      roiPercent: revisedRoi,
      breakEvenPricePerUnit: revisedBreakEvenPrice,
      availableBudgetBdt: availableBudget,
      fundingShortfallBdt: fundingShortfall,
      planAffordable,
      sowingDate: revisedSowingDate,
      expectedHarvestDate,
    },
    impactDelta: {
      costDeltaBdt: revisedTotalCost - baseCost,
      revenueDeltaBdt: revisedRevenue - baseRevenue,
      profitDeltaBdt: revisedProfit - baseProfit,
      roiDeltaPercent: Number((revisedRoi - baseRoi).toFixed(1)),
      budgetDeltaBdt: availableBudget - baseCost,
    },
    explanation,
    assumptions,
    ruleReference: scenarioRule || 'AgriSense Tier 1 deterministic scenario rule',
  };
}
