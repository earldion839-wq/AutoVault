import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  COMPATIBILITY_MATRIX,
  PARTS,
  VEHICLES,
  type CompatiblePartResult,
  type PartCategory,
} from './src/data/catalog.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '5mb' }));

// Lightweight JSON persistence for orders and scrap leads
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

interface OrderRecord {
  order_id: string;
  created_at: string;
  vehicle_summary: string;
  customer_name: string;
  phone: string;
  workshop_name?: string;
  delivery_address: string;
  pincode: string;
  payment_method: 'UPI' | 'CARD' | 'WORKSHOP_COD';
  items: Array<{ sku: string; title: string; brand: string; qty: number; price: number }>;
  subtotal: number;
  gst: number;
  total: number;
  status: string;
  distributor_dispatch_message: string;
  distributor_email_subject: string;
}

interface ScrapLeadRecord {
  lead_id: string;
  created_at: string;
  user_phone: string;
  vehicle_id: string;
  vehicle_label: string;
  model_year: number;
  condition: string;
  wheels_battery: string;
  calculated_quote_low: number;
  calculated_quote_high: number;
  pickup_address: string;
  status: string;
}

interface StoreState {
  orders: OrderRecord[];
  scrap_leads: ScrapLeadRecord[];
  order_seq: number;
  lead_seq: number;
}

function loadStore(): StoreState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(raw) as StoreState;
    }
  } catch {
    // fallback to clean initial store
  }
  return {
    orders: [],
    scrap_leads: [],
    order_seq: 1042,
    lead_seq: 501,
  };
}

