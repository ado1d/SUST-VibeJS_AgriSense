'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  UploadCloud, AlertTriangle, CheckCircle2, ShieldAlert, Bug, Leaf,
  Sparkles, Loader2, Info, ExternalLink, RefreshCw, Eye
} from 'lucide-react';
import { DiseaseRecord, PLANT_DISEASES } from '@/lib/kb/diseases';

// Sample leaf images (base64 SVG data URLs for instant offline demo testing!)
const SAMPLE_LEAF_IMAGES = [
  {
    nameEn: 'Tomato Late Blight',
    nameBn: 'টমেটো লেট ব্লাইট',
    crop: 'Tomato',
    // Realistic SVG rendering of a diseased tomato leaf with brown necrotized spots
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="100%" height="100%" fill="%231e293b"/><path d="M150 40 C200 80, 240 160, 200 240 C160 280, 100 250, 80 180 C60 110, 100 40, 150 40 Z" fill="%2315803d"/><path d="M150 40 L150 250 M150 100 L210 80 M150 140 L90 120 M150 180 L200 170 M150 210 L100 200" stroke="%23166534" stroke-width="4"/><circle cx="180" cy="110" r="22" fill="%23451a03" opacity="0.85"/><circle cx="180" cy="110" r="14" fill="%2378350f"/><circle cx="115" cy="160" r="18" fill="%23451a03" opacity="0.9"/><ellipse cx="160" cy="200" rx="25" ry="15" fill="%233f6212" opacity="0.7"/><circle cx="180" cy="110" r="26" stroke="%23fef08a" stroke-width="2" fill="none"/></svg>'
  },
  {
    nameEn: 'Rice Blast Disease',
    nameBn: 'ধানের ব্লাস্ট রোগ',
    crop: 'Rice',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="100%" height="100%" fill="%231e293b"/><path d="M90 270 Q130 150 170 30 Q180 150 210 270 Z" fill="%2316a34a"/><path d="M150 30 L150 270" stroke="%2315803d" stroke-width="3"/><path d="M140 100 C155 90, 165 90, 160 115 C150 125, 135 120, 140 100 Z" fill="%2378350f"/><circle cx="150" cy="107" r="4" fill="%23cbd5e1"/><path d="M135 160 C155 145, 170 150, 165 180 C145 190, 130 180, 135 160 Z" fill="%2378350f"/><circle cx="150" cy="170" r="5" fill="%2394a3b8"/><ellipse cx="152" cy="220" rx="12" ry="20" fill="%23451a03"/></svg>'
  },
  {
    nameEn: 'Potato Early Blight',
    nameBn: 'আলুর আর্লি ব্লাইট',
    crop: 'Potato',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="100%" height="100%" fill="%231e293b"/><path d="M150 50 C230 60, 250 180, 180 250 C110 280, 50 190, 80 100 Z" fill="%2315803d"/><circle cx="130" cy="120" r="20" fill="%23451a03"/><circle cx="130" cy="120" r="15" fill="%2378350f"/><circle cx="130" cy="120" r="10" fill="%23a16207"/><circle cx="190" cy="170" r="18" fill="%23451a03"/><circle cx="190" cy="170" r="12" fill="%2378350f"/><circle cx="130" cy="120" r="24" stroke="%23eab308" stroke-width="2" fill="none"/></svg>'
  },
  {
    nameEn: 'Corn Common Rust',
    nameBn: 'ভুট্টার সাধারণ মরিচা',
    crop: 'Corn',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="100%" height="100%" fill="%231e293b"/><path d="M70 40 C160 80, 200 200, 230 260 C170 240, 100 180, 70 40 Z" fill="%2365a30d"/><ellipse cx="120" cy="100" rx="4" ry="12" fill="%23c2410c"/><ellipse cx="140" cy="130" rx="5" ry="14" fill="%23ea580c"/><ellipse cx="110" cy="150" rx="4" ry="10" fill="%23c2410c"/><ellipse cx="160" cy="170" rx="6" ry="15" fill="%239a3412"/><ellipse cx="135" cy="190" rx="5" ry="12" fill="%23ea580c"/></svg>'
  }
];

