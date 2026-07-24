import { db as prisma } from '@/lib/db';

export async function createOrUpdateSeasonPlan(params: {
  farmerId: string;
  crop: string;
  variety?: string;
  season?: string;
  sowingDate?: string;
  expectedHarvestDate?: string;
  currentGrowthStage?: string;
  baselineBudgetBdt?: number;
  expectedYieldValue?: number;
  expectedYieldUnit?: string;
}) {
  const { farmerId, crop, variety, season, sowingDate, expectedHarvestDate, currentGrowthStage, baselineBudgetBdt, expectedYieldValue, expectedYieldUnit } = params;

  // Find active plan or create new
  const existing = await prisma.seasonPlan.findFirst({
    where: { farmerId, planStatus: 'active' },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return await prisma.seasonPlan.update({
      where: { id: existing.id },
      data: {
        crop,
        variety: variety || existing.variety,
        season: season || existing.season,
        sowingDate: sowingDate || existing.sowingDate,
        expectedHarvestDate: expectedHarvestDate || existing.expectedHarvestDate,
        currentGrowthStage: currentGrowthStage || existing.currentGrowthStage,
        baselineBudgetBdt: baselineBudgetBdt ?? existing.baselineBudgetBdt,
        expectedYieldValue: expectedYieldValue ?? existing.expectedYieldValue,
        expectedYieldUnit: expectedYieldUnit || existing.expectedYieldUnit,
      },
    });
  }

  return await prisma.seasonPlan.create({
    data: {
      farmerId,
      crop,
      variety,
      season,
      sowingDate,
      expectedHarvestDate,
      currentGrowthStage: currentGrowthStage || 'Sowing',
      baselineBudgetBdt,
      expectedYieldValue,
      expectedYieldUnit: expectedYieldUnit || 'kg',
      planStatus: 'active',
    },
  });
}

export async function recordFarmOperation(params: {
  seasonPlanId: string;
  operationType: 'fertilizer' | 'irrigation' | 'weeding' | 'pest_control' | 'harvest';
  plannedDate?: string;
  revisedDate?: string;
  growthStage?: string;
  plannedQuantity?: number;
  quantityUnit?: string;
  estimatedCostBdt?: number;
  reason?: string;
}) {
  return await prisma.farmOperation.create({
    data: params,
  });
}

export async function createAlert(params: {
  seasonPlanId: string;
  alertType: 'pest' | 'disease' | 'heavy_rain' | 'drought' | 'heat';
  severity: 'high' | 'moderate' | 'low';
  messageEn: string;
}) {
  return await prisma.alert.create({
    data: params,
  });
}

export async function recordScenarioRun(params: {
  seasonPlanId: string;
  scenarioType: string;
  inputJson: any;
  outputJson: any;
}) {
  return await prisma.scenarioRun.create({
    data: {
      seasonPlanId: params.seasonPlanId,
      scenarioType: params.scenarioType,
      inputJson: JSON.stringify(params.inputJson),
      outputJson: JSON.stringify(params.outputJson),
    },
  });
}

export async function getFarmerMemory(farmerId: string) {
  const farmer = await prisma.farmer.findUnique({
    where: { id: farmerId },
    include: {
      seasonPlans: {
        include: {
          operations: { orderBy: { createdAt: 'desc' } },
          alerts: { orderBy: { createdAt: 'desc' } },
          scenarioRuns: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  return farmer;
}
