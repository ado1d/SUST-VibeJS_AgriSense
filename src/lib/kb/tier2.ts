import fs from 'node:fs';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';

export interface Tier2Supplier {
  supplier_id: string;
  supplier_name: string;
  market_name: string;
  district: string;
  upazila_or_thana: string;
  delivery_days: number;
  rating: number;
  distance_proxy_km: number;
  data_nature: string;
  location_anchor_source: { institution: string; title: string; url: string; locator: string; data_nature: string };
  warning: string;
}

export interface Tier2Offer {
  offer_id: string;
  supplier_id: string;
  product_name: string;
  category: string;
  package_size: number;
  package_unit: string;
  price_bdt: number;
  stock_packages: number;
  delivery_charge_bdt: number;
  data_nature: string;
  warning: string;
}

export interface SupplierCatalog {
  suppliers: Tier2Supplier[];
  offers: Tier2Offer[];
  ranking_weights: {
    delivered_price: number;
    distance_proxy: number;
    delivery_time: number;
    rating: number;
    stock_availability: number;
  };
  data_nature: string;
}

export interface CurrentPriceSnapshot {
  id: string;
  report_date: string;
  commodity_en: string;
  commodity_bn: string;
  minimum_display_price: number;
  maximum_display_price: number;
  midpoint_display_price: number;
  currency: string;
  unit_status: string;
  price_scope_status: string;
  data_nature: string;
  main_source: { institution: string; title: string; url: string; locator: string; data_nature: string };
  usage_rule: string;
}

export interface MarketIntelligenceRules {
  data_nature: string;
  required_historical_fields: string[];
  official_historical_source: { institution: string; title: string; url: string; locator: string; data_nature: string };
  source_capability: string;
  recommendation_rules: Array<{ rule_id: string; recommendation: string; condition: string; formula?: string }>;
  safety_and_explainability: string[];
}

const cache = new Map<string, unknown>();
const ZIP_FILES = {
  supplier: 'AgriSense_Tier2_Official_Market_Directory_Sample.zip',
  market: 'AgriSense_Tier2_Market_Intelligence_Rules.zip',
} as const;

// The user supplied Tier 2 data as ZIP files. Reading them directly keeps the
// original provenance package intact and avoids maintaining duplicate JSON.
function readZipEntry(zipFile: keyof typeof ZIP_FILES, entryName: string): string {
  const cacheKey = `${zipFile}:${entryName}`;
  const cached = cache.get(cacheKey);
  if (typeof cached === 'string') return cached;

  // ZIP_FILES is a closed allow-list. The tracing ignore prevents Turbopack from
  // treating process.cwd() as an instruction to bundle the entire repository;
  // next.config.ts explicitly includes both required assets instead.
  const bytes = fs.readFileSync(path.join(/* turbopackIgnore: true */ process.cwd(), ZIP_FILES[zipFile]));
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error(`Invalid ZIP file: ${zipFile}`);

  const entryCount = bytes.readUInt16LE(eocd + 10);
  let centralOffset = bytes.readUInt32LE(eocd + 16);
  for (let index = 0; index < entryCount; index++) {
    if (bytes.readUInt32LE(centralOffset) !== 0x02014b50) throw new Error(`Invalid ZIP directory: ${zipFile}`);
    const method = bytes.readUInt16LE(centralOffset + 10);
    const compressedSize = bytes.readUInt32LE(centralOffset + 20);
    const fileNameLength = bytes.readUInt16LE(centralOffset + 28);
    const extraLength = bytes.readUInt16LE(centralOffset + 30);
    const commentLength = bytes.readUInt16LE(centralOffset + 32);
    const localOffset = bytes.readUInt32LE(centralOffset + 42);
    const name = bytes.subarray(centralOffset + 46, centralOffset + 46 + fileNameLength).toString('utf8');

    if (name === entryName) {
      if (bytes.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`Invalid ZIP entry: ${entryName}`);
      const localNameLength = bytes.readUInt16LE(localOffset + 26);
      const localExtraLength = bytes.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.subarray(start, start + compressedSize);
      const output = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
      if (!output) throw new Error(`Unsupported ZIP compression method ${method}`);
      const text = output.toString('utf8').replace(/^\uFEFF/, '');
      cache.set(cacheKey, text);
      return text;
    }
    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }
  throw new Error(`ZIP entry not found: ${entryName}`);
}

function readJson<T>(zipFile: keyof typeof ZIP_FILES, entryName: string): T {
  const cacheKey = `json:${zipFile}:${entryName}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached as T;
  const value = JSON.parse(readZipEntry(zipFile, entryName)) as T;
  cache.set(cacheKey, value as unknown);
  return value;
}

export function getSupplierCatalog(): SupplierCatalog {
  return readJson('supplier', 'AgriSense_Tier2_Mock_Supplier_Catalog.json');
}

export function getCurrentPriceSnapshot(): CurrentPriceSnapshot[] {
  return readJson('market', 'AgriSense_Tier2_DAM_Current_Price_Snapshot_2026-07-24.json');
}

export function getMarketIntelligenceRules(): MarketIntelligenceRules {
  return readJson('market', 'AgriSense_Tier2_Market_Intelligence_Rules.json');
}