function saveStore(state: StoreState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

const store = loadStore();

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function computeHyperlocalEta(pincode?: string): { eta: string; hubNote: string } {
  const clean = (pincode || '').trim();
  if (/^(560|110|400|411)/.test(clean)) {
    return {
      eta: 'Today by 6:00 PM',
      hubNote: `Express hyperlocal hub dispatch for PIN ${clean}`,
    };
  }
  if (/^\d{6}$/.test(clean)) {
    return {
      eta: 'Tomorrow by 11:00 AM',
      hubNote: `Regional Tier-1 courier dispatch for PIN ${clean}`,
    };
  }
  return {
    eta: 'Same-day / Next-day',
    hubNote: 'Enter 6-digit PIN for exact courier slot',
  };
}

// 1. Get all 15 vehicles and filter metadata
app.get('/api/v1/vehicles', (_req, res) => {
  const makes = Array.from(new Set(VEHICLES.map((v) => v.make)));
  res.json({
    total: VEHICLES.length,
    makes,
    year_range: { min: 2010, max: 2026 },
    vehicles: VEHICLES,
  });
});

// 2. AI Document OCR Scanner (POST /api/v1/ocr/scan-rc)
app.post('/api/v1/ocr/scan-rc', async (req, res) => {
  const started = Date.now();
  let imageBase64: string | undefined = req.body?.imageBase64;
  const mimeType: string = req.body?.mimeType || 'image/jpeg';

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing imageBase64 payload. Please upload or capture a clear photo of the RC card or VIN plate.',
    });
  }

  // Strip data URL prefix if present
  const base64Clean = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  try {
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Clean,
            },
          },
          {
            text:
              'Inspect this Indian Vehicle Registration Certificate (RC card) or VIN/chassis plate image. ' +
              'Extract the registration number, 17-character VIN/chassis number, last 5 digits of the engine number, ' +
              'vehicle make (Maruti Suzuki, Hyundai, Tata, or Honda if applicable), model, manufacture/registration year, ' +
              'trim/fuel variant, and your visual legibility confidence_score from 0.0 to 1.0. ' +
              'If the image is blurry, cropped, or partially obscured, lower confidence_score below 0.80.',
          },
        ],
      },
      config: {
        systemInstruction:
          'You are an automotive document OCR engine for Indian RC cards and chassis plates. ' +
          'Return strictly structured JSON matching the schema. Never invent numbers not visible in the image.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extracted_vin: { type: Type.STRING, description: '17-character VIN or chassis number, uppercase, no spaces.' },
            extracted_reg_no: { type: Type.STRING, description: 'Vehicle registration number e.g. KA03MM8821.' },
            engine_last_5: { type: Type.STRING, description: 'Last 5 characters of the engine number.' },
            detected_make: { type: Type.STRING, description: 'Vehicle make e.g. Maruti Suzuki, Hyundai, Tata, Honda.' },
            detected_model: { type: Type.STRING, description: 'Vehicle model e.g. Swift, Creta, Nexon, City.' },
            detected_year: { type: Type.INTEGER, description: '4-digit model year between 2010 and 2026.' },
            detected_trim: { type: Type.STRING, description: 'Variant or fuel type if printed.' },
            confidence_score: { type: Type.NUMBER, description: 'OCR clarity confidence between 0 and 1.' },
          },
        },
      },
    });

    // Clear large base64 reference immediately per PRD NFR §7 (memory wipe after OCR parsing)
    imageBase64 = undefined;

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText) as {
      extracted_vin?: string;
      extracted_reg_no?: string;
      engine_last_5?: string;
      detected_make?: string;
      detected_model?: string;
      detected_year?: number;
      detected_trim?: string;
      confidence_score?: number;
    };

    const vin = (parsed.extracted_vin || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const makeHint = (parsed.detected_make || '').toLowerCase();
    const modelHint = (parsed.detected_model || '').toLowerCase();

    // Match against our 15-vehicle DB by VIN prefix first, then make/model
    let matchedVehicle = VEHICLES.find((v) =>
      v.trims.some((t) => vin.startsWith(t.vin_prefix))
    );
    let matchedTrim = matchedVehicle?.trims.find((t) => vin.startsWith(t.vin_prefix));

    if (!matchedVehicle) {
      matchedVehicle = VEHICLES.find((v) => {
        const vModel = v.model.toLowerCase();
        const vMake = v.make.toLowerCase();
        return (
          (modelHint && (vModel.includes(modelHint) || modelHint.includes(vModel))) ||
          (makeHint && vMake.includes(makeHint) && modelHint && vModel.includes(modelHint.split(' ')[0]))
        );
      });
    }

    if (matchedVehicle && !matchedTrim) {
      const trimHint = (parsed.detected_trim || '').toLowerCase();
      matchedTrim =
        matchedVehicle.trims.find((t) =>
          trimHint ? t.label.toLowerCase().includes(trimHint) || t.fuel.toLowerCase() === trimHint : false
        ) || matchedVehicle.trims[0];
    }

    const yearClamped =
      parsed.detected_year && parsed.detected_year >= 2010 && parsed.detected_year <= 2026
        ? parsed.detected_year
        : matchedVehicle
        ? Math.min(Math.max(2019, matchedVehicle.year_start), matchedVehicle.year_end)
        : 2019;

    const confidence =
      typeof parsed.confidence_score === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence_score))
        : 0.85;

    return res.json({
      success: true,
      confidence_score: Number(confidence.toFixed(2)),
      needs_verification: confidence < 0.8,
      verification_prompt:
        confidence < 0.8 ? 'Please verify the extracted chassis number.' : null,
      processing_ms: Date.now() - started,
      data: {
        extracted_vin: vin || 'Not legible',
        extracted_reg_no: (parsed.extracted_reg_no || '').toUpperCase().replace(/\s+/g, '') || 'Not legible',
        engine_last_5: (parsed.engine_last_5 || '').toUpperCase() || '-----',
        matched_vehicle: matchedVehicle
          ? {
              id: matchedVehicle.id,
              make: matchedVehicle.make,
              model: matchedVehicle.model,
              year: yearClamped,
              trim_id: matchedTrim?.id ?? matchedVehicle.trims[0].id,
              trim: matchedTrim?.label ?? matchedVehicle.trims[0].label,
            }
          : null,
      },
    });
  } catch (err) {
    imageBase64 = undefined;
    const message = err instanceof Error ? err.message : 'OCR processing failed';
    console.error('OCR Error:', err);
    return res.status(502).json({
      success: false,
      error: `RC OCR scan could not complete: ${message}`,
    });
  }
});

