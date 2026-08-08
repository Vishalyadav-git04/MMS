# MISO · MMS — User Guide & FAQ

**Product:** MISO · MMS (Material Management System)  
**Organisation:** Management Information System Organisation (MISO) · Version 5.0  
**Force:** Indian Army / भारतीय सेना  
**Purpose:** End-user reference guide covering login, navigation, every module, step-by-step workflows, and troubleshooting.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Navigation & Module Map](#3-navigation--module-map)
4. [MLCCS — Census of Controlled Stores](#4-mlccs--census-of-controlled-stores)
5. [MMS Admin](#5-mms-admin)
6. [Unit Holding — Equipment Management](#6-unit-holding--equipment-management)
7. [EP Stores — Emergency Procurement](#7-ep-stores--emergency-procurement)
8. [Generate RO — Release Orders](#8-generate-ro--release-orders)
9. [EQPT Transfer / Deposit](#9-eqpt-transfer--deposit)
10. [Reports](#10-reports)
11. [Step-by-Step Workflows](#11-step-by-step-workflows)
12. [Troubleshooting & Common Questions](#12-troubleshooting--common-questions)
13. [Abbreviation Reference](#13-abbreviation-reference)

---

## 1. Getting Started

### What is MMS?

MMS stands for **Material Management System**. It is part of the **MISO (Management Information System Organisation) Version 5.0** suite, built for the **Indian Army**. MMS helps manage:

- **Controlled Stores** — census and master list (MLCCS)
- **Unit Equipment Holdings** — new equipment, approvals, serviceability updates
- **EP (Emergency Procurement) Stores** — domain masters, census, capture, approval, transfers
- **Release Orders (RO)** — generation, document uploads, and search
- **Equipment Transfers & Deposits** — between units and depots
- **Reports** — all-India holdings, unit-wise data, weapon & equipment status

> **Note:** MMS does **not** manage leave, attendance, duty rosters, or HR functions. It is strictly for material and equipment management.

### How do I log in?

1. Open the MMS application — you will see the **MISO · MMS** login screen
2. Enter your **username** and **password**
3. Click **Sign In**
4. On successful login, a welcome splash appears briefly, then you land on the **Dashboard**

**Q. What if my login fails?**  
**A.** Check the following:
- Your username and password are correct
- Your account is active — inactive accounts will be rejected with an "Account is inactive" message
- Contact your system administrator if the issue persists

**Q. What happens if I get logged out unexpectedly?**  
**A.** Your login session may have timed out. Simply log in again. This is normal security behaviour.

**Q. How do I log out?**  
**A.** Click the **Logout** icon in the top-right header. You will be signed out and taken back to the login screen.

---

## 2. Dashboard Overview

After login, you land on the **Dashboard** — your "holdings at a glance" view.

### Dashboard Cards

The Dashboard displays three summary cards:

| Card | What it shows |
|------|--------------|
| **MLCCS** | Unique Census No. count, PRF Group count |
| **EP** | Total Domain, Sub Domain, Total Regn No. |
| **MMS** | Total UE (Unit Entitlement), Total UH (Unit Holding) |

Click any card to navigate directly into that module.

**Q. What do UE and UH mean?**  
- **UE (Unit Entitlement)** — The authorised entitlement of equipment for a unit
- **UH (Unit Holding)** — The actual equipment held by a unit

**Q. Are the dashboard charts showing live data?**  
**A.** The EP card fetches live counts. MLCCS and MMS cards display summary totals. Charts below the cards provide visual analytics.

---

## 3. Navigation & Module Map

MMS is organised into **three top-level modules** accessible from the left sidebar:

### Module Structure

```
Dashboard
│
Weapon
│   ├── MLCCS                          (View census records)
│   ├── Unit Holding                   (Add/approve/update equipment)
│   ├── Reports                        (Generate reports)
│   ├── MMS Admin                      (Census master, domain, linking, observations)
│   ├── EP Stores                      (EP equipment lifecycle)
│   ├── Generate RO                    (Release orders)
│   └── EQPT Transfer/Deposit         (Transfer/deposit equipment)
│
IT Asset                               (Placeholder — not yet implemented)
```

### How navigation works

1. Click a **top-level module** (Dashboard / Weapon / IT Asset) in the sidebar
2. For **Weapon**, choose a **sub-module** (e.g. MLCCS, EP Stores)
3. Each sub-module shows a **tile grid** — click a tile to open its form
4. **Breadcrumbs** at the top show your current location (e.g. `Home / Weapon / EP Stores / Capture EP Stores`)
5. Click any breadcrumb segment to navigate back to that level

**Q. How do I return from a form back to the tile grid?**  
**A.** Click the **Back** button on the form, or click the sub-module name in the breadcrumb.

---

## 4. MLCCS — Census of Controlled Stores

**What is MLCCS?** The Master List of Census of Controlled Stores — a central register of all controlled equipment items tracked by the Indian Army.

### View MLCCS

**Path:** `Weapon → MLCCS → View MLCCS`

Use this screen to **search, view, export, and print** census records.

| Feature | Details |
|---------|---------|
| **Search by** | Nomenclature, Census No, Material No, Cat Part No |
| **Filter by** | Class |
| **Pagination** | Browse large result sets page by page |
| **Export** | CSV download |
| **Print** | Print with watermark for controlled viewing |

**Q. Can I edit or add records from View MLCCS?**  
**A.** Admin users can click **Add New Eqpt** to create new census items or select a record and click **Modify Census Details** to update existing items directly from View MLCCS. Unit users have read-only access (search, filter, export, print).

---

## 5. MMS Admin

**Path:** `Weapon → MMS Admin`

This section contains tools for centralised data management (Link Eqpt with UE, Unit Obsn Status, MMS Domain Master, Search Regn No). Note that census creation and modification capabilities (formerly *Capture MLCCS Details*) are now directly accessible within **View MLCCS** for Admin users.

### 5.1 Add & Modify Census Equipment (Admin Only)

**Path:** `Weapon → MLCCS → View MLCCS`

**Capabilities:**

| Action | What you do |
|--------|-------------|
| **Add New Eqpt** | Click **Add New Eqpt** → Select COS Section → Select Nomenclature → Generate Census No → Fill master fields (Cat/Part No, A/U, AHSP, NSN, DCAN, etc.) → Save |
| **Modify Census** | Select a row in View MLCCS → Click **Modify Census Details** → Update fields → Update |

**Key fields explained:**
- **COS Section** — Class of Store section
- **Nomenclature** — Human-readable name of the equipment
- **Census No** — Auto-generated unique identifier (e.g. `C900010`)
- **Cat/Part No** — Catalogue/Part number
- **A/U (Accounting Unit)** — Unit of measurement (NOS, EA, KG, LTR, MTR)
- **AHSP** — Authority Holding Sealed Particulars
- **NSN** — NATO Stock Number
- **DCAN** — Defence Catalogue Number
- **Incl in AIH** — Include in All India Holding? (Yes/No)

### 5.2 Link Eqpt with UE

**Purpose:** Link a Census No to a Linked Item Code (UE item code).

**How to use:**
1. Start typing a Census No — suggestions appear
2. Review the Nomenclature, Cat/Part No, and PRF Group details
3. Enter the Linked Item Code
4. Click **Link**

### 5.3 Unit Obsn Status

**Purpose:** Track unit observations and MISO replies for a period.

**How to use:**
1. Enter a Unit Name (search by SUS No)
2. Select a **Period** (month)
3. Filter by **Status**: All, Open, Closed, or Pending
4. Review observations and MISO replies

### 5.4 MMS Domain Master

**Purpose:** Maintain reference domain codes used across MMS (e.g. Type of Holding, Serviceability, Op Status).

**Two tabs:**

| Tab | What you do |
|-----|-------------|
| **Add** | Enter Domain Name, Code Value, Label Name, Label Short, Display Order → Save |
| **Search** | Search existing domain values with optional domain filter (`-- ALL --` to see all) |

### 5.5 Search Regn No

**Purpose:** Look up equipment by Registration Number.

**How to use:**
1. Enter a Regn No (e.g. `REGN-2000`)
2. Optionally filter by Census No and PRF Code
3. Click **Search**

---

## 6. Unit Holding — Equipment Management

**Path:** `Weapon → Unit Holding`

This module manages the lifecycle of equipment held by units.

### 6.1 ADD NEW EQPT

**Form title:** ADD DETAILS OF NEW EQPT

**Purpose:** Capture details of new equipment against an Issue Voucher (IV).

**How to use:**
1. Enter the **IV No** (Issue Voucher number)
2. Fill in unit and search details
3. Add **equipment line items**:
   - PRF Group, Item Nomenclature, Material No
   - Quantity, Make, Model, Unit Price
   - Depreciation (%), Life of Assets
   - Census/Material references

> You can add multiple line items under one IV.

### 6.2 APPROVE NEW EQPT

**Form title:** SEARCH DETAILS OF NEW EQPT

**Purpose:** Search and approve newly added equipment records.

**How to use:**
1. Search by SUS No / Unit Name
2. Filter by date range and status
3. Select pending records → **Approve**

### 6.3 UPDATE EQPT DATA

**Purpose:** Update serviceability and related data for existing equipment holdings.

**How to use:**
1. Search for the holding record
2. Update **Serviceability**: Serviciable, Repairable, BER (Beyond Economic Repair), or Under Repair
3. Update related fields as needed → Save

### 6.4 UPDATE ARTY EQPT DATA

**Purpose:** Update specialised data for **Artillery** equipment.

This form has **three tabs**:

| Tab | What it covers |
|-----|---------------|
| **OH Details** | Overhaul data — Minor OH, Major OH, Base OH, Intermediate OH |
| **Barrel Details** | Barrel data — EFC, BOH Completion Date, CoFR (Vertical/Horizontal in mm), Op Clearance (Cleared / Not Cleared / Pending) |
| **Strip Inspection** | Strip inspection records |

**Q. Why is artillery data separate from regular equipment updates?**  
**A.** Artillery equipment requires specialised overhaul, barrel, and strip inspection tracking that doesn't apply to general equipment.

---

## 7. EP Stores — Emergency Procurement

**Path:** `Weapon → EP Stores`

EP Stores manages the full lifecycle of Emergency Procurement items. The recommended setup order is:

```
Domain Master → Sub Domain Master → Gen EP Census → Capture EP Stores → Search/Approve EP Stores
```

### 7.1 Domain Master

**Purpose:** Create and manage EQPT domain categories for EP Stores.

> **Note:** EP Domain Master is different from MMS Domain Master. EP Domain Master manages equipment categories; MMS Domain Master manages general reference codes.

### 7.2 Sub Domain Master

**Purpose:** Create sub-domain categories under an EQPT domain.

### 7.3 Gen EP Census (Generate EP Census)

**Purpose:** Generate census numbers for EP items under a sub-domain.

**How to use:**
1. Select a Sub Domain
2. Click **Generate** to create a new Census No
3. Fill in EP item metadata (category, class, nomenclature, accounting unit, etc.)
4. Set item status: CUR (Current), ACT (Active), OBS (Obsolete), or PHS
5. Save to EP Master

### 7.4 Capture EP Stores

**Purpose:** Record EP store holdings with full details.

**How to use:**
1. Select **Sanctioning/Issuing Authority** (e.g. DGOS, DGAS, DGEME, COD Delhi, AOD Pathankot)
2. Select **Holding Unit** (e.g. 1 Guards, 2 Rajput, 3 Sikh)
3. Enter **IV No** (Issue Voucher)
4. Select **Domain** and **Sub Domain**
5. Enter **Quantity** and **Registration line items**
6. Set **Serviceability**: Serviceable, Repairable, or BER
7. Click **Submit**

> New captures are saved with status **Pending (P)**. They must be approved via Search/Approve EP Stores before they become approved holdings.

### 7.5 Search/Approve EP Stores

**Purpose:** Find and approve (or reject) pending EP captures.

**Status filters:**
| Code | Meaning |
|------|---------|
| **P** | Pending — awaiting approval |
| **A** | Approved — confirmed holding |
| **R** | Rejected — capture was rejected |

**How to use:**
1. Filter by status (Pending / Approved / Rejected / All)
2. Select a pending record
3. Click **Approve** → status changes to Approved

### 7.6 EP IUT (Inter Unit Transfer)

**Purpose:** Transfer EP registration numbers between units.

**How to use:**
1. Fill **PARENT UNIT DETAILS** — the unit transferring the equipment (select EQPT Domain, Sub Domain, enter RV No if applicable)
2. Fill **RECEIVING UNIT DETAILS** — the destination unit
3. Select the Registration numbers to transfer
4. Submit the transfer

---

## 8. Generate RO — Release Orders

**Path:** `Weapon → Generate RO`

### 8.1 Upload DIR/DRR

**Form title:** DRR / DIR UPLOAD

**Purpose:** Upload receive/issue documents before or alongside RO generation.

**How to use:**
1. Choose upload type: **DRR** (receive) or **DIR** (issue)
2. Select the file
3. Click **Submit**

### 8.2 Generate RO

**Form title:** MMS RO GENERATION

**Purpose:** Create a new Release Order.

**Key fields:**
| Field | Description |
|-------|-------------|
| **Type of RO** | Fresh Issue, Replacement, or Loan |
| **RO No** | Release Order number |
| **File NO** | Associated file number |
| **PRF** | Equipment group code |
| **Org Hierarchy** | Command → Corps → Div → Bde |
| **Unit** | Target unit |
| **Force Type** | Regular, TA (Territorial Army), or RR (Rashtriya Rifles) |

### 8.3 Search RO

**Form title:** SEARCH RELEASE ORDER

**Purpose:** Find existing Release Orders by filters and track collection status.

**Collection Status values:**
| Status | Meaning |
|--------|---------|
| **Not Yet Collected** | No collection recorded against the RO |
| **Partially Collected** | RO partly collected |
| **Fully Collected** | RO completely collected |
| **Cancelled** | RO has been cancelled |

---

## 9. EQPT Transfer / Deposit

**Path:** `Weapon → EQPT Transfer/Deposit`

Three types of equipment movement:

### 9.1 Inter Unit Transfer (Unit to Unit)

**Purpose:** Transfer registered equipment from one unit to another.

**How to use:**
1. Fill **PARENT UNIT DETAILS** (source unit)
2. Fill **RECEIVING UNIT DETAILS** (destination unit)
3. Select: Type of Holding → Type of Eqpt → PRF Group → Nomenclature/Census
4. Choose specific **Regn No(s)** to transfer
5. Optionally enter RV No/Date and upload Receipt Voucher
6. Submit

### 9.2 EQPT Transfer (Depot to Depot)

**Purpose:** Transfer equipment between depots (e.g. COD Delhi → AOD Pathankot).

### 9.3 EQPT Deposit (Unit to Depot)

**Purpose:** Deposit equipment from a unit into a depot for storage.

**Key concepts:**
- **Type of Holding options:** Authorised Holding, Temporary Holding, Surplus Holding, Loan Holding
- **Why Regn No selection is required:** Transfers move specific physical equipment items, not just nomenclature totals

---

## 10. Reports

**Path:** `Weapon → Reports`

Five report types are available:

| Report | Purpose |
|--------|---------|
| **ALL INDIA HOLDING** | Countrywide equipment holding picture |
| **UNIT WISE HOLDING DATA** | Holdings broken down by unit |
| **WPNS AND EQPT STATUS** | Weapon & equipment status across formations |
| **WPN AND EQPT DETAILS** | Detailed weapon listing by WPN CAT/SUB CAT |
| **WPN EQPT STATUS NODAL DTE** | Weapon/equipment status by Nodal Directorate |

### Common report filters

| Filter | Description |
|--------|-------------|
| **PRF Group** | Equipment group code |
| **Type of Holding** | Authorised / Temporary / Surplus / Loan |
| **Month/Period** | Reporting snapshot period |
| **Arm/Service** | Infantry, Artillery, Armoured, etc. |
| **Command** | Northern, Western, Eastern, Southern, Central, South Western |
| **Corps** | I Corps, II Corps, III Corps, etc. |
| **Div / Bde** | Division and Brigade |
| **SUS No / Unit Name** | Specific unit identifier |
| **WPN CAT** | Weapon Category (required on some reports) — Small Arms, Crew Served Wpn, Optics & NVDs, Comn Eqpt, Artillery |
| **WPN SUB CAT** | Sub-category — Rifle, Carbine, LMG, MMG, Mortars, Radio Sets |
| **Nodal Dte** | Nodal Directorate (e.g. Nodal Dte Inf, Arty, Armd, ASC) |
| **Line Dte** | Line Directorate (e.g. DGMI, DGMF, DGQA, DGOS, DG EME) |

**Q. My report returns empty results. What should I check?**  
**A.** Review your filter selections — ensure Command, Corps, Arm, PRF Group, Period, SUS No, and WPN CAT (if required) are set correctly. Broadening filters (e.g. using `-- All --`) can help verify data availability.

---

## 11. Step-by-Step Workflows

### Workflow 1: View Census Records

```
Login → Dashboard → Weapon → MLCCS → View MLCCS → Search by Nomenclature/Census No → View/Export/Print
```

### Workflow 2: Add New Census Equipment

```
Login → Weapon → MMS Admin → Capture MLCCS Details → "Add New Eqpt" tab
→ Select COS Section → Select Nomenclature → Generate Census No
→ Fill master fields (Cat/Part, A/U, AHSP, NSN, etc.) → Save
```

### Workflow 3: Modify Existing Census

```
Login → Weapon → MMS Admin → Capture MLCCS Details → "Modify Census" tab
→ Look up by Census No or Nomenclature → Update fields → Save
```

### Workflow 4: Link Census to UE Item Code

```
Login → Weapon → MMS Admin → Link Eqpt with UE
→ Select Census No (typeahead) → Enter Linked Item Code → Link
```

### Workflow 5: Add Domain Reference Value

```
Login → Weapon → MMS Admin → MMS Domain Master → "Add" tab
→ Enter Domain Name, Code Value, Label Name, Label Short, Display Order → Save
```

### Workflow 6: Set Up EP Stores (Complete Flow)

```
Step 1: Weapon → EP Stores → Domain Master → Create EQPT domain
Step 2: Weapon → EP Stores → Sub Domain Master → Create sub-domain under domain
Step 3: Weapon → EP Stores → Gen EP Census → Select sub-domain → Generate census → Fill metadata → Save
Step 4: Weapon → EP Stores → Capture EP Stores → Select authorities/unit/IV/domain → Enter qty/regn → Submit (status: Pending)
Step 5: Weapon → EP Stores → Search/Approve EP Stores → Filter "Pending" → Select record → Approve (status: Approved)
```

### Workflow 7: Add New Unit Equipment

```
Login → Weapon → Unit Holding → ADD NEW EQPT
→ Enter IV No → Add line items (PRF, Nomenclature, Material, Qty, Make, Model, Price, etc.) → Submit
```

### Workflow 8: Approve New Equipment

```
Login → Weapon → Unit Holding → APPROVE NEW EQPT
→ Search by SUS No / unit / dates / status → Select pending records → Approve
```

### Workflow 9: Update Equipment Serviceability

```
Login → Weapon → Unit Holding → UPDATE EQPT DATA
→ Search holding → Update serviceability (Serviciable / Repairable / BER / Under Repair) → Save
```

### Workflow 10: Update Artillery Equipment

```
Login → Weapon → Unit Holding → UPDATE ARTY EQPT DATA
→ Use OH Details / Barrel Details / Strip Inspection tabs → Save
```

### Workflow 11: Generate a Release Order

```
Login → Weapon → Generate RO → Generate RO
→ Select Type of RO (Fresh Issue / Replacement / Loan)
→ Enter RO No, File NO, PRF, Org Hierarchy, Unit → Submit
```

### Workflow 12: Upload DRR/DIR

```
Login → Weapon → Generate RO → Upload DIR/DRR
→ Select type (DRR or DIR) → Upload file → Submit
```

### Workflow 13: Search Release Orders

```
Login → Weapon → Generate RO → Search RO
→ Apply filters (collection status, etc.) → Search
```

### Workflow 14: Transfer Equipment Between Units

```
Login → Weapon → EQPT Transfer/Deposit → Inter Unit Transfer (Unit to Unit)
→ Fill Parent Unit Details → Fill Receiving Unit Details
→ Select Type of Holding → PRF Group → Census → Regn No(s)
→ Optionally add RV details → Submit
```

### Workflow 15: EP Inter-Unit Transfer

```
Login → Weapon → EP Stores → EP IUT (Inter Unit Transfer)
→ Fill Parent Unit Details (Domain/Sub Domain/RV)
→ Fill Receiving Unit Details → Select Regn No(s) → Submit
```

### Workflow 16: Generate Reports

```
Login → Weapon → Reports → Select report type
→ Set filters (PRF Group, Command, Corps, Arm, Period, etc.) → Generate
```

---

## 12. Troubleshooting & Common Questions

### Login & Session Issues

**Q. Login fails with "Account is inactive."**  
**A.** Your account is not currently active. Contact your system administrator to reactivate your account.

**Q. I was suddenly logged out.**  
**A.** Your login session may have timed out. Simply log in again — this is normal security behaviour.

### Module-Specific Issues

**Q. I can't find certain tiles or modules.**  
**A.** Some modules may not be visible depending on your access level. Contact your system administrator if you believe you should have access.

**Q. I saved an EP capture but it doesn't show as approved.**  
**A.** All new EP captures start as **Pending (P)**. They must be approved via `EP Stores → Search/Approve EP Stores` to change the status to **Approved (A)**.

**Q. I can't generate a Census No on Capture MLCCS Details.**  
**A.** You must first select a **COS Section** and **Nomenclature** before the system can generate a Census No.

**Q. Link Eqpt with UE can't find my item.**  
**A.** Verify the Census No using the typeahead search. Ensure the Census No exists in the MLCCS master and you are entering a valid Linked Item Code.

**Q. Transfer form doesn't list any Regn numbers.**  
**A.** Ensure you have selected all preceding filters: **Type of Holding**, **PRF Group**, and **Census**. The Regn No list populates based on these selections.

**Q. My report shows no data.**  
**A.** Check your filter values — Command, Corps, Div, Bde, Arm, PRF Group, Period, SUS No, WPN CAT. Try using broader filters like `-- All --` to confirm data exists.

### "Where do I find…?" Quick Reference

| What you need | Where to go |
|---------------|------------|
| View census records | `Weapon → MLCCS → View MLCCS` |
| Add or modify census master | `Weapon → MMS Admin → Capture MLCCS Details` |
| Link Census No to UE | `Weapon → MMS Admin → Link Eqpt with UE` |
| Track unit observations | `Weapon → MMS Admin → Unit Obsn Status` |
| Manage domain reference codes | `Weapon → MMS Admin → MMS Domain Master` |
| Search by Registration No | `Weapon → MMS Admin → Search Regn No` |
| Add new unit equipment | `Weapon → Unit Holding → ADD NEW EQPT` |
| Approve new equipment | `Weapon → Unit Holding → APPROVE NEW EQPT` |
| Update equipment serviceability | `Weapon → Unit Holding → UPDATE EQPT DATA` |
| Update artillery barrel/OH data | `Weapon → Unit Holding → UPDATE ARTY EQPT DATA` |
| Set up EP domains | `Weapon → EP Stores → Domain Master` |
| Set up EP sub-domains | `Weapon → EP Stores → Sub Domain Master` |
| Generate EP census numbers | `Weapon → EP Stores → Gen EP Census` |
| Capture EP holdings | `Weapon → EP Stores → Capture EP Stores` |
| Approve EP captures | `Weapon → EP Stores → Search/Approve EP Stores` |
| Transfer EP between units | `Weapon → EP Stores → EP IUT` |
| Upload DRR/DIR files | `Weapon → Generate RO → Upload DIR/DRR` |
| Create a Release Order | `Weapon → Generate RO → Generate RO` |
| Search existing Release Orders | `Weapon → Generate RO → Search RO` |
| Transfer EQPT between units | `Weapon → EQPT Transfer/Deposit → Inter Unit Transfer` |
| Transfer EQPT between depots | `Weapon → EQPT Transfer/Deposit → EQPT Transfer` |
| Deposit EQPT to a depot | `Weapon → EQPT Transfer/Deposit → EQPT Deposit` |
| View Total UE / Total UH | `Dashboard → MMS card` |
| Maintain EP sub-domains | `Weapon → EP Stores → Sub Domain Master` |
| All India Holding report | `Weapon → Reports → ALL INDIA HOLDING` |
| Unit-wise holding report | `Weapon → Reports → UNIT WISE HOLDING DATA` |

### Common Confusions Clarified

| Confusion | Clarification |
|-----------|--------------|
| MLCCS vs EP Stores | **MLCCS** = Master List of Census of Controlled Stores; **EP Stores** = Emergency Procurement with its own domain/census/capture/approve lifecycle. They are separate modules |
| MMS Admin vs MMS Dashboard Card | **MMS Admin** = tools for census, domains, linking; **MMS Dashboard Card** = shows UE/UH summary totals |
| EP Domain Master vs MMS Domain Master | **EP Domain Master** = EP EQPT domain categories; **MMS Domain Master** = general MMS reference codes |
| Generate RO vs Search RO | **Generate RO** = create new Release Orders; **Search RO** = find and track existing ROs |
| EP IUT vs Inter Unit Transfer | **EP IUT** is under EP Stores (for EP items); **Inter Unit Transfer** is under EQPT Transfer/Deposit (for general EQPT) |
| IV vs RV | **IV** = Issue Voucher (used when capturing new equipment); **RV** = Receipt Voucher (used in transfers) |
| SUS No vs Regn No | **SUS No** = identifies a unit in the system; **Regn No** = identifies a specific physical equipment item |
| Census No vs PRF | **Census No** = unique census identifier; **PRF/PRF Group** = equipment grouping code |
| UE vs UH | **UE** = Unit Entitlement (what's authorised); **UH** = Unit Holding (what's actually held) |
| OH vs Obsn | **OH** = Overhaul (Minor/Major/Base/Intermediate); **Obsn** = Observation (Unit Obsn tracking) |
| BER vs Type of Holding | **BER** = Beyond Economic Repair (a serviceability status); **Type of Holding** = Authorised/Temporary/Surplus/Loan |
| Nodal Dte vs Line Dte | Both are directorates but used as separate filter dimensions in reports |

---

## 13. Abbreviation Reference

| Abbreviation | Full Form |
|-------------|-----------|
| **MISO** | Management Information System Organisation |
| **MMS** | Material Management System |
| **MLCCS** | Master List of Census of Controlled Stores |
| **EP** | Emergency Procurement / EP Stores |
| **EQPT** | Equipment |
| **WPN** | Weapon |
| **ARTY** | Artillery |
| **RO** | Release Order |
| **DRR / DIR** | Document types for receive/issue uploads |
| **IUT** | Inter Unit Transfer |
| **UE** | Unit Entitlement |
| **UH** | Unit Holding |
| **SUS No** | Unit/Store unique system number |
| **Census No** | Census identifier (e.g. C900010) |
| **Regn / Regd No** | Registration number for physical equipment |
| **IV** | Issue Voucher |
| **RV** | Receipt Voucher |
| **PRF** | Equipment group code |
| **COS** | Class of Store (section) |
| **AIH** | All India Holding |
| **Obsn** | Observation |
| **OH** | Overhaul |
| **BER** | Beyond Economic Repair |
| **NSN** | NATO Stock Number |
| **DCAN** | Defence Catalogue Number |
| **AHSP** | Authority Holding Sealed Particulars |
| **A/U** | Accounting Unit (NOS, EA, KG, LTR, MTR) |
| **Comd** | Command |
| **Nodal Dte** | Nodal Directorate |
| **Line Dte** | Line Directorate |
| **COD / AOD** | Central / Advanced Ordnance Depot |
| **WKSP** | Workshop |
| **TA** | Territorial Army |
| **RR** | Rashtriya Rifles |
| **DGOS** | Directorate General of Ordnance Services |
| **DGAS** | Directorate General of Army Supply |
| **DGEME** | Directorate General of EME |
| **CoFR** | A measurement field (Vertical/Horizontal in mm) on artillery equipment |
| **EFC** | Barrel-related field under Barrel Details for ARTY EQPT |
| **BOH** | Barrel Overhaul (BOH Compl Dt = completion date) |
| **DEO** | Appears in Unit Name search placeholder |
| **Comn Eqpt** | Communication Equipment |
| **NVDs** | Night Vision Devices |

---

## Status Codes Quick Reference

### EP Store Status (Op Status)

| Code | Meaning |
|------|---------|
| **P** | Pending |
| **A** | Approved |
| **R** | Rejected |

### Item Status (Census Items)

| Code | Meaning |
|------|---------|
| **CUR** | Current (default for new items) |
| **ACT** | Active |
| **OBS** | Obsolete |
| **PHS** | Additional status used in Gen EP Census |

### Equipment Serviceability

| Context | Options |
|---------|---------|
| **UPDATE EQPT DATA** | Serviciable, Repairable, BER, Under Repair |
| **Capture EP Stores** | Serviceable, Repairable, BER |

### Type of Holding

| Value | Description |
|-------|-------------|
| **Authorised Holding** | Equipment authorised for the unit |
| **Temporary Holding** | Equipment held temporarily |
| **Surplus Holding** | Equipment beyond authorisation |
| **Loan Holding** | Equipment on loan |

### Overhaul Types (Artillery)

| Type | Description |
|------|-------------|
| **Minor OH** | Minor overhaul |
| **Major OH** | Major overhaul |
| **Base OH** | Base-level overhaul |
| **Intermediate OH** | Intermediate-level overhaul |

### Operational Clearance (Artillery)

| Status | Meaning |
|--------|---------|
| **Cleared** | Operationally cleared |
| **Not Cleared** | Not yet cleared |
| **Pending** | Clearance pending |

### RO Collection Status

| Status | Meaning |
|--------|---------|
| **Not Yet Collected** | No collection yet |
| **Partially Collected** | Partly collected |
| **Fully Collected** | Completely collected |
| **Cancelled** | RO cancelled |

### Unit Observation Status

| Status | Meaning |
|--------|---------|
| **Open** | Observation is open |
| **Closed** | Observation is closed |
| **Pending** | Observation is pending |

---

## Sample Data Reference

### PRF Group Codes
`PRF-INF-01`, `PRF-ARTY-02`, `PRF-ARMD-03`, `PRF-ASC-04`, `PRF-ENGR-05`

### Army Commands
Northern, Western, Eastern, Southern, Central, South Western

### Corps
I Corps, II Corps, III Corps, IV Corps, IX Corps, X Corps, XIV Corps

### Organisation Hierarchy Order
Command → Corps → Div → Bde → Unit (SUS No / Unit Name)

### Sample Holding Units
1 Guards, 2 Rajput, 3 Sikh, 4 Madras, 5 JAK LI, Artillery Regiment, Armoured Regiment

### Sample Depots / Workshops
COD Delhi, AOD Pathankot, and similar COD/AOD/WKSP installations

### Equipment Categories (Type of Eqpt)
Small Arms, Crew Served Wpn, Optics & NVDs, Comn Eqpt, Artillery

### Weapon Sub-Categories (WPN SUB CAT)
Rifle, Carbine, LMG, MMG, Mortars, Radio Sets

### Equipment Categories (Eqpt Category)
A, B, C

### Line Directorate Examples
DGMI, DGMF, DGQA, DGOS, DG EME

### Nodal Directorate Examples
Nodal Dte Inf, Arty, Armd, ASC (and related DGOS/DGAS/DGEME contexts)

### Accounting Units
NOS, EA, KG, LTR, MTR

### Sample Issuer Authorities (EP)
DG CD, DGOS, DGAS, DGEME, COD Delhi, AOD Pathankot

---

*MISO · MMS — Material Management System · Indian Army · Version 5.0*
