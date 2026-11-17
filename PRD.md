# Product Requirements Document (PRD)

**Product Name:** AutoVault  
**Document Version:** v1.0 (MVP Scope)  
**Author:** Senior Product Manager & Software Architect  
**Target Release Window:** 8-Week Build Cycle  
**Document Status:** Ready for Engineering Review  

---

## 1. Document Overview & Metadata

| Field | Detail |
| :--- | :--- |
| **Product Vision** | The trusted, intelligent operating system for automotive maintenance, spare parts compatibility, and vehicle end-of-life recycling. |
| **MVP Focus** | A mobile-first web platform featuring AI-powered VIN/RC card OCR scanning, 100% Guaranteed Fitment catalog routing, and an algorithmic vehicle scrap valuation estimator across the top 15 commuter car models. |
| **Target Audience** | Multi-brand garage mechanics, DIY car enthusiasts, and aging vehicle owners. |
| **Target Platforms** | Mobile-Responsive Web Application (Progressive Web App - PWA), optimized for Android and iOS browsers. |

---

## 2. Strategic Objectives & Success Metrics

### 2.1 The Core Problem Being Solved (MVP Focus)
Mechanics and car owners waste 15+ hours weekly cross-referencing incompatible parts across unverified merchants, resulting in a 25% return rate and a 30% counterfeit infiltration risk. Concurrently, owners of end-of-life vehicles have no transparent, legal way to estimate scrap value or obtain official government deregistration.

### 2.2 Business Objectives
- **Zero Inventory Risk:** Validate the dropshipping supply chain by routing 100% of orders directly to authorized Tier-1 distributors.
- **Build Trust Through Accuracy:** Reduce customer return rates to under 5% by enforcing the "Guaranteed Fitment" validation engine.
- **Capture Immediate Organic Traffic:** Drive low-cost user acquisition through the "Free AI RC Scanner" and "Instant Car Scrap Valuation" tools.

### 2.3 Success Metrics (Key Performance Indicators)
- **North Star Metric:** Successful Verified Transactions (Orders delivered with zero fitment returns).
- **OCR Scan Accuracy:** `≥ 92%` correct extraction of VIN/Chassis number on unconstrained smartphone photos.
- **Return Error Rate:** `≤ 4.5%` on confirmed fitment orders.
- **Catalog Search Latency:** `< 400 ms` for vehicle-to-part query responses.
- **Quote-to-Lead Conversion:** `≥ 18%` (with `≥ 25%` scrap calculator engagement proceeding to request callback/inspection).

---

## 3. Target Personas & Core User Stories

### Persona 1: Rajesh, 38 — Independent Multi-Brand Garage Owner
- **Pain Point:** Spends hours calling wholesale distributors; often receives wrong brake pads for newer facelift models; loses repair bay productivity.
- **User Story:** *"As a workshop mechanic, I want to photograph a customer's RC card and instantly see the exact OEM brake pads and filters that fit, so I don't waste 3 hours waiting for exchanged parts."*

### Persona 2: Arjun, 24 — Automotive Enthusiast & DIYer
- **Pain Point:** Terrified of counterfeit spark plugs and brake rotors on open marketplaces; wants verified genuine Bosch or Brembo upgrades with proof of authenticity.
- **User Story:** *"As a car enthusiast, I want to buy performance parts with a 100% genuine provenance guarantee, so I know I'm not installing dangerous fake parts in my car."*

### Persona 3: Vikram, 52 — Owner of a 16-Year-Old Car
- **Pain Point:** Local scrap dealers offer lowball cash offers and refuse to handle legal RTO paperwork.
- **User Story:** *"As an owner of an end-of-life car, I want an instant fair scrap quote based on current metal prices and certified doorstep towing with RTO deregistration, so I am not held liable for vehicle misuse."*

---

## 4. Scope Definition: MVP vs. Post-MVP

| In-Scope (MVP) | Out-of-Scope (Post-MVP) |
| :--- | :--- |
| Top 15 high-volume car models (Maruti, Hyundai, Tata, Honda) | Complete 500,000+ national parts catalog |
| High-wear maintenance parts (filters, pads, plugs, wipers) | Complex structural body panels, engine internal overhauls |
| Smartphone photo upload for RC card OCR parsing | Real-time live camera AR video overlay |
| Relational "Guaranteed Fitment" badge | P2P used parts condition computer-vision grading |
| Algorithmic scrap valuation calculator | Direct integration with national banking credit lines |
| Automated WhatsApp/Email order dispatch to distributors | Native iOS and Android store binaries (APK/IPA) |
| Razorpay / UPI digital payment gateway | Multi-warehouse automated freight routing |

---

## 5. Functional Specifications & Feature Requirements

### Feature 1: Vehicle Selector & AI Document Scanner
- **Manual Hierarchy Selector:** Fallback 4-tier cascading dropdown: `Year (2010–2026) → Make → Model → Trim / Fuel Variant`.
- **Document Upload:** HTML5 file input supporting native smartphone camera capture (`capture="environment"`) with client-side compression (`max 1920x1080`, `< 2MB`).
- **OCR Processing:** Extract Vehicle Registration Number, 17-character VIN/Chassis Number, and Engine Number (last 5 digits).
- **Error Handling:** If OCR confidence is `< 80%`, highlight detected fields in yellow/amber and prompt: *"Please verify the extracted chassis number."*

