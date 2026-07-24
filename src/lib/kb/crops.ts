// AgriSense AI — Knowledge Base
// Curated from public Bangladesh agricultural sources:
//   - BARC Fertilizer Recommendation Guide (barc.gov.bd)
//   - DAE Crop Calendars (dae.gov.bd)
//   - BBS Yearbook of Agricultural Statistics (bbs.gov.bd)
//   - BINA variety recommendations (bina.gov.bd)
//   - Bangladesh Meteorological Department normals
//
// All numbers are representative public-guideline values for Bangladesh
// smallholder conditions. Where a range exists in the source, the midpoint
// is used and noted in `notes`.

export type Season = 'aus' | 'aman' | 'boro' | 'rabi' | 'kharif-1' | 'kharif-2';

export interface CropRecord {
  id: string;
  name: string;          // common English name
  bnName: string;        // Bengali name
  scientificName: string;
  seasons: Season[];     // which Bangladesh seasons it can be grown in
  durationDays: number;  // total crop duration from sowing to harvest
  growthStages: { name: string; dayRange: [number, number]; keyActions: string[] }[];
  waterNeedMm: number;           // total seasonal water requirement (mm)
  waterSourcePreference: string[]; // preferred water sources in priority order
  suitableSoils: string[];       // sandy | loamy | clay | saline | silty
  rainfallTolerance: 'low' | 'medium' | 'high';
  fertilizerKgPerAcre: { npk15_15_15?: number; urea?: number; tsp?: number; mop?: number; gypsum?: number; zinc?: number; boron?: number };
  typicalYieldPerAcre: { min: number; max: number; unit: string }; // unit: maund or kg
  typicalPricePerUnit: { min: number; max: number; unit: string; currency: 'BDT' };
  majorPests: string[];
  majorDiseases: string[];
  riskLevel: 'low' | 'medium' | 'high';
  riskNotes: string;
  notes: string;
  source: string;
}