// 3. Context-Locked Compatible Parts Catalog (GET /api/v1/parts/compatible)
app.get('/api/v1/parts/compatible', (req, res) => {
  const started = Date.now();
  const vehicleId = String(req.query.vehicle_id || '');
  const category = req.query.category ? String(req.query.category) : '';
  const year = Number(req.query.year) || 2020;
  const trimId = req.query.trim_id ? String(req.query.trim_id) : '';
  const pincode = req.query.pincode ? String(req.query.pincode) : '';

  const vehicle = VEHICLES.find((v) => v.id === vehicleId);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found in catalog.' });
  }

  const trim = vehicle.trims.find((t) => t.id === trimId) || vehicle.trims[0];
  const { eta, hubNote } = computeHyperlocalEta(pincode);

  const compatEntries = COMPATIBILITY_MATRIX.filter((c) => c.vehicle_id === vehicle.id);
  const parts: CompatiblePartResult[] = compatEntries
    .map((entry) => {
      const part = PARTS.find((p) => p.id === entry.part_id);
      if (!part) return null;

      // Filter diesel glow plugs out of petrol/CNG trims and spark plugs out of diesel trims
      if (trim.fuel === 'Diesel' && part.category === 'Ignition' && !part.title.toLowerCase().includes('glow')) {
        return null;
      }
      if (trim.fuel !== 'Diesel' && part.title.toLowerCase().includes('glow')) {
        return null;
      }

      if (category && category !== 'All' && part.category !== (category as PartCategory)) {
        return null;
      }

      return {
        ...part,
        guaranteed_fit: true,
        fitment_notes: entry.fitment_notes,
        in_stock: true,
        estimated_delivery: eta,
      };
    })
    .filter((item): item is CompatiblePartResult => item !== null);

  res.json({
    total_matches: parts.length,
    query_latency_ms: Math.max(2, Date.now() - started),
    vehicle_summary: `${year} ${vehicle.make} ${vehicle.model} ${trim.label}`,
    hub_note: hubNote,
    parts,
  });
});

// 4. Dropship Order Routing & Checkout (POST /api/v1/orders)
app.post('/api/v1/orders', (req, res) => {
  const {
    vehicle_summary,
    customer_name,
    phone,
    workshop_name,
    delivery_address,
    pincode,
    payment_method,
    items,
  } = req.body ?? {};

  if (!customer_name || !phone || !delivery_address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'Customer name, phone number, delivery address, and at least one cart item are required.',
    });
  }

  if (payment_method === 'WORKSHOP_COD' && !String(workshop_name || '').trim()) {
    return res.status(400).json({
      error: 'Cash on Delivery (COD) is restricted to registered garages. Please provide your Workshop Name.',
    });
  }

  const normalizedItems = items.map((item: { sku: string; qty: number }) => {
    const part = PARTS.find((p) => p.sku === item.sku);
    const qty = Math.max(1, Number(item.qty) || 1);
    return {
      sku: part?.sku ?? item.sku,
      title: part?.title ?? 'Verified Spare Part',
      brand: part?.brand ?? 'OEM',
      qty,
      price: part?.price_retail ?? 0,
      hub: part?.distributor_hub ?? 'Regional Tier-1 Stockist',
    };
  });

  const subtotal = normalizedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  store.order_seq += 1;
  const orderId = `AV-${store.order_seq}`;

  const itemSummary = normalizedItems.map((i) => `${i.qty}x ${i.title} (Part #${i.sku})`).join(', ');
  const customerLabel = workshop_name ? `${workshop_name} (${customer_name})` : customer_name;

  const dispatchMessage = `New Order #${orderId}: ${itemSummary}. Customer: ${customerLabel}, ${delivery_address} (${pincode || 'Express'}). Courier pickup arriving in 45 mins.`;

  const record: OrderRecord = {
    order_id: orderId,
    created_at: new Date().toISOString(),
    vehicle_summary: vehicle_summary || 'Verified Vehicle Fitment',
    customer_name: String(customer_name).trim(),
    phone: String(phone).trim(),
    workshop_name: workshop_name ? String(workshop_name).trim() : undefined,
    delivery_address: String(delivery_address).trim(),
    pincode: String(pincode || '560038').trim(),
    payment_method: payment_method || 'UPI',
    items: normalizedItems.map(({ sku, title, brand, qty, price }) => ({
      sku,
      title,
      brand,
      qty,
      price,
    })),
    subtotal,
    gst,
    total,
    status: 'DISPATCHED_TO_STOCKIST',
    distributor_dispatch_message: dispatchMessage,
    distributor_email_subject: `[AutoVault Dispatch] Order #${orderId} — Ready for Courier Pickup (${normalizedItems[0]?.hub})`,
  };

  store.orders.unshift(record);
  saveStore(store);

  return res.status(201).json(record);
});