### Feature 2: Guaranteed Fitment Parts Catalog
- **Context-Locked Catalog:** Once a vehicle is selected, the catalog locks to that vehicle so incompatible components are hidden.
- **Guaranteed Fitment Indicator:** Every compatible SKU displays `Guaranteed to Fit [Year Make Model]`.
- **Product Information Architecture:** Studio product photo, brand identity (`Bosch`, `Uno Minda`, `Valeo`, `Brembo`, `Denso`, `Mahle`), exact OEM replacement number, physical specs, and PIN code delivery ETA.

### Feature 3: Dropship Order Routing & Checkout
- **Cart & Checkout:** Requests Name, Phone Number, Delivery Address, and Workshop Name (optional).
- **Payment Processing:** UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards, and Cash on Delivery (COD) restricted to registered workshops.
- **Automated Order Dispatch:** Generates formatted WhatsApp & Email dispatch notice to regional Tier-1 stockist and sends customer tracking link.

### Feature 4: Algorithmic Instant Scrap Valuation Calculator
```
Base Scrap Value = (Curb Weight - 15% Fluid/Glass) × Live Scrap Steel Index (₹/kg)
                 + High-Value Recovery (Battery + Cat Converter)
                 - Standard Towing & RTO Filing Fee (₹2,500)
```
- **Input Fields:** Year, Make, Model, Condition (`Runs & Drives` | `Accidental / Non-Runner` | `Burned / Totaled`), Wheels/Battery (`Intact` | `Missing`).
- **Instant Quote Card:** Estimated Scrap Payout range + Government Certificate of Deposit (CoD) tax concession benefits.
- **Lead Capture CTA:** *"Schedule Free Doorstep Inspection & Towing"* capturing Phone Number and Pickup Address for partner RVSF dispatch.

---

## 6. Relational Database Schema (PostgreSQL Reference)

```sql
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    generation VARCHAR(50),
    year_start INT NOT NULL,
    year_end INT,
    engine_type VARCHAR(50),
    displacement_cc INT,
    curb_weight_kg INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    oem_part_number VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    price_retail DECIMAL(10,2) NOT NULL,
    price_trade DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    is_performance_mod BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE compatibility_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    part_id UUID REFERENCES parts(id) ON DELETE CASCADE,
    fitment_notes VARCHAR(255),
    CONSTRAINT unique_vehicle_part UNIQUE (vehicle_id, part_id)
);

CREATE TABLE scrap_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_phone VARCHAR(20) NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id),
    model_year INT NOT NULL,
    condition VARCHAR(50) NOT NULL,
    calculated_quote_low DECIMAL(10,2),
    calculated_quote_high DECIMAL(10,2),
    pickup_address TEXT,
    status VARCHAR(50) DEFAULT 'LEAD_SUBMITTED'
);
```

---

## 7. API Contract Specifications

- `POST /api/v1/ocr/scan-rc`: Parses RC/VIN image and maps to matched vehicle record with confidence score.
- `GET /api/v1/parts/compatible?vehicle_id={id}&category={string}`: Returns vehicle-locked compatible parts and hyperlocal delivery ETA.
- `POST /api/v1/orders`: Validates checkout payload and triggers Tier-1 distributor dispatch format.
- `POST /api/v1/scrap/estimate`: Calculates algorithmic scrap valuation range and CoD incentive estimate.
- `POST /api/v1/scrap/leads`: Submits RVSF inspection and towing lead.

---

## 8. Non-Functional Requirements (NFRs)

- **Performance:** OCR turnaround `< 3.0s` on 4G mobile; catalog query `< 400ms`; FCP `< 1.5s`.
- **Mobile Usability:** Mobile-first responsive layout (`360px–430px` up to `1440px` desktop) with `≥ 48px × 48px` workshop-friendly touch targets.
- **Security & Privacy:** Uploaded RC card images are processed in-memory and automatically wiped after OCR extraction completes.

---

## 9. 8-Week Sprint Execution Roadmap

- **Weeks 1–2:** Database schema & top 15 vehicle / 300 SKU seeding.
- **Weeks 3–4:** Backend REST server, OCR parsing pipeline & scrap valuation engine.
- **Weeks 5–6:** Responsive PWA storefront, camera capture, cart, checkout & dispatch webhook.
- **Weeks 7–8:** Tier-1 distributor onboarding, 5-workshop closed pilot & production deployment.

---

## 10. Critical Risks & Mitigation Matrix

| Risk Event | Severity | Mitigation Strategy |
| :--- | :--- | :--- |
| Blurry/Damaged RC Card Uploads | High | Client-side compression & quality validation; instant fallback to manual 4-step vehicle dropdown. |
| Distributor Inventory Stockout | High | Morning inventory sync with stockists; secondary distributor routing for high-velocity SKUs. |
| Mechanic Installation Disputes | Medium | Photo verification of original part alongside delivered box prior to non-defective refunds. |
| Stolen Vehicle Scrappage Fraud | Critical | Mandatory physical verification of original RC card and Aadhaar ID prior to RVSF tow truck dispatch. |