export const CROPS: CropRecord[] = [
  {
    id: 'rice-boro',
    name: 'Rice (Boro)',
    bnName: 'ধান (বোরো)',
    scientificName: 'Oryza sativa',
    seasons: ['boro'],
    durationDays: 150,
    growthStages: [
      { name: 'Nursery', dayRange: [0, 30], keyActions: ['Seed treatment', 'Nursery bed preparation', 'Irrigation'] },
      { name: 'Land preparation', dayRange: [25, 40], keyActions: ['Ploughing', 'Puddling', 'Apply basal fertilizer'] },
      { name: 'Transplanting', dayRange: [30, 45], keyActions: ['Transplant 25-30 day old seedlings', '2-3 seedlings per hill'] },
      { name: 'Vegetative', dayRange: [45, 90], keyActions: ['Top dress urea in 2 splits', 'Weed control', 'Irrigation every 5-7 days'] },
      { name: 'Panicle initiation', dayRange: [90, 110], keyActions: ['Final urea top dress', 'Monitor stem borer'] },
      { name: 'Flowering', dayRange: [110, 125], keyActions: ['Maintain water', 'Watch for blast disease'] },
      { name: 'Grain filling', dayRange: [125, 145], keyActions: ['Reduce water', 'Bird scaring'] },
      { name: 'Harvest', dayRange: [145, 150], keyActions: ['Harvest when 80-85% grains golden yellow'] },
    ],
    waterNeedMm: 1200,
    waterSourcePreference: ['tubewell', 'canal', 'river', 'pond'],
    suitableSoils: ['loamy', 'clay', 'silty'],
    rainfallTolerance: 'low',
    fertilizerKgPerAcre: { npk15_15_15: 65, urea: 110, tsp: 40, mop: 30, gypsum: 8, zinc: 2 },
    typicalYieldPerAcre: { min: 80, max: 100, unit: 'maund' },
    typicalPricePerUnit: { min: 1100, max: 1500, unit: 'maund', currency: 'BDT' },
    majorPests: ['Stem borer', 'Brown planthopper', 'Rice hispa', 'Rice bug'],
    majorDiseases: ['Blast', 'Sheath blight', 'Bacterial leaf blight', 'Tungro'],
    riskLevel: 'medium',
    riskNotes: 'High water and input cost; vulnerable to terminal heat if transplanting is delayed past February.',
    notes: 'Highest yielding season due to irrigation control and solar radiation. Hybrid varieties (e.g. BRRI dhan89) reach 110+ maund/acre.',
    source: 'BARC FRG 2018; BRRI Adhunik Dhaner Chash (2023)',
  },
  {
    id: 'rice-aman',
    name: 'Rice (Aman)',
    bnName: 'ধান (আমন)',
    scientificName: 'Oryza sativa',
    seasons: ['aman'],
    durationDays: 135,
    growthStages: [
      { name: 'Nursery', dayRange: [0, 30], keyActions: ['Seed treatment', 'Nursery bed preparation'] },
      { name: 'Land preparation', dayRange: [25, 40], keyActions: ['Ploughing', 'Puddling', 'Basal fertilizer'] },
      { name: 'Transplanting', dayRange: [30, 45], keyActions: ['Transplant 25-30 day seedlings'] },
      { name: 'Vegetative', dayRange: [45, 85], keyActions: ['Top dress urea', 'Weed control', 'Monitor rainfall'] },
      { name: 'Panicle initiation', dayRange: [85, 105], keyActions: ['Final top dress', 'Stem borer watch'] },
      { name: 'Flowering', dayRange: [105, 120], keyActions: ['Drain if heavy rain forecast', 'Blast watch'] },
      { name: 'Harvest', dayRange: [120, 135], keyActions: ['Harvest before late-season rain'] },
    ],
    waterNeedMm: 700,
    waterSourcePreference: ['rainfed', 'tubewell', 'canal'],
    suitableSoils: ['loamy', 'clay', 'silty'],
    rainfallTolerance: 'high',
    fertilizerKgPerAcre: { npk15_15_15: 50, urea: 85, tsp: 30, mop: 25, gypsum: 6 },
    typicalYieldPerAcre: { min: 55, max: 75, unit: 'maund' },
    typicalPricePerUnit: { min: 1100, max: 1450, unit: 'maund', currency: 'BDT' },
    majorPests: ['Stem borer', 'Brown planthopper', 'Gall midge'],
    majorDiseases: ['Blast', 'Sheath blight', 'Brown spot'],
    riskLevel: 'medium',
    riskNotes: 'Depends on monsoon; drought at panicle initiation causes yield loss. Late transplanting increases pest risk.',
    notes: 'Transplanted Aman (T. Aman) covers ~6 million ha. BRRI dhan49, 75, 90 are popular medium-duration varieties.',
    source: 'BARC FRG 2018; BRRI Adhunik Dhaner Chash (2023)',
  },
  {
    id: 'rice-aus',
    name: 'Rice (Aus)',
    bnName: 'ধান (আউস)',
    scientificName: 'Oryza sativa',
    seasons: ['aus'],
    durationDays: 105,
    growthStages: [
      { name: 'Sowing', dayRange: [0, 10], keyActions: ['Direct seeded rice (DSR)', 'Seed treatment'] },
      { name: 'Vegetative', dayRange: [10, 60], keyActions: ['Weed control (critical)', 'Top dress urea'] },
      { name: 'Panicle initiation', dayRange: [60, 75], keyActions: ['Final top dress', 'Stem borer watch'] },
      { name: 'Flowering', dayRange: [75, 90], keyActions: ['Supplemental irrigation if dry'] },
      { name: 'Harvest', dayRange: [90, 105], keyActions: ['Harvest before Aman planting'] },
    ],
    waterNeedMm: 500,
    waterSourcePreference: ['rainfed', 'tubewell'],
    suitableSoils: ['loamy', 'clay', 'silty'],
    rainfallTolerance: 'medium',
    fertilizerKgPerAcre: { npk15_15_15: 40, urea: 65, tsp: 25, mop: 20 },
    typicalYieldPerAcre: { min: 35, max: 55, unit: 'maund' },
    typicalPricePerUnit: { min: 1150, max: 1500, unit: 'maund', currency: 'BDT' },
    majorPests: ['Stem borer', 'Rice bug'],
    majorDiseases: ['Blast', 'Brown spot'],
    riskLevel: 'high',
    riskNotes: 'Lowest yield among rice seasons; area is shrinking. Best as a quick rotation crop before Aman.',
    notes: 'BRRI dhan43, 65 are short-duration Aus varieties. Mostly direct-seeded.',
    source: 'BARC FRG 2018; BRRI Adhunik Dhaner Chash (2023)',
  },
  {
    id: 'wheat',
    name: 'Wheat',
    bnName: 'গম',
    scientificName: 'Triticum aestivum',
    seasons: ['rabi'],
    durationDays: 110,
    growthStages: [
      { name: 'Sowing', dayRange: [0, 7], keyActions: ['Seed treatment with Vitavax', 'Line sowing 20cm spacing'] },
      { name: 'Crown root initiation', dayRange: [15, 25], keyActions: ['First irrigation', 'Top dress urea'] },
      { name: 'Tillering', dayRange: [25, 55], keyActions: ['Weed control', 'Second urea top dress'] },
      { name: 'Boot stage', dayRange: [55, 75], keyActions: ['Second irrigation'] },
      { name: 'Flowering', dayRange: [75, 90], keyActions: ['Monitor aphids'] },
      { name: 'Grain filling', dayRange: [90, 105], keyActions: ['Third irrigation if dry'] },
      { name: 'Harvest', dayRange: [105, 110], keyActions: ['Harvest when grains hard'] },
    ],
    waterNeedMm: 350,
    waterSourcePreference: ['tubewell', 'canal', 'rainfed'],
    suitableSoils: ['loamy', 'silty', 'clay'],
    rainfallTolerance: 'low',
    fertilizerKgPerAcre: { npk15_15_15: 60, urea: 90, tsp: 50, mop: 30, gypsum: 10 },
    typicalYieldPerAcre: { min: 50, max: 70, unit: 'maund' },
    typicalPricePerUnit: { min: 1100, max: 1450, unit: 'maund', currency: 'BDT' },
    majorPests: ['Aphid', 'Termites'],
    majorDiseases: ['Leaf blight', 'Leaf rust', 'Bipolaris leaf spot'],
    riskLevel: 'medium',
    riskNotes: 'Sensitive to high temperature at grain filling (>30°C). Sow by Nov 30 for best yield.',
    notes: 'Sow Nov 15–30. BARI Gom 33 (zinc-biofortified), 34, 36 are recommended varieties.',
    source: 'BARI Wheat Cultivation Guide (2022); BARC FRG 2018',
  },
  {
    id: 'maize',
    name: 'Maize',
    bnName: 'ভুট্টা',
    scientificName: 'Zea mays',
    seasons: ['rabi', 'kharif-1'],
    durationDays: 120,
    growthStages: [
      { name: 'Sowing', dayRange: [0, 7], keyActions: ['Seed treatment', 'Line sowing 60x20cm'] },
      { name: 'Vegetative', dayRange: [7, 50], keyActions: ['Thinning', 'Weed control', 'First urea top dress'] },
      { name: 'Tasseling', dayRange: [50, 70], keyActions: ['Second urea top dress', 'Irrigation'] },
      { name: 'Silking', dayRange: [70, 85], keyActions: ['Critical irrigation', 'Stem borer watch'] },
      { name: 'Grain filling', dayRange: [85, 110], keyActions: ['Maintain moisture'] },
      { name: 'Harvest', dayRange: [110, 120], keyActions: ['Harvest when black layer forms'] },
    ],
    waterNeedMm: 500,
    waterSourcePreference: ['tubewell', 'canal', 'rainfed'],
    suitableSoils: ['loamy', 'silty', 'clay'],
    rainfallTolerance: 'medium',
    fertilizerKgPerAcre: { npk15_15_15: 80, urea: 150, tsp: 60, mop: 40, gypsum: 12, zinc: 3 },
    typicalYieldPerAcre: { min: 90, max: 130, unit: 'maund' },
    typicalPricePerUnit: { min: 750, max: 950, unit: 'maund', currency: 'BDT' },
    majorPests: ['Stem borer', 'Fall armyworm', 'Aphid'],
    majorDiseases: ['Banded leaf sheath blight', 'Turcicum leaf blight'],
    riskLevel: 'medium',
    riskNotes: 'Fall armyworm is a serious threat since 2018; monitor weekly from seedling stage.',
    notes: 'High-profit cash crop. BARI Hybrid Maize 9, 13 popular. Poultry feed demand drives price.',
    source: 'BARI Maize Production Manual (2022); BARC FRG 2018',
  },
  {
    id: 'potato',
    name: 'Potato',
    bnName: 'আলু',
    scientificName: 'Solanum tuberosum',
    seasons: ['rabi'],
    durationDays: 95,
    growthStages: [
      { name: 'Planting', dayRange: [0, 7], keyActions: ['Seed tuber treatment', 'Plant 60x20cm', 'Basal fertilizer'] },
      { name: 'Emergence', dayRange: [10, 25], keyActions: ['Earthing up', 'First irrigation'] },
      { name: 'Tuber initiation', dayRange: [30, 50], keyActions: ['Second irrigation', 'Top dress urea', 'Late blight watch'] },
      { name: 'Tuber bulking', dayRange: [50, 80], keyActions: ['Maintain moisture', '3rd irrigation', 'Aphid control'] },
      { name: 'Vine killing', dayRange: [80, 90], keyActions: ['Stop irrigation'] },
      { name: 'Harvest', dayRange: [90, 95], keyActions: ['Harvest when skin set', 'Cure in shade'] },
    ],
    waterNeedMm: 400,
    waterSourcePreference: ['tubewell', 'canal', 'sprinkler'],
    suitableSoils: ['loamy', 'sandy', 'silty'],
    rainfallTolerance: 'low',
    fertilizerKgPerAcre: { npk15_15_15: 120, urea: 90, tsp: 80, mop: 60, gypsum: 12, zinc: 4 },
    typicalYieldPerAcre: { min: 250, max: 350, unit: 'maund' },
    typicalPricePerUnit: { min: 350, max: 700, unit: 'maund', currency: 'BDT' },
    majorPests: ['Aphid', 'Potato tuber moth', 'Cutworm'],
    majorDiseases: ['Late blight', 'Early blight', 'Black scurf', 'Viral diseases'],
    riskLevel: 'high',
    riskNotes: 'Late blight can destroy a crop in 5 days under fog + cool nights (15-20°C). Price volatility is extreme.',
    notes: 'Munshiganj, Bogura, Dinajpur are major belts. Cardinal, Diamond, BARI Alu-7 (Diamant), 25, 28 popular.',
    source: 'BARI Potato Cultivation Guide (2023); BARC FRG 2018',
  },
  {
    id: 'mustard',
    name: 'Mustard',
    bnName: 'সরিষা',
    scientificName: 'Brassica juncea',
    seasons: ['rabi'],
    durationDays: 85,
    growthStages: [
      { name: 'Sowing', dayRange: [0, 5], keyActions: ['Line sowing 30cm', 'Seed treatment'] },
      { name: 'Rosette', dayRange: [10, 35], keyActions: ['Thinning', 'Weed control', 'First urea top dress'] },
      { name: 'Bolting', dayRange: [35, 55], keyActions: ['Second urea top dress', 'Irrigation'] },
      { name: 'Flowering', dayRange: [55, 70], keyActions: ['Pollination (place beehives)', 'Aphid watch'] },
      { name: 'Pod formation', dayRange: [70, 80], keyActions: ['Maintain moisture'] },
      { name: 'Harvest', dayRange: [80, 85], keyActions: ['Harvest when pods turn yellow-brown'] },
    ],
    waterNeedMm: 200,
    waterSourcePreference: ['rainfed', 'tubewell', 'canal'],
    suitableSoils: ['loamy', 'silty', 'clay'],
    rainfallTolerance: 'low',
    fertilizerKgPerAcre: { npk15_15_15: 50, urea: 70, tsp: 40, mop: 25, boron: 1.5 },
    typicalYieldPerAcre: { min: 25, max: 40, unit: 'maund' },
    typicalPricePerUnit: { min: 2200, max: 3200, unit: 'maund', currency: 'BDT' },
    majorPests: ['Aphid', 'Mustard sawfly'],
    majorDiseases: ['Alternaria blight', 'White rust', 'Powdery mildew'],
    riskLevel: 'low',
    riskNotes: 'Short duration, low water, fits between two rice crops. Avoid waterlogging at seedling stage.',
    notes: 'BARI Sarisha-14, 15, 16 popular. Sow by Nov 15 for best yield. High oil content varieties preferred.',
    source: 'BARI Oilseed Cultivation Guide (2022); BARC FRG 2018',
  },
  {
    id: 'lentil',
    name: 'Lentil (Masur)',
    bnName: 'মসুর ডাল',
    scientificName: 'Lens culinaris',
    seasons: ['rabi'],
    durationDays: 100,
    growthStages: [
      { name: 'Sowing', dayRange: [0, 7], keyActions: ['Seed treatment with Rhizobium', 'Line sowing 30cm'] },
      { name: 'Vegetative', dayRange: [10, 45], keyActions: ['Weed control', 'Stemphylium blight watch'] },
      { name: 'Flowering', dayRange: [45, 65], keyActions: ['Irrigation if dry', 'Monitor aphids'] },
      { name: 'Pod filling', dayRange: [65, 90], keyActions: ['Pod borer watch'] },
      { name: 'Harvest', dayRange: [90, 100], keyActions: ['Harvest when lower pods brown'] },
    ],
    waterNeedMm: 150,
    waterSourcePreference: ['rainfed', 'tubewell'],
    suitableSoils: ['loamy', 'silty', 'clay'],
    rainfallTolerance: 'low',
    fertilizerKgPerAcre: { npk15_15_15: 30, tsp: 30, mop: 20, boron: 1 },
    typicalYieldPerAcre: { min: 18, max: 28, unit: 'maund' },
    typicalPricePerUnit: { min: 3500, max: 5000, unit: 'maund', currency: 'BDT' },
    majorPests: ['Aphid', 'Pod borer'],
    majorDiseases: ['Stemphylium blight', 'Rust', 'Wilt'],
    riskLevel: 'medium',
    riskNotes: 'Stemphylium blight can be devastating in foggy weather. Rust in warm humid spells.',
    notes: 'BARI Masur-7, 8, 9 recommended. Pulses fix atmospheric N (~60 kg/acre) reducing fertilizer need.',
    source: 'BARI Pulse Crop Manual (2022); BARC FRG 2018',
  },
  {
    id: 'jute',
    name: 'Jute',
    bnName: 'পাট',
    scientificName: 'Corchorus spp.',
    seasons: ['kharif-1'],
    durationDays: 120,
    growthStages: [
      { name: 'Sowing', dayRange: [0, 7], keyActions: ['Seed treatment', 'Broadcast or line sow'] },
      { name: 'Thinning', dayRange: [15, 30], keyActions: ['Thin to 10cm spacing', 'Weed control'] },
      { name: 'Vegetative', dayRange: [30, 80], keyActions: ['Top dress urea', 'Irrigation if dry spell'] },
      { name: 'Flowering', dayRange: [80, 100], keyActions: ['Monitor semilooper', 'Mite'] },
      { name: 'Harvest', dayRange: [100, 120], keyActions: ['Harvest at small-pod stage for best fiber'] },
      { name: 'Retting', dayRange: [120, 130], keyActions: ['Ret in clean water 12-18 days'] },
    ],
    waterNeedMm: 600,
    waterSourcePreference: ['rainfed', 'river', 'pond'],
    suitableSoils: ['loamy', 'silty', 'clay'],
    rainfallTolerance: 'high',
    fertilizerKgPerAcre: { npk15_15_15: 50, urea: 60, tsp: 30, mop: 20 },
    typicalYieldPerAcre: { min: 35, max: 50, unit: 'maund' },
    typicalPricePerUnit: { min: 1800, max: 2800, unit: 'maund', currency: 'BDT' },
    majorPests: ['Semilooper', 'Jute hairy caterpillar', 'Mite', 'Stem girdler'],
    majorDiseases: ['Anthracnose', 'Black band', 'Stem rot'],
    riskLevel: 'medium',
    riskNotes: 'Retting water quality determines fiber grade. Low rainfall hurts retting; flood damages crop.',
    notes: 'Tossa (Corchorus olitorius) var. O-9897, O-7950 are common. Sow by Apr 15. Retting uses significant water.',
    source: 'BJRI Jute Cultivation Manual (2023); BARC FRG 2018',
  },
  {
    id: 'tomato',
    name: 'Tomato',
    bnName: 'টমেটো',
    scientificName: 'Solanum lycopersicum',
    seasons: ['rabi'],
    durationDays: 110,
    growthStages: [
      { name: 'Nursery', dayRange: [0, 25], keyActions: ['Seedling in seedbed'] },
      { name: 'Transplanting', dayRange: [25, 35], keyActions: ['Transplant 25-day seedlings 60x40cm', 'Basal fertilizer'] },
      { name: 'Vegetative', dayRange: [35, 60], keyActions: ['Staking', 'First urea top dress', 'Irrigation'] },
      { name: 'Flowering', dayRange: [60, 80], keyActions: ['Fruit borer watch', '2nd urea top dress', 'Maintain moisture'] },
      { name: 'Fruit set', dayRange: [80, 100], keyActions: ['Late blight watch in cool fog', 'Harvest mature green'] },
      { name: 'Harvest', dayRange: [80, 110], keyActions: ['Harvest at breaker stage for long-distance transport'] },
    ],
    waterNeedMm: 450,
    waterSourcePreference: ['tubewell', 'canal', 'drip'],
    suitableSoils: ['loamy', 'sandy', 'silty'],
    rainfallTolerance: 'low',
    fertilizerKgPerAcre: { npk15_15_15: 100, urea: 110, tsp: 80, mop: 50, gypsum: 15, boron: 1.5 },
    typicalYieldPerAcre: { min: 400, max: 600, unit: 'maund' },
    typicalPricePerUnit: { min: 400, max: 1200, unit: 'maund', currency: 'BDT' },
    majorPests: ['Fruit borer', 'Whitefly', 'Aphid', 'Mite'],
    majorDiseases: ['Late blight', 'Early blight', 'Tomato leaf curl virus (Begomovirus)', 'Bacterial wilt'],
    riskLevel: 'high',
    riskNotes: 'Price collapses during peak winter harvest; off-season (summer) tomato commands 3-5x price.',
    notes: 'BARI Tomato-14, 15, 16 popular. Summer tomato (hybrid) can be grown Mar–Jun with higher risk and higher return.',
    source: 'BARI Vegetable Cultivation Guide (2023); BARC FRG 2018',
  },
  {
    id: 'brinjal',
    name: 'Brinjal (Eggplant)',
    bnName: 'বেগুন',
    scientificName: 'Solanum melongena',
    seasons: ['rabi', 'kharif-1', 'kharif-2'],
    durationDays: 130,
    growthStages: [
      { name: 'Nursery', dayRange: [0, 30], keyActions: ['Seedling raising'] },
      { name: 'Transplanting', dayRange: [30, 40], keyActions: ['Transplant 75x60cm', 'Basal fertilizer'] },
      { name: 'Vegetative', dayRange: [40, 70], keyActions: ['Top dress urea', 'Irrigation', 'Staking'] },
      { name: 'Flowering', dayRange: [60, 90], keyActions: ['Fruit borer control (Bt sprays)', 'Maintain moisture'] },
      { name: 'Harvest', dayRange: [70, 130], keyActions: ['Harvest fruits at marketable size every 3-5 days'] },
    ],
    waterNeedMm: 500,
    waterSourcePreference: ['tubewell', 'canal', 'pond'],
    suitableSoils: ['loamy', 'silty', 'clay'],
    rainfallTolerance: 'medium',
    fertilizerKgPerAcre: { npk15_15_15: 110, urea: 130, tsp: 70, mop: 50, gypsum: 12 },
    typicalYieldPerAcre: { min: 300, max: 500, unit: 'maund' },
    typicalPricePerUnit: { min: 500, max: 1500, unit: 'maund', currency: 'BDT' },
    majorPests: ['Brinjal shoot and fruit borer (BSFB)', 'Jassid', 'Epilachna beetle'],
    majorDiseases: ['Phomopsis blight', 'Little leaf (phytoplasma)', 'Damping off'],
    riskLevel: 'high',
    riskNotes: 'BSFB is the most damaging pest; weekly monitoring and IPM (pheromone traps, Bt sprays) essential.',
    notes: 'Year-round crop. BARI Begun-5, 8, 10 popular. Bt brinjal (4 varieties) offers built-in BSFB resistance.',
    source: 'BARI Vegetable Cultivation Guide (2023); BARC FRG 2018',
  },
  {
    id: 'chili',
    name: 'Chili (Dry)',
    bnName: 'শুকনা মরিচ',
    scientificName: 'Capsicum annuum',
    seasons: ['rabi'],
    durationDays: 140,
    growthStages: [
      { name: 'Nursery', dayRange: [0, 35], keyActions: ['Seedling in raised bed'] },
      { name: 'Transplanting', dayRange: [35, 45], keyActions: ['Transplant 60x45cm', 'Basal fertilizer'] },
      { name: 'Vegetative', dayRange: [45, 75], keyActions: ['Top dress urea', 'Irrigation', 'Weed control'] },
      { name: 'Flowering', dayRange: [70, 100], keyActions: ['Maintain moisture', 'Thrips/mites watch'] },
      { name: 'Fruit set', dayRange: [85, 130], keyActions: ['Multiple harvests', 'Sun-dry on clean surface'] },
      { name: 'Harvest', dayRange: [90, 140], keyActions: ['Pick red fruits every 5-7 days'] },
    ],
    waterNeedMm: 450,
    waterSourcePreference: ['tubewell', 'rainfed'],
    suitableSoils: ['loamy', 'sandy', 'silty'],
    rainfallTolerance: 'low',
    fertilizerKgPerAcre: { npk15_15_15: 90, urea: 100, tsp: 60, mop: 50, gypsum: 10, boron: 1 },
    typicalYieldPerAcre: { min: 30, max: 50, unit: 'maund' },
    typicalPricePerUnit: { min: 2500, max: 4500, unit: 'maund', currency: 'BDT' },
    majorPests: ['Thrips', 'Mite', 'Aphid', 'Fruit borer'],
    majorDiseases: ['Powdery mildew', 'Anthracnose', 'Cercospora leaf spot', 'Chilli leaf curl virus'],
    riskLevel: 'high',
    riskNotes: 'Leaf curl virus (whitefly-vectored) is widespread; use reflective mulch and imidacloprid seedling dip.',
    notes: 'BINDU, BARI Morich-1, 2 popular. High value but labour-intensive harvesting.',
    source: 'BARI Spice Crop Manual (2022); BARC FRG 2018',
  },
];

