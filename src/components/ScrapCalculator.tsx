import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2, Scale, Truck } from 'lucide-react';
import type { VehicleModel } from '../data/catalog';

interface ScrapCalculatorProps {
  vehicles: VehicleModel[];
  defaultVehicleId: string;
}

interface ScrapEstimate {
  vehicle_label: string;
  curb_weight_kg: number;
  net_metal_weight_kg: number;
  steel_index_per_kg: number;
  breakdown: {
    base_metal_value: number;
    cat_converter_recovery: number;
    battery_wheels_recovery: number;
    towing_rto_fee: number;
  };
  quote_low: number;
  quote_high: number;
  cod_incentive_inr: number;
}

interface LeadConfirmation {
  lead_id: string;
  vehicle_label: string;
  status: string;
}

export const ScrapCalculator: React.FC<ScrapCalculatorProps> = ({
  vehicles,
  defaultVehicleId,
}) => {
  const [vehicleId, setVehicleId] = useState(defaultVehicleId);
  const [modelYear, setModelYear] = useState(2010);
  const [condition, setCondition] = useState<
    'Runs & Drives' | 'Accidental / Non-Runner' | 'Burned / Totaled'
  >('Runs & Drives');
  const [wheelsBattery, setWheelsBattery] = useState<'Intact' | 'Missing'>('Intact');

  const [estimate, setEstimate] = useState<ScrapEstimate | null>(null);
  const [phone, setPhone] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadSuccess, setLeadSuccess] = useState<LeadConfirmation | null>(null);

  const scrapYears = Array.from({ length: 22 }, (_, i) => 2016 - i);

  useEffect(() => {
    let cancelled = false;
    const calc = async () => {
      try {
        const res = await fetch('/api/v1/scrap/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicle_id: vehicleId,
            model_year: modelYear,
            condition,
            wheels_battery: wheelsBattery,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as ScrapEstimate;
        if (!cancelled) setEstimate(data);
      } catch {
        // retain last estimate on transient network error
      }
    };
    calc();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, modelYear, condition, wheelsBattery]);

  const handleBookInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estimate) return;
    setLeadError(null);
    setSubmittingLead(true);

    try {
      const res = await fetch('/api/v1/scrap/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_phone: phone,
          vehicle_id: vehicleId,
          model_year: modelYear,
          condition,
          wheels_battery: wheelsBattery,
          calculated_quote_low: estimate.quote_low,
          calculated_quote_high: estimate.quote_high,
          pickup_address: pickupAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit booking.');
      setLeadSuccess(data);
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : 'Unable to submit lead.');
    } finally {
      setSubmittingLead(false);
    }
  };

  return (
    <section id="scrap-calculator" className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="font-display text-2xl font-bold text-slate-900">
          Algorithmic Instant Scrap Valuation Calculator
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Transparent scrap metal pricing indexed to live steel rates plus catalytic converter &amp; battery recovery, complete with official RVSF RTO deregistration.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Valuation Inputs */}
        <div className="space-y-5 lg:col-span-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="scrap-vehicle" className="block text-xs font-medium text-slate-700">
                Vehicle Model
              </label>
              <select
                id="scrap-vehicle"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.curb_weight_kg} kg)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="scrap-year" className="block text-xs font-medium text-slate-700">
                Manufacture Year
              </label>
              <select
                id="scrap-year"
                value={modelYear}
                onChange={(e) => setModelYear(Number(e.target.value))}
                className="mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm font-medium text-slate-900 tabular-nums focus:border-slate-900 focus:outline-none"
              >
                {scrapYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700">Operating Condition</span>
            <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(['Runs & Drives', 'Accidental / Non-Runner', 'Burned / Totaled'] as const).map(
                (opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCondition(opt)}
                    className={`min-h-12 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      condition === opt
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700">
              Wheels &amp; Battery Assembly
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(['Intact', 'Missing'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setWheelsBattery(opt)}
                  className={`min-h-12 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    wheelsBattery === opt
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Algorithmic Formula Breakdown */}
          {estimate && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span className="inline-flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-slate-600" />
                  Formula Breakdown ({estimate.net_metal_weight_kg} kg net steel @ ₹
                  {estimate.steel_index_per_kg}/kg)
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Base Scrap Metal Value (Curb Weight − 15% Fluid/Glass)</span>
                  <span className="font-mono font-medium text-slate-900 tabular-nums">
                    +₹{estimate.breakdown.base_metal_value.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Catalytic Converter PGM Recovery</span>
                  <span className="font-mono font-medium text-slate-900 tabular-nums">
                    +₹{estimate.breakdown.cat_converter_recovery.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Battery &amp; Alloy/Wheel Recovery</span>
                  <span className="font-mono font-medium text-slate-900 tabular-nums">
                    +₹{estimate.breakdown.battery_wheels_recovery.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-700">
                  <span>Standard Towing &amp; RTO Deregistration Filing Fee</span>
                  <span className="font-mono font-medium tabular-nums">
                    −₹{estimate.breakdown.towing_rto_fee.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Instant Quote Card + Lead Capture */}
        <div className="space-y-5 lg:col-span-6">
          {estimate && (
            <div className="rounded-xl border border-slate-900 bg-slate-900 p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Estimated Instant Scrap Payout · {estimate.vehicle_label}
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                ₹{estimate.quote_low.toLocaleString('en-IN')} – ₹
                {estimate.quote_high.toLocaleString('en-IN')}
              </p>

              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/70 p-3.5">
                <div className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-200">
                  <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                  <span>
                    Includes official <strong>Certificate of Deposit (CoD)</strong> worth up to{' '}
                    <span className="font-mono font-bold text-white tabular-nums">
                      ₹{estimate.cod_incentive_inr.toLocaleString('en-IN')}
                    </span>{' '}
                    in road tax &amp; registration concessions on your next vehicle purchase, plus full RTO liability clearance.
                  </span>
                </div>
              </div>
            </div>
          )}

          {leadSuccess ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                <h3 className="font-display text-base font-bold">
                  Inspection &amp; Towing Scheduled ({leadSuccess.lead_id})
                </h3>
              </div>
              <p className="mt-2 text-sm text-emerald-800">
                Partner RVSF inspection booked for your {leadSuccess.vehicle_label}. Please keep your original RC card and Aadhaar ID ready for physical verification prior to tow dispatch.
              </p>
              <button
                type="button"
                onClick={() => setLeadSuccess(null)}
                className="mt-4 text-xs font-semibold text-emerald-900 underline"
              >
                Submit another vehicle
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleBookInspection}
              className="space-y-3.5 rounded-xl border border-slate-200 bg-slate-50 p-5"
            >
              <h3 className="font-display text-base font-bold text-slate-900">
                Schedule Free Doorstep Inspection &amp; Towing
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="lead-phone" className="block text-xs font-medium text-slate-700">
                    Owner Phone Number *
                  </label>
                  <input
                    id="lead-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98110 44556"
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm tabular-nums focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="lead-addr" className="block text-xs font-medium text-slate-700">
                    Pickup City / Address *
                  </label>
                  <input
                    id="lead-addr"
                    type="text"
                    required
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="Sector 18, Gurugram"
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {leadError && (
                <p className="text-xs font-medium text-red-700">{leadError}</p>
              )}

              <button
                type="submit"
                disabled={submittingLead}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
              >
                <Truck className="h-4 w-4" aria-hidden="true" />
                <span>
                  {submittingLead
                    ? 'Dispatching RVSF Request...'
                    : 'Schedule Free Doorstep Inspection & Towing'}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
