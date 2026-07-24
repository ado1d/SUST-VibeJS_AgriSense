'use client';

import React, { useState, useEffect } from 'react';
import { simulateScenario } from '@/lib/agent/tools/tier1_tools';

interface RecommendedCrop {
  cropId: string;
  cropName: string;
  bnName: string;
  [key: string]: any;
}

interface ScenarioSimulatorProps {
  language?: 'en' | 'bn';
  recommendedCrops?: RecommendedCrop[] | null;
}

// Fallback crops used only when no recommendations are available
const FALLBACK_CROPS = [
  { cropId: 'potato', nameEn: 'Potato (গোল আলু)', nameBn: 'গোল আলু' },
  { cropId: 'tomato', nameEn: 'Tomato (টমেটো)', nameBn: 'টমেটো' },
  { cropId: 'maize', nameEn: 'Maize (ভুট্টা)', nameBn: 'ভুট্টা' },
  { cropId: 'rice-aman', nameEn: 'T. Aman Rice (আমন ধান)', nameBn: 'টি. আমন ধান' },
  { cropId: 'wheat', nameEn: 'Wheat (গম — BARI Gom-28)', nameBn: 'গম — BARI Gom-28' },
  { cropId: 'mustard', nameEn: 'Mustard (সরিষা)', nameBn: 'সরিষা' },
];

