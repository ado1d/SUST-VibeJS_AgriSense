-- AgriSense AI Tier 1 persistent-memory schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS farmers (
    farmer_id TEXT PRIMARY KEY,
    display_name TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'bn',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS farms (
    farm_id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL,
    district TEXT NOT NULL,
    upazila TEXT,
    latitude REAL,
    longitude REAL,
    farm_size REAL NOT NULL,
    farm_size_unit TEXT NOT NULL,
    soil_type TEXT,
    soil_ph REAL,
    salinity_ds_m REAL,
    irrigation_availability TEXT,
    budget_bdt REAL,
    FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id)
);

CREATE TABLE IF NOT EXISTS conversations (
    conversation_id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    last_message_at TEXT NOT NULL,
    summary TEXT,
    FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id)
);

CREATE TABLE IF NOT EXISTS conversation_messages (
    message_id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user','assistant','tool')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
);

CREATE TABLE IF NOT EXISTS season_plans (
    season_plan_id TEXT PRIMARY KEY,
    farm_id TEXT NOT NULL,
    crop TEXT NOT NULL,
    variety TEXT,
    season TEXT,
    sowing_date TEXT,
    expected_harvest_date TEXT,
    current_growth_stage TEXT,
    plan_status TEXT NOT NULL DEFAULT 'active',
    baseline_budget_bdt REAL,
    expected_yield_value REAL,
    expected_yield_unit TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id)
);

CREATE TABLE IF NOT EXISTS farm_operations (
    operation_id TEXT PRIMARY KEY,
    season_plan_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    planned_date TEXT,
    revised_date TEXT,
    growth_stage TEXT,
    planned_quantity REAL,
    quantity_unit TEXT,
    estimated_cost_bdt REAL,
    operation_status TEXT NOT NULL DEFAULT 'planned',
    source_record_id TEXT,
    reason TEXT,
    FOREIGN KEY (season_plan_id) REFERENCES season_plans(season_plan_id)
);

CREATE TABLE IF NOT EXISTS weather_checks (
    weather_check_id TEXT PRIMARY KEY,
    season_plan_id TEXT NOT NULL,
    checked_at TEXT NOT NULL,
    forecast_start TEXT,
    forecast_end TEXT,
    request_url TEXT,
    raw_response_path TEXT,
    FOREIGN KEY (season_plan_id) REFERENCES season_plans(season_plan_id)
);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id TEXT PRIMARY KEY,
    season_plan_id TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    trigger_rule_id TEXT,
    message_bn TEXT,
    message_en TEXT,
    created_at TEXT NOT NULL,
    acknowledged_at TEXT,
    FOREIGN KEY (season_plan_id) REFERENCES season_plans(season_plan_id)
);

CREATE TABLE IF NOT EXISTS scenario_runs (
    scenario_run_id TEXT PRIMARY KEY,
    season_plan_id TEXT NOT NULL,
    scenario_type TEXT NOT NULL,
    input_json TEXT NOT NULL,
    output_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (season_plan_id) REFERENCES season_plans(season_plan_id)
);
