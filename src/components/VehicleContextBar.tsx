import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  FileImage,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import type { VehicleModel, VehicleTrim } from '../data/catalog';

export interface SelectedVehicleState {
  vehicle: VehicleModel;
  trim: VehicleTrim;
  year: number;
  source: 'manual' | 'ocr';
  extractedVin?: string;
  extractedRegNo?: string;
  engineLast5?: string;
  confidenceScore?: number;
  needsVerification?: boolean;
}

interface VehicleContextBarProps {
  vehicles: VehicleModel[];
  selected: SelectedVehicleState;
  onSelectVehicle: (next: SelectedVehicleState) => void;
  focusScanner?: boolean;
}

interface SampleRC {
  id: string;
  label: string;
  regNo: string;
  vin: string;
  engineNo: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  blurry?: boolean;
}

const SAMPLE_RCS: SampleRC[] = [
  {
    id: 'rc-swift',
    label: '2019 Maruti Swift RC',
    regNo: 'KA 03 MM 8821',
    vin: 'MA3EKB1S001234567',
    engineNo: 'K12MN41892',
    make: 'MARUTI SUZUKI',
    model: 'SWIFT ZXI 1.2 PETROL',
    year: 2019,
    trim: 'ZXi 1.2 Petrol',
  },
  {
    id: 'rc-nexon',
    label: '2022 Tata Nexon RC',
    regNo: 'MH 12 TR 4092',
    vin: 'MAT627160N1048219',
    engineNo: 'REV1299401',
    make: 'TATA MOTORS',
    model: 'NEXON CREATIVE+ 1.2',
    year: 2022,
    trim: 'Petrol',
  },
  {
    id: 'rc-creta-blur',
    label: 'Low-Light Creta RC',
    regNo: 'DL 01 AB 1234',
    vin: 'MALC381C0K5091124',
    engineNo: 'G4FL88321',
    make: 'HYUNDAI',
    model: 'CRETA SX 1.5 PETROL',
    year: 2020,
    trim: 'SX 1.5 MPi Petrol',
    blurry: true,
  },
];

function renderSampleRCBase64(sample: SampleRC): string {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 580;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Card background
  ctx.fillStyle = sample.blurry ? '#d6d3cb' : '#f4f6f8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header band
  ctx.fillStyle = sample.blurry ? '#3f4552' : '#1e293b';
  ctx.fillRect(0, 0, canvas.width, 86);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('INDIAN UNION VEHICLE REGISTRATION CERTIFICATE', 36, 52);

  if (sample.blurry) {
    ctx.filter = 'blur(1.8px)';
  }

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`REGN NO : ${sample.regNo}`, 44, 148);
  ctx.fillText(`CHASSIS : ${sample.vin}`, 44, 206);
  ctx.fillText(`ENGINE  : ${sample.engineNo}`, 44, 264);
  ctx.fillText(`MAKER   : ${sample.make}`, 44, 322);
  ctx.fillText(`MODEL   : ${sample.model}`, 44, 380);
  ctx.fillText(`MFG YR  : ${sample.year}`, 44, 438);
  ctx.fillText(`FUEL    : ${sample.trim.toUpperCase()}`, 44, 496);

  if (sample.blurry) {
    // Low-light shadow overlay to trigger realistic <0.80 OCR confidence
    ctx.filter = 'none';
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.35)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}

