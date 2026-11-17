import React, { useState } from 'react';
import { Check, Copy, Database, GitBranch, Layers, ShieldAlert } from 'lucide-react';

export const PrdDocsView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const gitPushCmd = `git remote add origin https://github.com/<your-username>/autovault-mvp.git\ngit branch -M main\ngit push -u origin main`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gitPushCmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard fallback ignored
    }
  };

  return (
    <section className="space-y-8">
      {/* Header Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
              Product Requirements Document · v1.0 MVP Scope
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">
              AutoVault Problem Statement &amp; Engineering Specification
            </h2>
          </div>
          <span className="font-mono text-xs text-slate-500">
            8-Week Build Cycle · Mobile-First PWA
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h3 className="font-display text-base font-bold text-slate-900">
              Core Problem Statement
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Mechanics and car owners waste 15+ hours weekly cross-referencing incompatible parts across unverified merchants, resulting in a 25% return rate and a 30% counterfeit infiltration risk. Concurrently, owners of end-of-life vehicles have no transparent, legal way to estimate scrap value or obtain official government RTO deregistration.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-display text-sm font-bold text-slate-900">KPI Target Dashboard</h3>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-600">OCR Scan Accuracy</dt>
                <dd className="font-mono font-bold text-slate-900 tabular-nums">&ge; 92%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Return Error Rate</dt>
                <dd className="font-mono font-bold text-slate-900 tabular-nums">&le; 4.5%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Catalog Query Latency</dt>
                <dd className="font-mono font-bold text-slate-900 tabular-nums">&lt; 400 ms</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Quote-to-Lead Conv.</dt>
                <dd className="font-mono font-bold text-slate-900 tabular-nums">&ge; 18%</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Personas */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          {
            name: 'Rajesh, 38 — Garage Owner',
            pain: 'Receives incompatible brake pads for facelift trims and loses 3 hours waiting on part exchanges.',
            story: 'Photographs customer RC card to lock exact OEM brake pads and filters immediately.',
          },
          {
            name: 'Arjun, 24 — DIY Enthusiast',
            pain: 'High counterfeit risk on open marketplaces for iridium spark plugs and ceramic pads.',
            story: 'Orders verified Bosch, Brembo, and Denso components with OEM provenance cross-reference.',
          },
          {
            name: 'Vikram, 52 — 16-Year-Old Car Owner',
            pain: 'Local scrap dealers give lowball offers and skip legal RTO deregistration paperwork.',
            story: 'Gets transparent weight-indexed scrap valuation, CoD tax credit info, and RVSF towing.',
          },
        ].map((p) => (
          <div key={p.name} className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-display text-base font-bold text-slate-900">{p.name}</h3>
            <p className="mt-2 text-xs text-slate-500">Pain Point</p>
            <p className="mt-0.5 text-sm text-slate-700">{p.pain}</p>
            <p className="mt-3 text-xs text-slate-500">MVP Workflow</p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">{p.story}</p>
          </div>
        ))}
      </div>

      {/* Architecture & Schema Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-slate-900">
            <Layers className="h-5 w-5 text-orange-600" />
            <h3 className="font-display text-lg font-bold">8-Week Execution Roadmap</h3>
          </div>
          <ol className="mt-4 space-y-3 text-sm text-slate-700">
            <li>
              <span className="font-mono font-semibold text-slate-900">Weeks 1–2:</span> Normalized vehicle &amp; compatibility matrix seeded for top 15 commuter cars and consumable SKUs.
            </li>
            <li>
              <span className="font-mono font-semibold text-slate-900">Weeks 3–4:</span> REST backend, Gemini Vision RC OCR pipeline, and algorithmic scrap valuation engine.
            </li>
            <li>
              <span className="font-mono font-semibold text-slate-900">Weeks 5–6:</span> Mobile-first PWA storefront, camera capture, cart, checkout, and WhatsApp dispatch webhooks.
            </li>
            <li>
              <span className="font-mono font-semibold text-slate-900">Weeks 7–8:</span> Tier-1 distributor onboarding, 5-workshop closed pilot, and production deployment.
            </li>
          </ol>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-slate-900">
            <Database className="h-5 w-5 text-orange-600" />
            <h3 className="font-display text-lg font-bold">Relational Schema &amp; Contracts</h3>
          </div>
          <ul className="mt-4 space-y-2.5 font-mono text-xs text-slate-700">
            <li>vehicles (id, make, model, year_start, year_end, curb_weight_kg)</li>
            <li>parts (id, sku, oem_part_number, category, brand, price_retail, price_trade)</li>
            <li>compatibility_matrix (vehicle_id, part_id, fitment_notes)</li>
            <li>scrap_leads (id, user_phone, vehicle_id, model_year, condition, quote_range)</li>
          </ul>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>
              Both <code className="font-mono font-semibold text-slate-900">README.md</code> (Problem Statement) and <code className="font-mono font-semibold text-slate-900">PRD.md</code> (Full PRD) are committed in the project root.
            </span>
          </div>
        </div>
      </div>

      {/* GitHub Push Helper */}
      <div className="rounded-xl border border-slate-200 bg-slate-900 p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <GitBranch className="h-5 w-5 text-orange-400" />
            <h3 className="font-display text-lg font-bold">
              Push Repository (Code + Problem Statement + PRD) to GitHub
            </h3>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Commands'}</span>
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          This workspace commits the full source code, <code className="font-mono text-white">README.md</code>, and <code className="font-mono text-white">PRD.md</code> locally. Attach your GitHub repository remote and push using:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-200">
          {gitPushCmd}
        </pre>
      </div>
    </section>
  );
};
