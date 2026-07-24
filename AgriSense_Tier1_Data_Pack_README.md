# AgriSense AI Tier 1 Real Data Pack

Generated: 2026-07-24

## Included files

1. `AgriSense_Tier1_Verified_Fertilizer_Scheduler.json`
2. `AgriSense_Tier1_Verified_Irrigation_Scheduler.json`
3. `AgriSense_Tier1_Verified_Pest_Disease_Weather_Risks.json`
4. `AgriSense_Tier1_Weather_Trigger_Rules.json`
5. `AgriSense_Tier1_Scenario_Simulation_Data.json`
6. `AgriSense_Tier1_Persistent_Memory_Schema.sql`
7. `AgriSense_Tier1_Persistent_Memory_Examples.json`
8. `AgriSense_Tier1_Live_Data_Connectors.json`
9. `AgriSense_Tier1_Real_Data_Pack.json`

## Record counts

{
  "fertilizer_scheduler_records": 246,
  "irrigation_scheduler_records": 80,
  "pest_disease_risk_records": 42,
  "weather_trigger_rules": 45,
  "scenario_baseline_records": 56,
  "scenario_engine_rules": 5
}

## What is directly source-extracted?

- Fertilizer quantities and timing from the verified AgriSense source dataset
- Irrigation, crop-water, root-depth, Kc and scheduling records from verified BARI/FAO records
- Pest and disease weather thresholds and growth stages from official BAMIS pages
- Finance and yield baselines from official source-extracted records
- API variable definitions from official Open-Meteo documentation

## What is derived application logic?

- Turning a BAMIS threshold into an agent scouting alert
- Recalculating irrigation using ETc, rainfall and soil-water inputs
- Budget, price, rainfall and sowing-delay scenario arithmetic
- Persistent-memory database design

Derived rules are labelled and do not pretend to be independent agronomic experiments.

## Safety

- Weather risk does not confirm pest or disease presence.
- Chemical treatment information requires current registration and label checking.
- Fertilizer records are context-specific and must be matched by crop, region, variety or cropping system.
- Missing crop-response factors must be reported as unknown rather than invented.
