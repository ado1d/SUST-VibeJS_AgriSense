// Tool 3: compute_financials — itemized cost breakdown + revenue + ROI + break-even
// Tier 0 #5. Math must be inspectable and internally consistent.

import { CROPS, INPUT_COSTS } from '@/lib/kb/crops';

export interface FinancialLineItem {
  category: string;
  item: string;
  quantityPerAcre: number;
  unit: string;
  rateBdt: number;
  totalBdt: number;
}

export interface FinancialResult {
  cropId: string;
  cropName: string;
  farmSizeDecimal: number;
  farmSizeAcre: number;
  perAcre: {
    lineItems: FinancialLineItem[];
    totalCostPerAcre: number;
    yieldPerAcre: number;        // maund/acre
    pricePerUnit: number;        // BDT/maund
    revenuePerAcre: number;
    profitPerAcre: number;
    roiPercent: number;
    breakEvenPricePerUnit: number;  // BDT/maund needed to cover costs
    breakEvenYieldMaund: number;    // yield needed to break even at price
  };
  totals: {
    totalCost: number;
    totalRevenue: number;
    totalProfit: number;
  };
  scenarioNotes: string[];
}

export function computeFinancials(cropId: string, farmSizeDecimal: number, sowingDate?: string): FinancialResult {
  const crop = CROPS.find(c => c.id === cropId);
  if (!crop) throw new Error(`Unknown crop id: ${cropId}`);
  if (!Number.isFinite(farmSizeDecimal) || farmSizeDecimal <= 0) {
    throw new Error('farmSizeDecimal must be a positive number');
  }

  const farmSizeAcre = farmSizeDecimal / 100;
  const c = INPUT_COSTS;
  const f = crop.fertilizerKgPerAcre;
  const lineItems: FinancialLineItem[] = [];

  // Fertilizer line items
  if (f.npk15_15_15) lineItems.push({ category: 'Fertilizer', item: 'NPK 15-15-15', quantityPerAcre: f.npk15_15_15, unit: 'kg', rateBdt: c.npk15PerKg, totalBdt: f.npk15_15_15 * c.npk15PerKg });
  if (f.urea) lineItems.push({ category: 'Fertilizer', item: 'Urea', quantityPerAcre: f.urea, unit: 'kg', rateBdt: c.ureaPerKg, totalBdt: f.urea * c.ureaPerKg });
  if (f.tsp) lineItems.push({ category: 'Fertilizer', item: 'TSP', quantityPerAcre: f.tsp, unit: 'kg', rateBdt: c.tspPerKg, totalBdt: f.tsp * c.tspPerKg });
  if (f.mop) lineItems.push({ category: 'Fertilizer', item: 'MOP', quantityPerAcre: f.mop, unit: 'kg', rateBdt: c.mopPerKg, totalBdt: f.mop * c.mopPerKg });
  if (f.gypsum) lineItems.push({ category: 'Fertilizer', item: 'Gypsum', quantityPerAcre: f.gypsum, unit: 'kg', rateBdt: c.gypsumPerKg, totalBdt: f.gypsum * c.gypsumPerKg });
  if (f.zinc) lineItems.push({ category: 'Fertilizer', item: 'Zinc Sulphate', quantityPerAcre: f.zinc, unit: 'kg', rateBdt: c.zincPerKg, totalBdt: f.zinc * c.zincPerKg });
  if (f.boron) lineItems.push({ category: 'Fertilizer', item: 'Boron', quantityPerAcre: f.boron, unit: 'kg', rateBdt: c.boronPerKg, totalBdt: f.boron * c.boronPerKg });

  // Seed
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
  lineItems.push({
    category: 'Seed',
    item: `${crop.name} seed`,
    quantityPerAcre: seedKgPerAcre[crop.id] || 0,
    unit: 'kg',
    rateBdt: seedUnit[crop.id] || 0,
    totalBdt: (seedKgPerAcre[crop.id] || 0) * (seedUnit[crop.id] || 0),
  });

  // Labour
  const labourDays: Record<string, number> = {
    'rice-boro': 35, 'rice-aman': 30, 'rice-aus': 18,
    'wheat': 18, 'maize': 22, 'potato': 50, 'mustard': 14,
    'lentil': 12, 'jute': 45, 'tomato': 70, 'brinjal': 75, 'chili': 80,
  };
  lineItems.push({
    category: 'Labour',
    item: 'Agricultural labour',
    quantityPerAcre: labourDays[crop.id] || 20,
    unit: 'person-day',
    rateBdt: c.labourPerDay,
    totalBdt: (labourDays[crop.id] || 20) * c.labourPerDay,
  });

  // Irrigation
  const irrigEvents: Record<string, number> = {
    'rice-boro': 18, 'rice-aman': 4, 'rice-aus': 2,
    'wheat': 3, 'maize': 4, 'potato': 5, 'mustard': 2,
    'lentil': 1, 'jute': 2, 'tomato': 12, 'brinjal': 14, 'chili': 10,
  };
  lineItems.push({
    category: 'Irrigation',
    item: 'Irrigation events',
    quantityPerAcre: irrigEvents[crop.id] || 3,
    unit: 'application',
    rateBdt: c.irrigationPerApplication,
    totalBdt: (irrigEvents[crop.id] || 3) * c.irrigationPerApplication,
  });

  // Land preparation (diesel)
  lineItems.push({
    category: 'Land prep',
    item: 'Diesel for ploughing',
    quantityPerAcre: 18,
    unit: 'litre',
    rateBdt: c.dieselPerLitre,
    totalBdt: 18 * c.dieselPerLitre,
  });

  // Pest management
  const pestCost: Record<string, number> = {
    'rice-boro': 1500, 'rice-aman': 1000, 'rice-aus': 600,
    'wheat': 800, 'maize': 1200, 'potato': 3000, 'mustard': 600,
    'lentil': 800, 'jute': 1000, 'tomato': 4500, 'brinjal': 5000, 'chili': 5500,
  };
  lineItems.push({
    category: 'Pest mgmt',
    item: 'Pesticide + IPM (estimate)',
    quantityPerAcre: 1,
    unit: 'lump',
    rateBdt: pestCost[crop.id] || 1000,
    totalBdt: pestCost[crop.id] || 1000,
  });

  const totalCostPerAcre = lineItems.reduce((s, li) => s + li.totalBdt, 0);
  const yieldPerAcre = (crop.typicalYieldPerAcre.min + crop.typicalYieldPerAcre.max) / 2;
  const pricePerUnit = (crop.typicalPricePerUnit.min + crop.typicalPricePerUnit.max) / 2;
  const scenarioNotes: string[] = [];
  if (sowingDate) {
    // crude scenario note based on sowing date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sowingDate) || Number.isNaN(Date.parse(`${sowingDate}T00:00:00Z`))) {
      throw new Error('sowingDate must be a valid ISO date (YYYY-MM-DD)');
    }
    const m = new Date(`${sowingDate}T00:00:00Z`).getUTCMonth() + 1;
    if (crop.seasons.includes('rabi') && (m < 10 || m > 12)) {
      scenarioNotes.push(`Sowing in month ${m} is outside the optimal Rabi window (Nov–Dec). Yield may drop 10–25% due to heat stress at grain filling.`);
    }
  }

  // Round displayed inputs first, then derive every displayed total from those
  // values. This guarantees revenue - cost = profit in both views.
  const displayedCostPerAcre = Math.round(totalCostPerAcre);
  const displayedYieldPerAcre = Math.round(yieldPerAcre * 10) / 10;
  const displayedPricePerUnit = Math.round(pricePerUnit);
  const displayedRevenuePerAcre = Math.round(displayedYieldPerAcre * displayedPricePerUnit);
  const displayedProfitPerAcre = displayedRevenuePerAcre - displayedCostPerAcre;
  const totalCost = Math.round(displayedCostPerAcre * farmSizeAcre);
  const totalRevenue = Math.round(displayedRevenuePerAcre * farmSizeAcre);
  const totalProfit = totalRevenue - totalCost;

  return {
    cropId,
    cropName: crop.name,
    farmSizeDecimal,
    farmSizeAcre,
    perAcre: {
      lineItems,
      totalCostPerAcre: displayedCostPerAcre,
      yieldPerAcre: displayedYieldPerAcre,
      pricePerUnit: displayedPricePerUnit,
      revenuePerAcre: displayedRevenuePerAcre,
      profitPerAcre: displayedProfitPerAcre,
      roiPercent: Math.round((displayedProfitPerAcre / displayedCostPerAcre) * 100),
      breakEvenPricePerUnit: Math.round(displayedCostPerAcre / displayedYieldPerAcre),
      breakEvenYieldMaund: Math.round((displayedCostPerAcre / displayedPricePerUnit) * 10) / 10,
    },
    totals: {
      totalCost,
      totalRevenue,
      totalProfit,
    },
    scenarioNotes,
  };
}