export interface SoilRecord {
  type: string;
  description: string;
  waterRetention: 'low' | 'medium' | 'high';
  fertility: 'low' | 'medium' | 'high';
  drainage: 'poor' | 'moderate' | 'good' | 'excessive';
  bestCrops: string[];
  amendmentTips: string[];
}

export const SOILS: SoilRecord[] = [
  {
    type: 'sandy',
    description: 'Coarse texture, >70% sand. Drains fast, low water and nutrient holding capacity. Common in chars and coastal belts.',
    waterRetention: 'low',
    fertility: 'low',
    drainage: 'excessive',
    bestCrops: ['potato', 'tomato', 'chili', 'groundnut', 'watermelon'],
    amendmentTips: ['Add 2-3 t/acre farmyard manure or compost', 'Apply fertilizer in 3-4 splits (leaching risk)', 'Use mulch to conserve moisture', 'Drip irrigation highly efficient'],
  },
  {
    type: 'loamy',
    description: 'Balanced sand-silt-clay (~40-40-20). Ideal agricultural soil — good drainage, water retention, and fertility.',
    waterRetention: 'medium',
    fertility: 'high',
    drainage: 'good',
    bestCrops: ['rice-aman', 'rice-boro', 'wheat', 'maize', 'mustard', 'lentil', 'potato', 'tomato', 'brinjal', 'jute'],
    amendmentTips: ['Maintain organic matter with crop residue', 'Standard fertilizer rates apply', 'Suitable for almost all Bangladesh crops', 'Practice crop rotation to sustain fertility'],
  },
  {
    type: 'clay',
    description: 'Fine texture, >40% clay. High water retention, slow drainage. Common in low-lying areas and Aman rice lands.',
    waterRetention: 'high',
    fertility: 'high',
    drainage: 'poor',
    bestCrops: ['rice-aman', 'rice-boro', 'rice-aus', 'wheat', 'mustard', 'jute'],
    amendmentTips: ['Plough when moisture is moderate (avoid puddling)', 'Add gypsum 8-10 kg/acre to improve structure', 'Use raised beds for vegetables', 'Adequate drainage essential for non-rice crops'],
  },
  {
    type: 'saline',
    description: 'High salt content, common in coastal Khulna, Bagerhat, Satkhira, Patuakhali. Limits most crops except salt-tolerant varieties.',
    waterRetention: 'low',
    fertility: 'low',
    drainage: 'moderate',
    bestCrops: ['rice-aman (BRRI dhan73, 76, 91 salt-tolerant)', 'sunflower', 'sesame', 'watermelon'],
    amendmentTips: ['Flush with fresh water when available', 'Apply gypsum 15-20 kg/acre', 'Use salt-tolerant varieties (BRRI dhan73 for Aman)', 'Avoid Boro rice unless fresh water is plentiful'],
  },
  {
    type: 'silty',
    description: 'Silt-dominant, common in floodplains of Jamuna, Padma, Teesta. Productive when drained; prone to crusting.',
    waterRetention: 'medium',
    fertility: 'high',
    drainage: 'moderate',
    bestCrops: ['wheat', 'maize', 'potato', 'mustard', 'lentil', 'jute', 'rice-aman'],
    amendmentTips: ['Avoid over-tillage (erosion risk)', 'Maintain residue cover', 'Apply organic matter to reduce crusting', 'Light irrigation preferred'],
  },
];