export function PlantDiseaseDetector({ language = 'en' }: { language?: 'en' | 'bn' }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(SAMPLE_LEAF_IMAGES[0].dataUrl);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    disease: DiseaseRecord;
    confidence: number;
    visualObservations: string;
    datasetSource: string;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDetect = async () => {
    if (!selectedImage) return;
    setLoading(true);
    try {
      const res = await fetch('/api/disease-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: selectedImage, language })
      });
      const data = await res.json();
      if (data.success) {
        setResult({
          disease: data.disease,
          confidence: data.confidence,
          visualObservations: data.visualObservations,
          datasetSource: data.datasetSource
        });
      }
    } catch (err) {
      console.error('Detection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-rose-600 text-white font-bold">{language === 'bn' ? 'জরুরি বিপদ' : 'CRITICAL'}</Badge>;
      case 'high':
        return <Badge className="bg-amber-600 text-white font-bold">{language === 'bn' ? 'উচ্চ ঝুঁকি' : 'HIGH RISK'}</Badge>;
      case 'moderate':
        return <Badge className="bg-yellow-500 text-slate-900 font-bold">{language === 'bn' ? 'মাঝারি' : 'MODERATE'}</Badge>;
      default:
        return <Badge className="bg-emerald-600 text-white font-bold">{language === 'bn' ? 'স্বাভাবিক / সুস্থ' : 'HEALTHY / LOW'}</Badge>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div>
          <span className="bg-violet-500/10 text-violet-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-violet-500/20">
            {language === 'bn' ? 'উদ্ভিদ রোগ নির্ণয় শাখা' : 'Plant Pathology & Vision AI'}
          </span>
          <h3 className="text-lg font-bold mt-1 text-slate-100 flex items-center gap-2">
            🔬 {language === 'bn' ? 'ছবি থেকে পাতার রোগ নির্ণয়' : 'AI Leaf Disease Classifier'}
          </h3>
        </div>
        <div className="text-right text-xs text-slate-400">
          {language === 'bn' ? 'PlantVillage ৩৮ টি ক্লাস ও BARI ডেটাসেট' : 'PlantVillage 38-Class & BARI Dataset'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Column: Image Upload & Preview */}
        <div className="md:col-span-5 flex flex-col gap-3">
          <div className="relative border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 text-center bg-slate-800/40 transition-colors">
            {selectedImage ? (
              <div className="relative group">
                <img
                  src={selectedImage}
                  alt="Uploaded leaf"
                  className="w-full h-48 object-contain rounded-lg bg-slate-950 border border-slate-800"
                />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow">
                    <UploadCloud className="w-4 h-4" />
                    {language === 'bn' ? 'অন্য ছবি দিন' : 'Change Image'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center py-8">
                <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                <span className="text-sm font-semibold text-slate-200">
                  {language === 'bn' ? 'পাতার ছবি আপলোড করুন' : 'Upload Leaf Photo'}
                </span>
                <span className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            )}
          </div>

          {/* Sample preset selector */}
          <div>
            <span className="text-xs text-slate-400 font-medium block mb-2">
              {language === 'bn' ? 'নমুনা পাতা দিয়ে তাৎক্ষণিক পরীক্ষা করুন:' : 'Quick sample test leaf:'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLE_LEAF_IMAGES.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedImage(sample.dataUrl); setResult(null); }}
                  className={`text-left text-xs p-2 rounded-lg border transition-all flex items-center gap-2 ${
                    selectedImage === sample.dataUrl
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 font-semibold'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <img src={sample.dataUrl} alt={sample.nameEn} className="w-7 h-7 rounded border border-slate-700" />
                  <div className="truncate">
                    <div>{language === 'bn' ? sample.nameBn : sample.nameEn}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleDetect}
            disabled={!selectedImage || loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-2 mt-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {language === 'bn' ? 'বিশ্লেষণ করা হচ্ছে...' : 'Classifying Leaf...'}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {language === 'bn' ? 'রোগ নির্ণয় শুরু করুন' : 'Classify Plant Disease'}
              </>
            )}
          </Button>
        </div>

        {/* Right Column: Diagnostic Results */}
        <div className="md:col-span-7">
          {!result && !loading && (
            <div className="h-full min-h-[300px] border border-slate-800 rounded-xl p-6 bg-slate-950/40 flex flex-col items-center justify-center text-center">
              <Bug className="w-12 h-12 text-slate-600 mb-3" />
              <h4 className="font-semibold text-slate-300">
                {language === 'bn' ? 'রোগ নির্ণয়ের অপেক্ষায়' : 'Awaiting Leaf Diagnosis'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {language === 'bn'
                  ? 'উপরে একটি ছবি আপলোড করুন অথবা নমুনা পাতায় ক্লিক করে "রোগ নির্ণয় শুরু করুন" বোতামে চাপুন।'
                  : 'Upload a leaf photo above or pick one of the sample leaves to classify diseases instantly.'}
              </p>
            </div>
          )}

          {loading && (
            <div className="h-full min-h-[300px] border border-slate-800 rounded-xl p-6 bg-slate-950/40 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <div className="text-sm font-semibold text-emerald-300">
                {language === 'bn' ? 'PlantVillage মডেল ও BARI ডাটাবেজে মেলানো হচ্ছে...' : 'Scanning via PlantVillage Neural Classifier & BARI Rules...'}
              </div>
              <div className="text-xs text-slate-500">
                {language === 'bn' ? 'পাতার দাগ, রঙ ও টিস্যু পরীক্ষা করা হচ্ছে' : 'Analyzing leaf spot geometry, chlorosis & fungal spore pattern'}
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Classification Banner */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                      {language === 'bn' ? result.disease.cropNameBn : result.disease.cropName}
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-300 font-mono text-[11px]">{result.disease.className}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 mt-1">
                      {language === 'bn' ? result.disease.diseaseNameBn : result.disease.diseaseName}
                    </h3>
                  </div>
                  {getSeverityBadge(result.disease.severity)}
                </div>

                {/* Confidence Bar */}
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{language === 'bn' ? 'নির্ণয়ের বিশ্বস্ততা:' : 'AI Confidence Score:'}</span>
                    <span className="text-emerald-400 font-bold">{Math.round(result.confidence * 100)}%</span>
                  </div>
                  <Progress value={result.confidence * 100} className="h-1.5 bg-slate-900" />
                </div>
              </div>

              {/* Visual Observations */}
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3.5 text-xs text-emerald-200">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
                  <Eye className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'দৃশ্যমান বৈশিষ্ট্য পর্যবেক্ষণ:' : 'Visual Pathology Observations:'}
                </div>
                {result.visualObservations}
              </div>

              {/* Treatment & Management Tabs */}
              <div className="space-y-3">
                {/* Symptoms */}
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                  <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'রোগের মূল লক্ষণসমূহ' : 'Key Diagnostic Symptoms'}
                  </h5>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {(language === 'bn' ? result.disease.symptomsBn : result.disease.symptoms).map((symptom, i) => (
                      <li key={i}>{symptom}</li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Treatments */}
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                  <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'অনুমোদিত প্রতিকার ও প্রয়োগের মাত্রা' : 'Recommended Treatments & Dosage'}
                  </h5>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {(language === 'bn' ? result.disease.treatmentBn : result.disease.treatment).map((treat, i) => (
                      <li key={i}>{treat}</li>
                    ))}
                  </ul>
                </div>

                {/* Cause & Prevention */}
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                  <h5 className="text-xs font-bold text-sky-400 flex items-center gap-1.5 mb-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'রোগের কারণ ও প্রতিরোধমূলক ব্যবস্থা' : 'Cause & Preventive Protocol'}
                  </h5>
                  <div className="text-xs text-slate-300 mb-2">
                    <span className="font-semibold text-slate-400">{language === 'bn' ? 'কারণ: ' : 'Cause: '}</span>
                    {language === 'bn' ? result.disease.causeBn : result.disease.cause}
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {(language === 'bn' ? result.disease.preventionBn : result.disease.prevention).map((prev, i) => (
                      <li key={i}>{prev}</li>
                    ))}
                  </ul>
                </div>

                {/* Source Verification */}
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                  <span>{language === 'bn' ? 'উৎস: ' : 'Source: '}{result.disease.source}</span>
                  {result.disease.sourceUrl && (
                    <a
                      href={result.disease.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      {language === 'bn' ? 'অফিসিয়াল তথ্য দেখুন' : 'View Official KB'}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