async function compressImageForUpload(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1920;
        const maxH = 1080;
        let { width, height } = img;
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve({ base64: dataUrl, mimeType: 'image/jpeg' });
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export const VehicleContextBar: React.FC<VehicleContextBarProps> = ({
  vehicles,
  selected,
  onSelectVehicle,
  focusScanner,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanMeta, setScanMeta] = useState<{
    vin: string;
    regNo: string;
    engineLast5: string;
    confidence: number;
    needsVerification: boolean;
    prompt: string | null;
    processingMs: number;
  } | null>(null);
  const [editableVin, setEditableVin] = useState('');

  const years = Array.from({ length: 17 }, (_, i) => 2026 - i);
  const makes = Array.from(new Set(vehicles.map((v) => v.make)));
  const modelsForMake = vehicles.filter((v) => v.make === selected.vehicle.make);

  const handleYearChange = (newYear: number) => {
    onSelectVehicle({
      ...selected,
      year: newYear,
      source: 'manual',
    });
  };

  const handleMakeChange = (newMake: string) => {
    const firstModel = vehicles.find((v) => v.make === newMake);
    if (!firstModel) return;
    const clampedYear = Math.min(Math.max(selected.year, firstModel.year_start), firstModel.year_end);
    onSelectVehicle({
      vehicle: firstModel,
      trim: firstModel.trims[0],
      year: clampedYear,
      source: 'manual',
    });
    setScanMeta(null);
  };

  const handleModelChange = (vehicleId: string) => {
    const found = vehicles.find((v) => v.id === vehicleId);
    if (!found) return;
    const clampedYear = Math.min(Math.max(selected.year, found.year_start), found.year_end);
    onSelectVehicle({
      vehicle: found,
      trim: found.trims[0],
      year: clampedYear,
      source: 'manual',
    });
    setScanMeta(null);
  };

  const handleTrimChange = (trimId: string) => {
    const foundTrim = selected.vehicle.trims.find((t) => t.id === trimId);
    if (!foundTrim) return;
    onSelectVehicle({
      ...selected,
      trim: foundTrim,
      source: 'manual',
    });
  };

  const runOcrScan = async (imageBase64: string, mimeType: string) => {
    setScanning(true);
    setScanError(null);

    try {
      const res = await fetch('/api/v1/ocr/scan-rc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType }),
      });

      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to parse RC card.');
      }

      const data = payload.data;
      const confidence = Number(payload.confidence_score ?? 0.9);
      const needsVerification = Boolean(payload.needs_verification ?? confidence < 0.8);

      setScanMeta({
        vin: data.extracted_vin,
        regNo: data.extracted_reg_no,
        engineLast5: data.engine_last_5,
        confidence,
        needsVerification,
        prompt: payload.verification_prompt || null,
        processingMs: payload.processing_ms || 0,
      });
      setEditableVin(data.extracted_vin || '');

      if (data.matched_vehicle) {
        const matchedVeh = vehicles.find((v) => v.id === data.matched_vehicle.id);
        if (matchedVeh) {
          const matchedTrim =
            matchedVeh.trims.find((t) => t.id === data.matched_vehicle.trim_id) ||
            matchedVeh.trims[0];
          onSelectVehicle({
            vehicle: matchedVeh,
            trim: matchedTrim,
            year: data.matched_vehicle.year || 2019,
            source: 'ocr',
            extractedVin: data.extracted_vin,
            extractedRegNo: data.extracted_reg_no,
            engineLast5: data.engine_last_5,
            confidenceScore: confidence,
            needsVerification,
          });
        }
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'OCR scan failed.');
    } finally {
      setScanning(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { base64, mimeType } = await compressImageForUpload(file);
      await runOcrScan(base64, mimeType);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Could not process image.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSampleScan = async (sample: SampleRC) => {
    const base64 = renderSampleRCBase64(sample);
    if (!base64) return;
    await runOcrScan(base64, 'image/jpeg');
  };

  return (
    <section
      id="vehicle-scanner"
      className={`rounded-xl border bg-white p-5 sm:p-6 transition-colors ${
        focusScanner ? 'border-orange-500 ring-2 ring-orange-500/15' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        {/* Left: AI RC Scanner */}
        <div className="lg:w-5/12">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-slate-900">
              AI RC Card &amp; VIN Scanner
            </h2>
            {scanMeta && (
              <button
                type="button"
                onClick={() => {
                  setScanMeta(null);
                  setScanError(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear scan
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Snap or upload a customer RC card to auto-lock chassis fitment. Images are wiped from memory immediately after OCR.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={scanning}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60 whitespace-nowrap"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              <span>{scanning ? 'Scanning RC Card...' : 'Scan RC Card / VIN'}</span>
            </button>

            <span className="text-xs text-slate-500">Max 1920×1080 · Auto-compressed</span>
          </div>

          {/* Sample RC Quick-Test Strip */}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-xs font-medium text-slate-500">Test live Gemini Vision OCR with sample RC cards:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLE_RCS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  disabled={scanning}
                  onClick={() => handleSampleScan(sample)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
                >
                  <FileImage className="h-3.5 w-3.5 text-slate-500" />
                  <span>{sample.label}</span>
                </button>
              ))}
            </div>
          </div>

          {scanError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold">OCR Scan Issue</p>
                  <p className="mt-0.5">{scanError}</p>
                </div>
              </div>
            </div>
          )}

          {scanMeta && (
            <div
              className={`mt-3 rounded-lg border p-3.5 text-xs ${
                scanMeta.needsVerification
                  ? 'border-amber-300 bg-amber-50 text-amber-950'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-950'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  {scanMeta.needsVerification ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  )}
                  {scanMeta.needsVerification
                    ? 'Please verify the extracted chassis number.'
                    : 'RC Parsed & Vehicle Matched'}
                </span>
                <span className="font-mono tabular-nums text-slate-700">
                  {Math.round(scanMeta.confidence * 100)}% conf · {scanMeta.processingMs} ms
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <span className="block text-[11px] text-slate-500">Registration No.</span>
                  <span className="font-mono font-semibold tabular-nums">{scanMeta.regNo}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500">Engine (Last 5)</span>
                  <span className="font-mono font-semibold tabular-nums">{scanMeta.engineLast5}</span>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-500" htmlFor="ocr-vin-field">
                    17-Char VIN / Chassis Number
                  </label>
                  <input
                    id="ocr-vin-field"
                    type="text"
                    value={editableVin}
                    onChange={(e) => setEditableVin(e.target.value.toUpperCase())}
                    className={`mt-1 w-full rounded-md border px-2.5 py-1.5 font-mono text-xs font-semibold tracking-wider tabular-nums ${
                      scanMeta.needsVerification
                        ? 'border-amber-400 bg-yellow-50 text-amber-950'
                        : 'border-emerald-300 bg-white text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden h-44 w-px bg-slate-200 lg:block" aria-hidden="true" />

        {/* Right: 4-Tier Cascading Vehicle Selector */}
        <div className="lg:w-7/12">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Select Vehicle (Top 15 Commuter Models)
            </h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {selected.vehicle.curb_weight_kg} kg · {selected.trim.displacement_cc} cc · {selected.trim.fuel}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Lock your vehicle below to filter out incompatible parts and guarantee fitment.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Tier 1: Year */}
            <div>
              <label htmlFor="sel-year" className="block text-xs font-medium text-slate-600">
                1. Year
              </label>
              <div className="relative mt-1">
                <select
                  id="sel-year"
                  value={selected.year}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="min-h-12 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-medium text-slate-900 tabular-nums focus:border-slate-900 focus:outline-none"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Tier 2: Make */}
            <div>
              <label htmlFor="sel-make" className="block text-xs font-medium text-slate-600">
                2. Make
              </label>
              <div className="relative mt-1">
                <select
                  id="sel-make"
                  value={selected.vehicle.make}
                  onChange={(e) => handleMakeChange(e.target.value)}
                  className="min-h-12 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                >
                  {makes.map((make) => (
                    <option key={make} value={make}>
                      {make}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Tier 3: Model */}
            <div>
              <label htmlFor="sel-model" className="block text-xs font-medium text-slate-600">
                3. Model
              </label>
              <div className="relative mt-1">
                <select
                  id="sel-model"
                  value={selected.vehicle.id}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="min-h-12 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                >
                  {modelsForMake.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.model}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Tier 4: Trim / Fuel */}
            <div>
              <label htmlFor="sel-trim" className="block text-xs font-medium text-slate-600">
                4. Trim / Fuel
              </label>
              <div className="relative mt-1">
                <select
                  id="sel-trim"
                  value={selected.trim.id}
                  onChange={(e) => handleTrimChange(e.target.value)}
                  className="min-h-12 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                >
                  {selected.vehicle.trims.map((trim) => (
                    <option key={trim.id} value={trim.id}>
                      {trim.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Active Context Lock Readout */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <span className="font-semibold text-emerald-950">
                Catalog Locked: {selected.year} {selected.vehicle.make} {selected.vehicle.model} ({selected.trim.label})
              </span>
            </div>
            <span className="font-mono text-xs text-emerald-800 tabular-nums">
              VIN Prefix {selected.trim.vin_prefix}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
