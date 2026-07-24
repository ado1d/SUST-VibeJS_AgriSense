import { getCurrentPriceSnapshot, getMarketIntelligenceRules, getSupplierCatalog } from '@/lib/kb/tier2';
import { computeFinancials } from './financials';

type InputNeed = { productName: string; quantity: number; unit: string };

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function minMax(value: number, values: number[], lowerIsBetter: boolean): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 1;
  const normalized = (value - min) / (max - min);
  return lowerIsBetter ? 1 - normalized : normalized;
}

export function compareSuppliers(needsInput: string | InputNeed[], farmerLocation?: string, limit = 5) {
  const needs: InputNeed[] = typeof needsInput === 'string' ? JSON.parse(needsInput) : needsInput;
  if (!Array.isArray(needs) || needs.length === 0) throw new Error('needs must be a non-empty JSON array');
  if (!Number.isFinite(limit) || limit < 1) throw new Error('limit must be at least 1');

  const catalog = getSupplierCatalog();
  const suppliers = new Map(catalog.suppliers.map(supplier => [supplier.supplier_id, supplier]));
  const comparisons = needs.map(need => {
    if (!need.productName || !Number.isFinite(Number(need.quantity)) || Number(need.quantity) <= 0) {
      throw new Error('Each need requires productName and a positive quantity');
    }
    const requestedUnit = normalize(need.unit || 'kg');
    const requestedName = normalize(need.productName)
      .replace('mop fertilizer', 'mop')
      .replace('zinc sulfate', 'zinc sulphate');
    const matching = catalog.offers.filter(offer => {
      const offerName = normalize(offer.product_name);
      return normalize(offer.package_unit) === requestedUnit &&
        (offerName === requestedName || offerName.includes(requestedName) || requestedName.includes(offerName));
    }).map(offer => {
      const supplier = suppliers.get(offer.supplier_id)!;
      const packagesNeeded = Math.ceil(Number(need.quantity) / offer.package_size);
      const inStock = offer.stock_packages >= packagesNeeded;
      const productCostBdt = packagesNeeded * offer.price_bdt;
      const deliveredCostBdt = productCostBdt + offer.delivery_charge_bdt;
      return {
        offer,
        supplier,
        packagesNeeded,
        suppliedQuantity: packagesNeeded * offer.package_size,
        excessQuantity: packagesNeeded * offer.package_size - Number(need.quantity),
        inStock,
        productCostBdt,
        deliveredCostBdt,
      };
    });

    const eligible = matching.filter(item => item.inStock);
    const costs = eligible.map(item => item.deliveredCostBdt);
    const distances = eligible.map(item => item.supplier.distance_proxy_km);
    const deliveryDays = eligible.map(item => item.supplier.delivery_days);
    const ratings = eligible.map(item => item.supplier.rating);
    const stocks = eligible.map(item => item.offer.stock_packages - item.packagesNeeded);
    const ranked = eligible.map(item => {
      const scoreParts = {
        deliveredPrice: minMax(item.deliveredCostBdt, costs, true),
        distanceProxy: minMax(item.supplier.distance_proxy_km, distances, true),
        deliveryTime: minMax(item.supplier.delivery_days, deliveryDays, true),
        rating: minMax(item.supplier.rating, ratings, false),
        stockAvailability: minMax(item.offer.stock_packages - item.packagesNeeded, stocks, false),
      };
      const w = catalog.ranking_weights;
      const score = scoreParts.deliveredPrice * w.delivered_price + scoreParts.distanceProxy * w.distance_proxy +
        scoreParts.deliveryTime * w.delivery_time + scoreParts.rating * w.rating +
        scoreParts.stockAvailability * w.stock_availability;
      return {
        supplierId: item.supplier.supplier_id,
        supplierName: item.supplier.supplier_name,
        marketName: item.supplier.market_name,
        district: item.supplier.district,
        upazila: item.supplier.upazila_or_thana,
        productName: item.offer.product_name,
        packageSize: item.offer.package_size,
        packageUnit: item.offer.package_unit,
        packagesNeeded: item.packagesNeeded,
        requestedQuantity: Number(need.quantity),
        suppliedQuantity: item.suppliedQuantity,
        excessQuantity: item.excessQuantity,
        unitPricePerPackageBdt: item.offer.price_bdt,
        productCostBdt: item.productCostBdt,
        deliveryChargeBdt: item.offer.delivery_charge_bdt,
        deliveredCostBdt: item.deliveredCostBdt,
        deliveryDays: item.supplier.delivery_days,
        distanceProxyKm: item.supplier.distance_proxy_km,
        rating: item.supplier.rating,
        stockPackagesAfterOrder: item.offer.stock_packages - item.packagesNeeded,
        score: Number((score * 100).toFixed(1)),
        scoreParts,
        sourceUrl: item.supplier.location_anchor_source.url,
        dataNature: 'MOCK supplier, price, stock, rating and delivery; official DAM market-location anchor',
      };
    }).sort((a, b) => b.score - a.score || a.deliveredCostBdt - b.deliveredCostBdt)
      .slice(0, Math.min(10, Math.trunc(limit)))
      .map((item, index) => ({ rank: index + 1, ...item }));

    return {
      need: { productName: need.productName, quantity: Number(need.quantity), unit: need.unit },
      matchedOffers: matching.length,
      eligibleInStockOffers: eligible.length,
      rankedSuppliers: ranked,
      missingReason: matching.length === 0 ? 'No mock catalog offer matches this product and unit.' :
        eligible.length === 0 ? 'Matching offers exist, but none has enough mock stock.' : null,
    };
  });

  return {
    farmerLocation: farmerLocation || 'Not provided',
    catalogNature: catalog.data_nature,
    rankingWeights: catalog.ranking_weights,
    comparisons,
    disclaimer: 'Commercial identities, offers, prices, stock, ratings and delivery estimates are seeded mock data. Distance is the official market-directory distance proxy from district headquarters, not the farmer-to-supplier route distance.',
  };
}

