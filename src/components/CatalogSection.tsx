import React, { useEffect, useState } from 'react';
import { Check, MapPin, PackageCheck, Plus, ShieldCheck, Wrench, X } from 'lucide-react';
import type { CompatiblePartResult, PartCategory } from '../data/catalog';
import type { SelectedVehicleState } from './VehicleContextBar';

interface CatalogSectionProps {
  selected: SelectedVehicleState;
  onAddToCart: (part: CompatiblePartResult) => void;
  cartQuantities: Record<string, number>;
}

const CATEGORIES: Array<{ id: 'All' | PartCategory; label: string }> = [
  { id: 'All', label: 'All Parts' },
  { id: 'Brakes', label: 'Brakes' },
  { id: 'Filters', label: 'Filters' },
  { id: 'Ignition', label: 'Ignition' },
  { id: 'Wipers', label: 'Wipers' },
];

export const CatalogSection: React.FC<CatalogSectionProps> = ({
  selected,
  onAddToCart,
  cartQuantities,
}) => {
  const [category, setCategory] = useState<'All' | PartCategory>('All');
  const [pincode, setPincode] = useState('560038');
  const [parts, setParts] = useState<CompatiblePartResult[]>([]);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [hubNote, setHubNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [inspectPart, setInspectPart] = useState<CompatiblePartResult | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const fetchParts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          vehicle_id: selected.vehicle.id,
          year: String(selected.year),
          trim_id: selected.trim.id,
          category,
          pincode,
        });
        const res = await fetch(`/api/v1/parts/compatible?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load compatible parts.');
        const data = await res.json();
        if (!cancelled) {
          setParts(data.parts || []);
          setLatencyMs(data.query_latency_ms || 0);
          setHubNote(data.hub_note || '');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to fetch catalog');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchParts();
    return () => {
      cancelled = true;
    };
  }, [selected.vehicle.id, selected.year, selected.trim.id, category, pincode]);

  const vehicleName = `${selected.year} ${selected.vehicle.make} ${selected.vehicle.model}`;

  return (
    <section id="parts-catalog" className="space-y-6">
      {/* Toolbar: Category Filter + PIN Code ETA */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900">
            Guaranteed Fitment Catalog
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Showing {parts.length} verified OEM-grade parts for {vehicleName} · {latencyMs} ms query
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* PIN Code Input */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5">
            <MapPin className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <label htmlFor="eta-pincode" className="sr-only">
              Delivery PIN Code
            </label>
            <input
              id="eta-pincode"
              type="text"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
              placeholder="PIN Code"
              className="w-20 font-mono text-sm font-medium text-slate-900 tabular-nums focus:outline-none"
            />
            <span className="text-xs text-slate-500 hidden sm:inline">{hubNote}</span>
          </div>

          {/* Interactive Category Filter Segmented Controls */}
          <div
            role="tablist"
            aria-label="Part categories"
            className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={category === cat.id}
                onClick={() => setCategory(cat.id)}
                className={`min-h-9 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  category === cat.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* States */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white p-4"
            />
          ))}
        </div>
      ) : parts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-base font-semibold text-slate-900">
            No parts in {category} for {vehicleName} ({selected.trim.fuel})
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Switch category to All Parts to view every guaranteed-fit component for this engine trim.
          </p>
          <button
            type="button"
            onClick={() => setCategory('All')}
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Show All Compatible Parts
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {parts.map((part) => {
            const qtyInCart = cartQuantities[part.sku] || 0;
            const imgFailed = brokenImages[part.sku];

            return (
              <article
                key={part.id}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div>
                  {/* Product Visual */}
                  <div className="relative aspect-4/3 w-full overflow-hidden rounded-t-xl bg-stone-100">
                    {!imgFailed ? (
                      <img
                        src={part.image_url}
                        alt={part.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [part.sku]: true }))
                        }
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4 text-center">
                        <Wrench className="h-8 w-8 text-slate-400" />
                        <span className="mt-2 text-xs font-medium text-slate-600">
                          {part.brand} {part.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Clean Metadata & Title */}
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-semibold uppercase tracking-wide text-slate-700">
                        {part.brand} · {part.category}
                      </span>
                      <span className="font-mono tabular-nums">OEM #{part.oem_part_number}</span>
                    </div>

                    <h3 className="mt-2 text-base font-semibold leading-snug text-slate-900">
                      {part.title}
                    </h3>

                    {/* Guaranteed Fitment Line */}
                    <div className="mt-2.5 flex items-start gap-1.5 text-xs font-semibold text-emerald-700">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>Guaranteed to Fit {vehicleName}</span>
                    </div>

                    <p className="mt-1.5 text-xs text-slate-600">{part.fitment_notes}</p>
                  </div>
                </div>

                {/* Price & Action Footer */}
                <div className="border-t border-slate-100 px-5 py-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                        ₹{part.price_retail.toLocaleString('en-IN')}
                      </span>
                      <span className="ml-2 font-mono text-xs text-slate-500 tabular-nums">
                        Trade ₹{part.price_trade.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-600">{part.estimated_delivery}</span>
                  </div>

                  <div className="mt-3.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAddToCart(part)}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>{qtyInCart > 0 ? `Add Another (${qtyInCart})` : 'Add to Cart'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectPart(part)}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                    >
                      Specs
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Product Specifications Modal (PDP Details) */}
      {inspectPart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdp-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {inspectPart.brand} · SKU {inspectPart.sku}
                </p>
                <h3 id="pdp-modal-title" className="font-display text-lg font-bold text-slate-900">
                  {inspectPart.title}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close specifications"
                onClick={() => setInspectPart(null)}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
              <div className="aspect-4/3 overflow-hidden rounded-lg bg-stone-100">
                <img
                  src={inspectPart.image_url}
                  alt={inspectPart.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    <span>Guaranteed to Fit {vehicleName}</span>
                  </div>
                  <p className="mt-1 text-emerald-800">{inspectPart.fitment_notes}</p>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between border-b border-slate-100 py-1.5">
                    <span className="text-slate-500">Replaces OEM #</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {inspectPart.oem_part_number}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-1.5">
                    <span className="text-slate-500">Retail Price</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      ₹{inspectPart.price_retail.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 py-1.5">
                    <span className="text-slate-500">Dispatch Hub</span>
                    <span className="text-right text-xs font-medium text-slate-800">
                      {inspectPart.distributor_hub}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Technical Specifications
                  </h4>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {inspectPart.specs.map((spec) => (
                      <li key={spec} className="flex items-center gap-2">
                        <PackageCheck className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(inspectPart);
                    setInspectPart(null);
                  }}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add to Cart — ₹{inspectPart.price_retail.toLocaleString('en-IN')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