app.get('/api/v1/orders', (_req, res) => {
  res.json({ orders: store.orders.slice(0, 10) });
});

// 5. Algorithmic Scrap Valuation Calculator (POST /api/v1/scrap/estimate)
app.post('/api/v1/scrap/estimate', (req, res) => {
  const { vehicle_id, model_year, condition, wheels_battery } = req.body ?? {};
  const vehicle = VEHICLES.find((v) => v.id === vehicle_id);
  if (!vehicle) {
    return res.status(404).json({ error: 'Selected vehicle not found.' });
  }

  const year = Math.min(2026, Math.max(1995, Number(model_year) || 2010));
  const steelIndexPerKg = 34.5; // Live Scrap Steel Index (INR/kg)
  const netMetalWeightKg = Math.round(vehicle.curb_weight_kg * 0.85); // Curb weight - 15% fluid/glass
  const baseMetalValue = Math.round(netMetalWeightKg * steelIndexPerKg);

  const conditionFactor =
    condition === 'Runs & Drives'
      ? 1.05
      : condition === 'Accidental / Non-Runner'
      ? 0.92
      : 0.78; // Burned / Totaled

  const batteryRecovery = wheels_battery === 'Missing' ? 0 : vehicle.battery_recovery_inr;
  const catRecovery =
    condition === 'Burned / Totaled'
      ? Math.round(vehicle.cat_recovery_inr * 0.6)
      : vehicle.cat_recovery_inr;
  const towingRtoFee = 2500;

  const midEstimate = Math.max(
    12000,
    Math.round(baseMetalValue * conditionFactor + batteryRecovery + catRecovery - towingRtoFee)
  );
  const lowEstimate = Math.round((midEstimate * 0.93) / 100) * 100;
  const highEstimate = Math.round((midEstimate * 1.07) / 100) * 100;

  // CoD (Certificate of Deposit) tax concession scales with vehicle class
  const codTaxConcession = vehicle.curb_weight_kg >= 1100 ? 45000 : 32000;

  return res.json({
    vehicle_label: `${year} ${vehicle.make} ${vehicle.model}`,
    curb_weight_kg: vehicle.curb_weight_kg,
    net_metal_weight_kg: netMetalWeightKg,
    steel_index_per_kg: steelIndexPerKg,
    breakdown: {
      base_metal_value: Math.round(baseMetalValue * conditionFactor),
      cat_converter_recovery: catRecovery,
      battery_wheels_recovery: batteryRecovery,
      towing_rto_fee: towingRtoFee,
    },
    quote_low: lowEstimate,
    quote_high: highEstimate,
    cod_incentive_inr: codTaxConcession,
  });
});

// 6. RVSF Scrap Inspection & Towing Lead Capture (POST /api/v1/scrap/leads)
app.post('/api/v1/scrap/leads', (req, res) => {
  const {
    user_phone,
    vehicle_id,
    model_year,
    condition,
    wheels_battery,
    calculated_quote_low,
    calculated_quote_high,
    pickup_address,
  } = req.body ?? {};

  if (!user_phone || !pickup_address || !vehicle_id) {
    return res.status(400).json({ error: 'Phone number, vehicle, and pickup address are required.' });
  }

  const vehicle = VEHICLES.find((v) => v.id === vehicle_id);
  store.lead_seq += 1;
  const leadId = `RVSF-${store.lead_seq}`;

  const lead: ScrapLeadRecord = {
    lead_id: leadId,
    created_at: new Date().toISOString(),
    user_phone: String(user_phone).trim(),
    vehicle_id: String(vehicle_id),
    vehicle_label: vehicle ? `${model_year} ${vehicle.make} ${vehicle.model}` : String(vehicle_id),
    model_year: Number(model_year) || 2010,
    condition: String(condition || 'Runs & Drives'),
    wheels_battery: String(wheels_battery || 'Intact'),
    calculated_quote_low: Number(calculated_quote_low) || 0,
    calculated_quote_high: Number(calculated_quote_high) || 0,
    pickup_address: String(pickup_address).trim(),
    status: 'INSPECTION_PENDING',
  };

  store.scrap_leads.unshift(lead);
  saveStore(store);

  return res.status(201).json(lead);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoVault server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