export function compareSuppliersForPlan(cropId: string, farmSizeDecimal: number, farmerLocation?: string, limit = 5) {
  const financials = computeFinancials(cropId, farmSizeDecimal);
  const acres = farmSizeDecimal / 100;
  const seedProductByCrop: Record<string, string> = {
    maize: 'Hybrid maize seed', potato: 'Potato seed tuber', mustard: 'Mustard seed', lentil: 'Mungbean seed',
  };
  const needs: InputNeed[] = financials.perAcre.lineItems
    .filter(item => item.category === 'Fertilizer' || item.category === 'Seed')
    .map(item => ({
      productName: item.category === 'Seed' ? (seedProductByCrop[cropId] || item.item) : item.item,
      quantity: Number((item.quantityPerAcre * acres).toFixed(3)),
      unit: item.unit,
    }))
    .filter(need => need.quantity > 0);
  return {
    inputSource: {
      tool: 'compute_financials', cropId, farmSizeDecimal,
      explanation: 'Required seed and fertilizer quantities were deterministically scaled from per-acre plan quantities.',
    },
    ...compareSuppliers(needs, farmerLocation, limit),
  };
}

type Option = { value: string; text: string; subgroup?: string };

function parseOptions(html: string): Option[] {
  return [...html.matchAll(/<option\s+value=["']([^"']+)["'][^>]*>([^<]+)<\/option>/gi)]
    .map(match => ({ value: match[1], text: match[2].replace(/&amp;/g, '&').trim() }))
    .filter(option => option.value && !option.text.toLowerCase().includes('select one'));
}

function scoreCommodity(requested: string, candidate: string): number {
  const a = normalize(requested);
  const b = normalize(candidate);
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;
  const tokens = new Set(a.split(' ').filter(token => token.length > 2 && !['rice', 'seed', 'crop'].includes(token)));
  const matched = b.split(' ').filter(token => tokens.has(token)).length;
  return matched * 20;
}