export interface SeasonRecord {
  id: Season;
  bnName: string;
  sowingWindow: string;
  harvestWindow: string;
  rainfallPattern: string;
  description: string;
}

export const SEASONS: SeasonRecord[] = [
  { id: 'aus', bnName: 'আউস', sowingWindow: 'Apr 1 – May 15', harvestWindow: 'Jul 15 – Aug 15', rainfallPattern: 'Pre-monsoon showers, hot humid', description: 'Pre-monsoon rice. Mostly direct-seeded. ~0.8M ha. Declining area.' },
  { id: 'aman', bnName: 'আমন', sowingWindow: 'Jul 1 – Aug 15 (nursery); transplanting Aug 1 – Sep 15', harvestWindow: 'Nov 15 – Dec 31', rainfallPattern: 'Monsoon (Jun–Sep), 1500–2500 mm', description: 'Monsoon rice. ~6M ha. Rain-fed mostly. Largest single-season area.' },
  { id: 'boro', bnName: 'বোরো', sowingWindow: 'Dec 15 – Jan 31 (nursery); transplanting Jan 15 – Feb 28', harvestWindow: 'Apr 15 – May 31', rainfallPattern: 'Dry season, <200 mm; irrigated', description: 'Irrigated dry-season rice. ~4.7M ha. Highest yields but heavy water use.' },
  { id: 'rabi', bnName: 'রবি', sowingWindow: 'Nov 1 – Dec 15', harvestWindow: 'Feb 15 – Apr 15', rainfallPattern: 'Dry, cool; 50–150 mm', description: 'Winter crops: wheat, potato, mustard, lentil, tomato, maize.' },
  { id: 'kharif-1', bnName: 'খরিপ-১', sowingWindow: 'Mar 15 – Jun 30', harvestWindow: 'Jun 15 – Sep 30', rainfallPattern: 'Pre-monsoon + early monsoon; 800–1500 mm', description: 'Summer crops: jute, Aus rice, mungbean, summer vegetables.' },
  { id: 'kharif-2', bnName: 'খরিপ-২', sowingWindow: 'Jul 15 – Sep 30', harvestWindow: 'Oct 15 – Dec 15', rainfallPattern: 'Late monsoon; 600–1200 mm', description: 'Late monsoon crops: T. Aman (short duration), short-duration vegetables, sesame.' },
];

// Cost reference — current Bangladesh market rates (2024–25)
export const INPUT_COSTS = {
  ureaPerKg: 16,            // govt-subsidized
  tspPerKg: 27,
  mopPerKg: 25,
  npk15PerKg: 32,
  gypsumPerKg: 12,
  zincPerKg: 220,
  boronPerKg: 280,
  dieselPerLitre: 90,
  labourPerDay: 600,        // average male agricultural labour
  irrigationPerApplication: 1200, // per acre per event
  seedRicePerKg: 50,
  seedWheatPerKg: 55,
  seedMaizePerKg: 280,
  seedPotatoPerKg: 60,
  seedMustardPerKg: 280,
  seedLentilPerKg: 110,
  seedJutePerKg: 350,
  seedTomatoPer10g: 80,
  seedBrinjalPer10g: 80,
  seedChiliPer10g: 120,
};

// Conversion helpers
export const MAUND_TO_KG = 37.3242;     // 1 maund = 37.3242 kg
export const ACRE_TO_DECIMAL = 100;      // 1 acre = 100 decimal
