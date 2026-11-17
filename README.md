# AutoVault

**The trusted, intelligent operating system for automotive maintenance, spare parts compatibility, and vehicle end-of-life recycling.**

---

## Problem Statement

Mechanics and car owners waste **15+ hours weekly** cross-referencing incompatible spare parts across unverified merchants, resulting in a **25% fitment return rate** and a **30% counterfeit infiltration risk**. Concurrently, owners of end-of-life vehicles have no transparent, legal way to estimate scrap metal value or obtain official government RTO deregistration and Certificate of Deposit (CoD) tax concessions.

### Core Pain Points Solved
- **Multi-Brand Garage Owners (Rajesh, 38)**: Lose repair bay productivity waiting on wrong brake pads or filters for facelift variants.
- **DIY Enthusiasts (Arjun, 24)**: Face counterfeit risk on open marketplaces when sourcing genuine OEM-grade components (Bosch, Brembo, Denso, Valeo, Uno Minda).
- **Aging Vehicle Owners (Vikram, 52)**: Receive opaque, lowball cash quotes from informal scrap dealers with zero legal deregistration protection.

---

## MVP Features Implemented

1. **Vehicle Selector & AI RC Card Scanner (`/api/v1/ocr/scan-rc`)**
   - Smartphone camera upload (`capture="environment"`) with client-side image compression (`max 1920x1080`, `< 2MB`).
   - Server-side Gemini Vision OCR extracting Registration Number, 17-character VIN/Chassis Number, and Engine Number (last 5 digits), with low-confidence (`< 80%`) field verification prompts.
   - 4-tier cascading manual fallback (`Year -> Make -> Model -> Trim / Fuel Variant`) across the top 15 commuter vehicles (Maruti Suzuki, Hyundai, Tata, Honda).

2. **Context-Locked "Guaranteed Fitment" Catalog (`/api/v1/parts/compatible`)**
   - Locks catalog results strictly to the selected vehicle so incompatible SKUs are never shown.
   - Displays exact OEM replacement cross-references, axle/engine specs, hyperlocal PIN code delivery ETAs, and `"Guaranteed to Fit"` verification.

3. **Dropship Order Routing & Dispatch (`/api/v1/orders`)**
   - Lightweight mobile-first checkout supporting UPI (GPay, PhonePe, Paytm), Cards, and Workshop-only COD.
   - Generates formatted Tier-1 distributor WhatsApp & Email dispatch notifications immediately on confirmation.

4. **Algorithmic Scrap Valuation Calculator (`/api/v1/scrap/estimate`, `/api/v1/scrap/leads`)**
   - Computes base scrap value from curb weight (`-15%` fluid/glass), live scrap steel index (`₹/kg`), catalytic converter & battery recovery, condition multipliers, and standard towing/RTO filing fees.
   - Displays Certificate of Deposit (CoD) tax concession benefits and captures doorstep RVSF inspection & towing leads.

5. **PWA Installability**
   - Web App Manifest, offline service worker caching, and in-app install controls.

---

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Motion
- **Backend**: Node.js, Express, TypeScript (`tsx`)
- **AI OCR**: `@google/genai` (`gemini-4-hydrogen` structured JSON extraction via server-side route)

---

## Local Development

```bash
npm install
cp .env.example .env   # Configure GEMINI_API_KEY
npm run dev            # Runs Express + Vite on http://localhost:3000
```

## Documentation

See [`PRD.md`](./PRD.md) for the complete Product Requirements Document (v1.0 MVP Scope), database schema, REST API contracts, NFRs, and 8-week sprint roadmap.