function categoryIdFor(commodity: string): string | null {
  const value = normalize(commodity);
  if (/rice|aman|boro|aus|paddy|wheat|maize/.test(value)) return '26|Foodgrains';
  if (/potato|tomato|brinjal|eggplant|cabbage/.test(value)) return '43|Vegetable';
  if (/mustard/.test(value)) return '29|Oil Seed';
  if (/lentil|mung|gram|pulse/.test(value)) return '27|Pulses';
  if (/jute/.test(value)) return '33|Fibre';
  if (/chili|chilli|onion|garlic|ginger/.test(value)) return '32|Spices';
  return null;
}

function cookieHeader(response: Response): string {
  return (response.headers.get('set-cookie') || '').split(',').map(value => value.split(';')[0]).join('; ');
}

async function damPost(pathname: string, data: Record<string, string>, cookie: string, timeoutMs = 15_000) {
  const response = await fetch(`https://market.dam.gov.bd/${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie,
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'AgriSense-AI/1.0',
    },
    body: new URLSearchParams(data),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`DAM ${pathname} returned HTTP ${response.status}`);
  return (await response.text()).replace(/^\s*\uFEFF/, '').trim();
}

async function fetchDamData(commodity: string, priceType: 'Growers' | 'Retail' | 'Wholesale', requestedYear?: number) {
  const pageResponse = await fetch('https://market.dam.gov.bd/price_graphical_report?L=E', {
    headers: { 'User-Agent': 'AgriSense-AI/1.0' },
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
  });
  if (!pageResponse.ok) throw new Error(`DAM report page returned HTTP ${pageResponse.status}`);
  const reportHtml = await pageResponse.text();
  const token = reportHtml.match(/name=["']csrf_webspice_tkn["']\s+value=["']([^"']+)/i)?.[1];
  if (!token) throw new Error('DAM CSRF token was not found');
  const cookie = cookieHeader(pageResponse);

  const categoryId = categoryIdFor(commodity);
  if (!categoryId) return { candidates: [] as Option[], historical: [] as any[], selected: null, yearsTried: [] as number[] };
  const subgroupHtml = await damPost('load_sub_commodity_group', { commodity_group: categoryId, csrf_webspice_tkn: token }, cookie);
  const subgroups = parseOptions(subgroupHtml);
  const lists = await Promise.all(subgroups.map(async subgroup => {
    try {
      const html = await damPost('get_commodity_list', {
        commodity_subgroup_id: subgroup.value,
        csrf_webspice_tkn: token,
        manage_grid: 'manage_grid',
      }, cookie);
      return parseOptions(html).map(option => ({ ...option, subgroup: subgroup.text }));
    } catch { return []; }
  }));
  const candidates = lists.flat();
  const scored = candidates.map(option => ({ ...option, score: scoreCommodity(commodity, option.text) }))
    .filter(option => option.score > 0).sort((a, b) => b.score - a.score);
  const exactMatches = scored.filter(option => option.score === 100);
  const preferredSubgroup = priceType === 'Growers' ? 'paddy' : 'rice';
  const exactPreferred = exactMatches.find(option => normalize(option.subgroup || '') === preferredSubgroup);
  const selected = exactPreferred || (exactMatches.length === 1 ? exactMatches[0] :
    scored[0] && (!scored[1] || scored[0].score > scored[1].score) ? scored[0] : null);
  if (!selected) return { candidates: scored.slice(0, 10), historical: [] as any[], selected: null, yearsTried: [] as number[] };

  const priceTypeId = priceType === 'Growers' ? '3' : priceType === 'Retail' ? '4' : '5';
  const startYear = requestedYear || new Date().getUTCFullYear();
  const yearsTried: number[] = [];
  let historical: any[] = [];
  let historicalYear: number | null = null;
  for (let year = startYear; year >= startYear - 3 && historical.length === 0; year--) {
    yearsTried.push(year);
    const raw = await damPost('price_graphical_report', {
      Commodity_id: selected.value,
      PriceType_id: priceTypeId,
      year: String(year),
      csrf_webspice_tkn: token,
    }, cookie, 25_000);
    try { historical = JSON.parse(raw); } catch { historical = []; }
    if (historical.length) historicalYear = year;
  }
  return { candidates: scored.slice(0, 10), historical, historicalYear, selected, yearsTried };
}

function parseLiveTicker(html: string) {
  return [...html.matchAll(/class=["']stockbox["'][^>]*>\s*<a[^>]*>([^<]+)<\/a>:\s*(?:&nbsp;|\s)*([0-9.]+)\s*-\s*([0-9.]+)/gi)]
    .map(match => ({ commodity: match[1].trim(), minimum: Number(match[2]), maximum: Number(match[3]), midpoint: (Number(match[2]) + Number(match[3])) / 2 }));
}

export async function getMarketPriceIntelligence(params: {
  commodity: string;
  priceType?: 'Growers' | 'Retail' | 'Wholesale';
  historicalYear?: number;
  verifiedCurrentPricePerUnit?: number;
  currentUnit?: string;
  market?: string;
  expectedFuturePricePerUnit?: number;
  immediateTransportCostPerUnit?: number;
  storageCostPerUnit?: number;
  spoilageLossPercent?: number;
  financingCostPerUnit?: number;
  laterTransportCostPerUnit?: number;
  storageFeasible?: boolean;
}) {
  if (!params.commodity?.trim()) throw new Error('commodity is required');
  const nonNegativeFields = [
    ['immediateTransportCostPerUnit', params.immediateTransportCostPerUnit],
    ['storageCostPerUnit', params.storageCostPerUnit],
    ['financingCostPerUnit', params.financingCostPerUnit],
    ['laterTransportCostPerUnit', params.laterTransportCostPerUnit],
  ] as const;
  for (const [name, value] of nonNegativeFields) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new Error(`${name} must be a non-negative number`);
  }
  if (params.spoilageLossPercent !== undefined && (!Number.isFinite(params.spoilageLossPercent) || params.spoilageLossPercent < 0 || params.spoilageLossPercent > 100)) {
    throw new Error('spoilageLossPercent must be between 0 and 100');
  }
  for (const [name, value] of [['verifiedCurrentPricePerUnit', params.verifiedCurrentPricePerUnit], ['expectedFuturePricePerUnit', params.expectedFuturePricePerUnit]] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) throw new Error(`${name} must be a positive number`);
  }
  const priceType = params.priceType || 'Growers';
  const rules = getMarketIntelligenceRules();
  const snapshot = getCurrentPriceSnapshot();
  let liveTicker: ReturnType<typeof parseLiveTicker> = [];
  let liveError: string | null = null;
  try {
    const liveResponse = await fetch('https://market.dam.gov.bd/?L=E', {
      headers: { 'User-Agent': 'AgriSense-AI/1.0' },
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    });
    if (!liveResponse.ok) throw new Error(`DAM current-price page returned HTTP ${liveResponse.status}`);
    liveTicker = parseLiveTicker(await liveResponse.text());
  } catch (error: any) {
    liveError = error.message;
  }
  const requested = normalize(params.commodity);
  const currentCandidates = liveTicker
    .map(item => ({ ...item, score: scoreCommodity(requested, item.commodity) }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  const current = currentCandidates[0] && (!currentCandidates[1] || currentCandidates[0].score > currentCandidates[1].score || currentCandidates[0].score >= 100)
    ? currentCandidates[0] : null;

  let damHistory: Awaited<ReturnType<typeof fetchDamData>>;
  try {
    damHistory = await fetchDamData(params.commodity, priceType, params.historicalYear);
  } catch (error: any) {
    damHistory = { candidates: [], historical: [], selected: null, yearsTried: [], historyError: error.message } as any;
  }

  const providedFieldsValid = Number.isFinite(params.verifiedCurrentPricePerUnit) && Boolean(params.currentUnit && params.market && params.priceType) &&
    Number.isFinite(params.expectedFuturePricePerUnit);
  let recommendation: 'sell_now' | 'store_or_wait' | 'monitor' = 'monitor';
  let decisionMath: any = null;
  const missingForDecision: string[] = [];
  if (!Number.isFinite(params.verifiedCurrentPricePerUnit)) missingForDecision.push('verified current price per unit');
  if (!params.currentUnit) missingForDecision.push('confirmed unit');
  if (!params.market) missingForDecision.push('specific market');
  if (!params.priceType) missingForDecision.push('confirmed price type (Growers, Wholesale, or Retail)');
  if (!Number.isFinite(params.expectedFuturePricePerUnit)) missingForDecision.push('expected future price per same unit');

  if (providedFieldsValid) {
    const currentPrice = Number(params.verifiedCurrentPricePerUnit);
    const futurePrice = Number(params.expectedFuturePricePerUnit);
    const immediateTransport = Number(params.immediateTransportCostPerUnit || 0);
    const storage = Number(params.storageCostPerUnit || 0);
    const spoilage = futurePrice * Number(params.spoilageLossPercent || 0) / 100;
    const financing = Number(params.financingCostPerUnit || 0);
    const laterTransport = Number(params.laterTransportCostPerUnit || 0);
    const currentNetPrice = currentPrice - immediateTransport;
    const expectedNetPriceAfterWaiting = futurePrice - storage - spoilage - financing - laterTransport;
    if (currentNetPrice >= expectedNetPriceAfterWaiting || params.storageFeasible === false) recommendation = 'sell_now';
    else if (params.storageFeasible === true) recommendation = 'store_or_wait';
    else missingForDecision.push('whether safe storage is feasible');
    decisionMath = {
      currentNetPrice: Number(currentNetPrice.toFixed(2)),
      expectedNetPriceAfterWaiting: Number(expectedNetPriceAfterWaiting.toFixed(2)),
      inputs: { currentPrice, currentUnit: params.currentUnit, market: params.market, futurePrice, immediateTransport, storage, spoilage, financing, laterTransport, storageFeasible: params.storageFeasible ?? 'not provided' },
      differencePerUnit: Number((expectedNetPriceAfterWaiting - currentNetPrice).toFixed(2)),
    };
  }

  return {
    commodityRequested: params.commodity,
    priceType,
    currentOfficialTicker: {
      retrievedAt: new Date().toISOString(),
      match: current,
      candidates: currentCandidates.slice(0, 10),
      unitStatus: 'not visible in DAM homepage ticker',
      marketAndPriceTypeStatus: 'not resolved by DAM homepage ticker',
      sourceUrl: 'https://market.dam.gov.bd/?L=E',
      error: liveError,
      safeUsage: 'Display as an official headline snapshot only; do not use as farm revenue or decision math without resolving unit, market and price type.',
    },
    suppliedSnapshotReference: snapshot.filter(item => scoreCommodity(params.commodity, item.commodity_en) > 0).slice(0, 10),
    historicalOfficialSeries: {
      selectedCommodity: damHistory.selected,
      alternatives: damHistory.candidates,
      year: (damHistory as any).historicalYear || null,
      yearsTried: damHistory.yearsTried,
      observations: damHistory.historical,
      unit: damHistory.historical[0]?.[`measurement_${priceType.toLowerCase()}`] || null,
      scope: 'National monthly series from the DAM Graphical Report; this endpoint does not expose a selected local market in its returned observations.',
      sourceUrl: 'https://market.dam.gov.bd/price_graphical_report?L=E',
      error: (damHistory as any).historyError || null,
    },
    recommendation,
    recommendationRule: rules.recommendation_rules.find(rule => rule.recommendation === recommendation),
    decisionMath,
    missingForDecision,
    explanation: recommendation === 'monitor'
      ? `MONITOR: a safe sell/store decision needs ${missingForDecision.join(', ')}. The headline ticker cannot resolve these fields.`
      : recommendation === 'sell_now'
        ? 'SELL NOW: verified current net price is at least the expected net price after waiting, or storage is not feasible.'
        : 'STORE/WAIT: expected net price after verified storage, spoilage, financing and later transport costs exceeds the current net price.',
    safetyRules: rules.safety_and_explainability,
  };
}
