// --- Static Dataset Imports for Browser & Node compatibility ---
import FERTILIZER_DATA from '../../../AgriSense_Tier1_Verified_Fertilizer_Scheduler.json';
import IRRIGATION_DATA from '../../../AgriSense_Tier1_Verified_Irrigation_Scheduler.json';
import PEST_DATA from '../../../AgriSense_Tier1_Verified_Pest_Disease_Weather_Risks.json';
import WEATHER_RULES from '../../../AgriSense_Tier1_Weather_Trigger_Rules.json';
import SCENARIO_DATA_JSON from '../../../AgriSense_Tier1_Scenario_Simulation_Data.json';

// --- Strongly-typed interfaces for Tier 1 Datasets ---

export interface FertilizerRecord {
  id: string;
  crop: string;
  record_type: string;
  category: string;
  parameter: string;
  value: number;
  unit: string;
  value_type: string;
  context?: string;
  content: string;
  main_source: {
    institution: string;
    title: string;
    url: string;
    locator?: string;
  };
  verification_status: string;
}

export interface IrrigationRecord {
  id: string;
  crop: string;
  record_type?: string;
  category?: string;
  parameter?: string;
  value?: number;
  unit?: string;
  growth_stage?: string;
  content: string;
  main_source: {
    institution: string;
    title: string;
    url: string;
  };
  verification_status: string;
}

export interface PestDiseaseRiskRecord {
  id: string;
  crop: string;
  risk_name: string;
  risk_type: 'Pest' | 'Disease' | string;
  growth_stage: string;
  weather_conditions: {
    temperature_min_c?: number;
    temperature_max_c?: number;
    relative_humidity_min_percent?: number;
    relative_humidity_max_percent?: number;
    rainfall_mm_min?: number;
    soil_condition?: string;
    source_favourable_weather_text?: string;
  };
  content: string;
  preventive_or_nonchemical_action?: string;
  source_reported_treatment?: string;
  treatment_label_validation_required?: boolean;
  main_source: {
    institution: string;
    title: string;
    url: string;
  };
}

export interface WeatherTriggerRule {
  id: string;
  crop: string;
  operation_or_alert: string;
  trigger: {
    growth_stage?: string;
    weather_conditions?: {
      temperature_min_c?: number;
      temperature_max_c?: number;
      relative_humidity_min_percent?: number;
      relative_humidity_max_percent?: number;
      precipitation_sum_min_mm?: number;
      soil_condition?: string;
      source_favourable_weather_text?: string;
    };
    condition?: string;
    threshold?: string;
    required_inputs?: string[];
    formula?: string;
    match_policy?: string;
  };
  recommended_agent_action: string;
  reasoning: string;
  evidence_type: string;
  linked_source_record_id?: string;
}

export interface ScenarioSimulationData {
  verified_baselines: Array<{
    id: string;
    crop_or_system: string;
    metric: string;
    value: number;
    unit: string;
    context?: string;
    main_source: any;
  }>;
  scenario_engine_rules: Array<{
    id: string;
    scenario: string;
    input: string | string[];
    deterministic_update: string[];
    evidence_type: string;
  }>;
}

export function getFertilizerRecords(): FertilizerRecord[] {
  return FERTILIZER_DATA as unknown as FertilizerRecord[];
}

export function getIrrigationRecords(): IrrigationRecord[] {
  return IRRIGATION_DATA as unknown as IrrigationRecord[];
}

export function getPestDiseaseRiskRecords(): PestDiseaseRiskRecord[] {
  return PEST_DATA as unknown as PestDiseaseRiskRecord[];
}

export function getWeatherTriggerRules(): WeatherTriggerRule[] {
  return WEATHER_RULES as unknown as WeatherTriggerRule[];
}

export function getScenarioSimulationData(): ScenarioSimulationData {
  return SCENARIO_DATA_JSON as unknown as ScenarioSimulationData;
}