export function ScenarioSimulator({ language = 'en', recommendedCrops }: ScenarioSimulatorProps) {
  // Build dropdown options from recommended crops, or use fallback
  const cropOptions = recommendedCrops && recommendedCrops.length > 0
    ? recommendedCrops.map(c => ({
        cropId: c.cropId,
        nameEn: `${c.cropName} (${c.bnName})`,
        nameBn: c.bnName,
      }))
    : FALLBACK_CROPS;

  const [cropId, setCropId] = useState(cropOptions[0]?.cropId || 'potato');
  const [farmSizeDecimal, setFarmSizeDecimal] = useState(100);
  const [scenarioType, setScenarioType] = useState<'budget_cut_percent' | 'rainfall_change_percent' | 'selling_price_change_percent' | 'input_price_change_percent' | 'sowing_delay_days'>('budget_cut_percent');
  const [changeValue, setChangeValue] = useState(30);

  // When recommended crops change, reset selection to the first recommended crop
  useEffect(() => {
    if (cropOptions.length > 0 && !cropOptions.find(c => c.cropId === cropId)) {
      setCropId(cropOptions[0].cropId);
    }
  }, [recommendedCrops]);

  const result = simulateScenario({
    cropId,
    farmSizeDecimal,
    scenarioType,
    changeValue,
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/20">
            {language === 'bn' ? 'টিয়ার ১ উন্নত সুবিধা' : 'Tier 1 Advanced Feature'}
          </span>
          <h3 className="text-lg font-bold mt-1 text-slate-100 flex items-center gap-2">
            📊 {language === 'bn' ? 'নির্ধারিত পরিস্থিতি বিশ্লেষক' : 'Deterministic Scenario Simulator'}
          </h3>
        </div>
        <div className="text-right text-xs text-slate-400">
          {language === 'bn' ? 'AgriSense বাস্তব ডেটা প্যাক দ্বারা পরিচালিত' : 'Powered by AgriSense Real Data Pack'}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-xs text-slate-400 mb-1 font-medium">
            {language === 'bn' ? 'লক্ষ্য ফসল' : 'Target Crop'}
            {recommendedCrops && recommendedCrops.length > 0 && (
              <span className="ml-1.5 text-emerald-400 font-normal">
                ({language === 'bn' ? 'প্রস্তাবিত' : 'recommended'})
              </span>
            )}
          </label>
          <select
            value={cropId}
            onChange={(e) => setCropId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            {cropOptions.map(c => (
              <option key={c.cropId} value={c.cropId}>
                {language === 'bn' ? c.nameBn : c.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1 font-medium">{language === 'bn' ? 'জমির আকার (শতক)' : 'Farm Size (Decimals)'}</label>
          <input
            type="number"
            value={farmSizeDecimal}
            onChange={(e) => setFarmSizeDecimal(Number(e.target.value) || 100)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1 font-medium">{language === 'bn' ? 'পরিস্থিতির ধরন' : 'Scenario Type'}</label>
          <select
            value={scenarioType}
            onChange={(e) => setScenarioType(e.target.value as any)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="budget_cut_percent">{language === 'bn' ? 'বাজেট কমানো %' : 'Budget Cut %'}</option>
            <option value="rainfall_change_percent">{language === 'bn' ? 'বৃষ্টিপাত পরিবর্তন %' : 'Rainfall Change %'}</option>
            <option value="selling_price_change_percent">{language === 'bn' ? 'বিক্রয়মূল্য পরিবর্তন %' : 'Selling Price Change %'}</option>
            <option value="input_price_change_percent">{language === 'bn' ? 'উপকরণের মূল্য পরিবর্তন %' : 'Input Price Change %'}</option>
            <option value="sowing_delay_days">{language === 'bn' ? 'বপনে বিলম্বের দিন' : 'Sowing Delay Days'}</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1 font-medium">
            {language === 'bn' ? 'পরিবর্তনের মান' : 'Change Value'}: <span className="text-emerald-400 font-bold">{changeValue}{scenarioType === 'sowing_delay_days' ? (language === 'bn' ? ' দিন' : ' Days') : '%'}</span>
          </label>
          <input
            type="range"
            min={scenarioType === 'sowing_delay_days' ? 1 : scenarioType === 'budget_cut_percent' ? 0 : -50}
            max={scenarioType === 'sowing_delay_days' ? 30 : 50}
            value={changeValue}
            onChange={(e) => setChangeValue(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">{language === 'bn' ? 'মোট খরচ (৳)' : 'Total Cost (৳)'}</div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm line-through text-slate-500">৳{result.baseline.totalCostBdt.toLocaleString()}</span>
            <span className="text-lg font-bold text-amber-400">৳{result.simulated.totalCostBdt.toLocaleString()}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {language === 'bn' ? 'পরিবর্তন' : 'Delta'}: <span className={result.impactDelta.costDeltaBdt <= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {result.impactDelta.costDeltaBdt > 0 ? '+' : ''}৳{result.impactDelta.costDeltaBdt.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">{language === 'bn' ? 'নিট লাভ (৳)' : 'Net Profit (৳)'}</div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm line-through text-slate-500">৳{result.baseline.expectedNetProfitBdt.toLocaleString()}</span>
            <span className="text-lg font-bold text-emerald-400">৳{result.simulated.expectedNetProfitBdt.toLocaleString()}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {language === 'bn' ? 'পরিবর্তন' : 'Delta'}: <span className={result.impactDelta.profitDeltaBdt >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {result.impactDelta.profitDeltaBdt > 0 ? '+' : ''}৳{result.impactDelta.profitDeltaBdt.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">{language === 'bn' ? 'ROI % ও ব্রেক-ইভেন' : 'ROI % & Break-even'}</div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm line-through text-slate-500">{result.baseline.roiPercent}%</span>
            <span className="text-lg font-bold text-cyan-400">{result.simulated.roiPercent}%</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {language === 'bn' ? 'ব্রেক-ইভেন মূল্য' : 'Break-even price'}: <span className="text-slate-200">৳{result.simulated.breakEvenPricePerUnit}/{result.unit}</span>
          </div>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-3 text-xs text-emerald-200">
        <span className="font-semibold text-emerald-400">{language === 'bn' ? 'AgriSense ইঞ্জিনের যুক্তি:' : 'AgriSense Engine Rationale:'}</span> {result.explanation}
        {result.simulated.fundingShortfallBdt > 0 && (
          <div className="mt-1 text-amber-300">{language === 'bn' ? `অর্থের ঘাটতি: ৳${result.simulated.fundingShortfallBdt.toLocaleString()}। প্রয়োজনীয় উপকরণ গোপনে কমানো হয়নি।` : `Funding shortfall: ৳${result.simulated.fundingShortfallBdt.toLocaleString()}. Required inputs were not silently reduced.`}</div>
        )}
        {result.assumptions.map((assumption, index) => (
          <div key={index} className="mt-1 text-slate-300">{language === 'bn' ? 'অনুমান' : 'Assumption'}: {assumption}</div>
        ))}
      </div>
    </div>
  );
}
