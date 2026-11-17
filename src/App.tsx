import { useEffect, useState } from 'react';
import { ArrowRight, Camera, CheckCircle2, Scale, ShieldCheck, Wrench } from 'lucide-react';
import {
  HERO_WORKSHOP_IMAGE,
  VEHICLES,
  type CompatiblePartResult,
  type VehicleModel,
} from './data/catalog';
import { Header, type ActiveSection } from './components/Header';
import { VehicleContextBar, type SelectedVehicleState } from './components/VehicleContextBar';
import { CatalogSection } from './components/CatalogSection';
import { ScrapCalculator } from './components/ScrapCalculator';
import { CartDrawer, type CartItem } from './components/CartDrawer';
import { PrdDocsView } from './components/PrdDocsView';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';

export default function App() {
  const [vehicles, setVehicles] = useState<VehicleModel[]>(VEHICLES);
  const [activeSection, setActiveSection] = useState<ActiveSection>('catalog');
  const [focusScanner, setFocusScanner] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<SelectedVehicleState>({
    vehicle: VEHICLES[0],
    trim: VEHICLES[0].trims[1] || VEHICLES[0].trims[0],
    year: 2019,
    source: 'manual',
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  useEffect(() => {
    fetch('/api/v1/vehicles')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.vehicles?.length) {
          setVehicles(data.vehicles);
        }
      })
      .catch(() => {
        // Keep seeded initial vehicles if offline
      });
  }, []);

  const handleNavigate = (section: ActiveSection) => {
    setActiveSection(section);
    setFocusScanner(section === 'scanner');

    if (section === 'scanner') {
      setTimeout(() => {
        document.getElementById('vehicle-scanner')?.scrollIntoView({ behavior: 'smooth' });
      }, 40);
    } else if (section === 'catalog') {
      setTimeout(() => {
        document.getElementById('parts-catalog')?.scrollIntoView({ behavior: 'smooth' });
      }, 40);
    } else if (section === 'scrap') {
      setTimeout(() => {
        document.getElementById('scrap-calculator')?.scrollIntoView({ behavior: 'smooth' });
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddToCart = (part: CompatiblePartResult) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.part.sku === part.sku);
      if (existing) {
        return prev.map((i) => (i.part.sku === part.sku ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { part, qty: 1 }];
    });
    setAddedToast(`${part.title} added to cart`);
    setTimeout(() => setAddedToast(null), 2600);
  };

  const handleUpdateQty = (sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.part.sku === sku ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const handleRemoveItem = (sku: string) => {
    setCart((prev) => prev.filter((item) => item.part.sku !== sku));
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartQuantities = cart.reduce<Record<string, number>>((acc, item) => {
    acc[item.part.sku] = item.qty;
    return acc;
  }, {});

  const vehicleSummary = `${selectedVehicle.year} ${selectedVehicle.vehicle.make} ${selectedVehicle.vehicle.model} ${selectedVehicle.trim.label}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        activeSection={activeSection}
        onNavigate={handleNavigate}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
        {activeSection === 'docs' ? (
          <PrdDocsView />
        ) : (
          <>
            {/* Hero Section: 2-Column Balanced Split */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="grid grid-cols-1 items-stretch lg:grid-cols-12">
                <div className="flex flex-col justify-between p-6 sm:p-10 lg:col-span-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
                      Workshop-Grade Compatibility &amp; Vehicle Recycling
                    </p>
                    <h1
                      className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
                      style={{ textWrap: 'balance' }}
                    >
                      Exact-fit OEM spare parts and fair legal scrap quotes in seconds.
                    </h1>
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                      Scan a customer RC card or select from the top 15 commuter models to lock 100% guaranteed-fit maintenance parts from authorized Tier-1 distributors, or calculate instant RVSF scrap value.
                    </p>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleNavigate('scanner')}
                      className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 whitespace-nowrap"
                    >
                      <Camera className="h-4 w-4" aria-hidden="true" />
                      <span>Scan RC Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigate('scrap')}
                      className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
                    >
                      <Scale className="h-4 w-4" aria-hidden="true" />
                      <span>Estimate Scrap Value</span>
                    </button>
                  </div>
                </div>

                <div className="relative min-h-64 bg-slate-900 lg:col-span-6">
                  {!heroImgFailed ? (
                    <img
                      src={HERO_WORKSHOP_IMAGE}
                      alt="Mechanic inspecting front brake assembly in modern multi-brand automotive service bay"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="h-full w-full object-cover lg:h-full"
                    />
                  ) : (
                    <div className="flex h-full min-h-64 flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-8 text-center text-white">
                      <Wrench className="h-10 w-10 text-orange-500" />
                      <p className="mt-3 font-display text-lg font-semibold">
                        AutoVault Multi-Brand Service Bay
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 4-Column Trust & KPI Strip Below Hero Split */}
              <div className="grid grid-cols-2 divide-y divide-slate-200 border-t border-slate-200 bg-slate-50 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                <div className="p-4 sm:px-6">
                  <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">15 Models</p>
                  <p className="mt-0.5 text-xs text-slate-600">Maruti, Hyundai, Tata, Honda</p>
                </div>
                <div className="p-4 sm:px-6">
                  <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">&le; 4.5%</p>
                  <p className="mt-0.5 text-xs text-slate-600">Target Fitment Return Rate</p>
                </div>
                <div className="p-4 sm:px-6">
                  <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">45 Mins</p>
                  <p className="mt-0.5 text-xs text-slate-600">Tier-1 Hub Courier Pickup</p>
                </div>
                <div className="p-4 sm:px-6">
                  <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">100% Legal</p>
                  <p className="mt-0.5 text-xs text-slate-600">RVSF Towing &amp; CoD Tax Credit</p>
                </div>
              </div>
            </section>

            {/* Feature 1: Vehicle Context & AI RC Card Scanner */}
            <VehicleContextBar
              vehicles={vehicles}
              selected={selectedVehicle}
              onSelectVehicle={setSelectedVehicle}
              focusScanner={focusScanner}
            />

            {/* Feature 2: Guaranteed Fitment Parts Catalog */}
            <CatalogSection
              selected={selectedVehicle}
              onAddToCart={handleAddToCart}
              cartQuantities={cartQuantities}
            />

            {/* Feature 4: Algorithmic Instant Scrap Valuation Calculator */}
            <ScrapCalculator
              vehicles={vehicles}
              defaultVehicleId={selectedVehicle.vehicle.id}
            />
          </>
        )}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span>AutoVault · Verified OEM Parts &amp; RVSF Recycling</span>
            </div>
            <p className="text-xs text-slate-500">
              v1.0 MVP · Zero-inventory Tier-1 distributor dropship routing
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => handleNavigate('docs')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              <span>View Problem Statement &amp; PRD</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </footer>

      {/* Cart & Checkout Drawer */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        vehicleSummary={vehicleSummary}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCart([])}
      />

      {/* Non-intrusive Add-to-Cart Feedback */}
      {addedToast && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{addedToast}</span>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="text-orange-400 underline hover:text-orange-300"
          >
            View Cart
          </button>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}
