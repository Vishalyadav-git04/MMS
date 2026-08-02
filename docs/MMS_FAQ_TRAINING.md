# MMS FAQ — Model Training Corpus

**Product:** MISO · MMS (Material / Master List Management)  
**Organisation:** Management Information System Organisation (MISO) · Version 5.0  
**Force:** Indian Army / भारतीय सेना  
**Purpose:** Training Q&A set for domain language, abbreviations, navigation, and operational flows.

> Use exact abbreviations as written: MLCCS, EP, EQPT, WPN, RO, DRR, DIR, IUT, UE, UH, SUS No, Census No, Regn No, IV, RV, PRF, COS, AIH, Obsn, ARTY, OH, BER, Nodal Dte, Line Dte, AHSP, NSN, DCAN.

---

## 1. Product overview & identity

**Q1.** What does MMS stand for in this application?  
**A.** Material / Master List Management.

**Q2.** What does MISO stand for?  
**A.** Management Information System Organisation.

**Q3.** What product version branding appears on MMS?  
**A.** MISO · Version 5.0.

**Q4.** Which force does MMS serve?  
**A.** The Indian Army (भारतीय सेना).

**Q5.** Is MMS a leave or attendance HR system?  
**A.** No. MMS manages weapons, equipment holdings, census of controlled stores, EP stores, release orders, and transfers/deposits.

**Q6.** What is the login brand text shown on the sign-in screen?  
**A.** MISO · MMS.

**Q7.** What prompt is shown on the login screen about account types?  
**A.** Sign in with your ADMIN or UNIT account.

**Q8.** What is MLCCS the short form of on the dashboard?  
**A.** Master List of Census of Controlled Stores.

**Q9.** What does EP stand for on the dashboard?  
**A.** Equipment Personal / EP Stores.

**Q10.** What does the MMS dashboard card summarise?  
**A.** UE and UH totals (Total UE and Total UH).

**Q11.** What is the primary domain of data in MMS?  
**A.** Controlled stores, census equipment, unit holdings, EP stores, release orders, and EQPT transfers/deposits.

**Q12.** What are the two user account types supported at login?  
**A.** ADMIN and UNIT.

**Q13.** What display name is typically used for the ADMIN role?  
**A.** MMS Admin.

**Q14.** What display name is typically used for the UNIT role?  
**A.** Unit Operator.

**Q15.** What top-level modules appear in the main navigation?  
**A.** Dashboard, Weapon, and IT Asset.

**Q16.** Under which top-level module do most equipment functions live?  
**A.** Weapon.

**Q17.** What is the IT Asset module currently presented as?  
**A.** A placeholder for IT Asset Management / hardware inventory.

**Q18.** What breadcrumb root label is used when navigating modules?  
**A.** Home.

**Q19.** What organisation hierarchy levels are commonly used in filters?  
**A.** Command (Comd), Corps, Div, and Bde.

**Q20.** What does Arm / Arm/Service mean in MMS filters?  
**A.** The arm of service of the unit (e.g. Infantry, Artillery, Armoured).

---

## 2. Login, session & access

**Q21.** How does a user authenticate into MMS?  
**A.** By entering username and password on the LoginScreen and submitting credentials to the auth login API.

**Q22.** What happens after successful login?  
**A.** A JWT access token and user profile are stored in session, then the user proceeds to the app (optionally via WelcomeSplash) and lands on the Dashboard.

**Q23.** What happens if login credentials are invalid?  
**A.** Sign-in fails and the user remains on the login screen with an error.

**Q24.** What happens if an account is inactive?  
**A.** Login is rejected with an “Account is inactive” condition (active flag not `Y` on MMS_USERS).

**Q25.** What JWT roles are recognised by the backend?  
**A.** ADMIN and UNIT.

**Q26.** What happens on logout?  
**A.** The session token and stored auth user are cleared and the user returns to the login screen.

**Q27.** What happens when an API call returns HTTP 401?  
**A.** An `mms:unauthorized` style logout flow is triggered and the user is signed out.

**Q28.** Can a UNIT user see the MMS Admin navigation tiles?  
**A.** No. MMS Admin is ADMIN-only in the UI; UNIT users are redirected away if they land there.

**Q29.** Which dashboard card is drillable only for ADMIN?  
**A.** The MMS card (UE/UH totals).

**Q30.** Do both ADMIN and UNIT users share most Weapon module screens?  
**A.** Yes. Most Weapon screens are available to both; MMS Admin is the main UI gate for ADMIN only.

**Q31.** What clearance values are associated with seed roles?  
**A.** ADMIN clearance `99`, UNIT clearance `10`.

**Q32.** Is there a fine-grained per-screen RBAC matrix beyond ADMIN vs UNIT?  
**A.** No. The primary UI role gate is ADMIN vs UNIT for MMS Admin.

**Q33.** What does the session watermark typically convey?  
**A.** Session/user context on printed or on-screen secured views.

**Q34.** Are notifications in the header currently live operational alerts?  
**A.** Dummy/sample notifications may show items such as “RO pending approval”, “Census sync complete”, or “Eqpt transfer raised”.

**Q35.** What username placeholder style appears on login?  
**A.** Examples such as `ADMIN01`.

---

## 3. Navigation & module map

**Q36.** What Weapon sub-modules are available?  
**A.** MLCCS, Unit Holding, Reports, MMS Admin, EP Stores, Generate RO, and EQPT Transfer/Deposit.

**Q37.** Which Weapon sub-module is ADMIN-only in navigation?  
**A.** MMS Admin.

**Q38.** What tile is under MLCCS?  
**A.** View MLCCS.

**Q39.** What tiles are under Unit Holding?  
**A.** ADD NEW EQPT, APPROVE NEW EQPT, UPDATE EQPT DATA, and UPDATE ARTY EQPT DATA.

**Q40.** What tiles are under Reports?  
**A.** ALL INDIA HOLDING, UNIT WISE HOLDING DATA, WPNS AND EQPT STATUS, WPN AND EQPT DETAILS, and WPN EQPT STATUS NODAL DTE.

**Q41.** What tiles are under MMS Admin?  
**A.** Capture MLCCS Details, Link Eqpt with UE, Unit Obsn Status, MMS Domain Master, and Search Regn No.

**Q42.** What tiles are under EP Stores?  
**A.** Domain Master, Sub Domain Master, Gen EP Census, Capture EP Stores, Search/Approve EP Stores, and EP IUT (Inter Unit Transfer).

**Q43.** What tiles are under Generate RO?  
**A.** Upload DIR/DRR, Generate RO, and Search RO.

**Q44.** What tiles are under EQPT Transfer/Deposit?  
**A.** Inter Unit Transfer (Unit to Unit), EQPT Transfer (Depot to Depot), and EQPT Deposit (Unit to Depot).

**Q45.** What is the typical breadcrumb for Capture MLCCS Details?  
**A.** Home / Weapon / MMS Admin / Capture MLCCS Details.

**Q46.** What is the typical breadcrumb for View MLCCS?  
**A.** Home / Weapon / MLCCS / View MLCCS.

**Q47.** What happens when a form tile is opened?  
**A.** Form mode opens (`formOpen`), and navigation often collapses to a mini bar showing the screen label.

**Q48.** Does MMS use deep multi-page URL routes for each module?  
**A.** No. Navigation is primarily client-side on the main app route with section/tile state.

**Q49.** How do users return from a form screen to module tiles?  
**A.** Via breadcrumb / back navigation to the parent Weapon sub-module.

**Q50.** What does selecting Weapon without a tile typically show?  
**A.** The Weapon module tile grid for the chosen sub-module.

---

## 4. Abbreviations glossary (training)

**Q51.** What does EQPT / Eqpt mean?  
**A.** Equipment.

**Q52.** What does WPN / WPNs mean?  
**A.** Weapon / Weapons.

**Q53.** What does ARTY mean?  
**A.** Artillery.

**Q54.** What does RO mean in Generate RO?  
**A.** Release Order.

**Q55.** What do DRR and DIR mean?  
**A.** Document types used in Upload DIR/DRR for receive/issue upload (DRR or DIR).

**Q56.** What does IUT mean?  
**A.** Inter Unit Transfer.

**Q57.** What does UE mean in MMS?  
**A.** Unit Entitlement context (Total UE on dashboard; Link Eqpt with UE links census to item code).

**Q58.** What does UH mean in MMS?  
**A.** Unit Holding context (Total UH on dashboard; holding-related codes).

**Q59.** What is SUS No?  
**A.** Unit / store unique system number used to identify a unit in searches and holdings.

**Q60.** What is Census No?  
**A.** The equipment census identifier on the MLCCS / EP master (example pattern like `C900010`).

**Q61.** What is Regn No / Regd No?  
**A.** Equipment registration number for a physical item holding.

**Q62.** What is IV No / IV Date?  
**A.** Issue Voucher number and date.

**Q63.** What is RV No / RV Date?  
**A.** Receipt Voucher number and date (used in transfers and EP IUT).

**Q64.** What is PRF / PRF Group / PRF Code?  
**A.** Equipment grouping codes used across holdings, RO, and reports (e.g. `PRF-INF-01`).

**Q65.** What is COS Section / COS_SEC?  
**A.** Class of Store section used when capturing MLCCS equipment.

**Q66.** What is Nomenclature / NOMEN?  
**A.** The item name / descriptive designation of the equipment.

**Q67.** What is Cat/Part No?  
**A.** Catalogue / part number of the equipment.

**Q68.** What is A/U, AU, or Accounting Unit?  
**A.** Unit of account for quantities (e.g. NOS, EA, KG, LTR, MTR).

**Q69.** What is AHSP Agency?  
**A.** Authority Holding Sealed Particulars — a master field on equipment records.

**Q70.** What is NATO Stock No (NSN)?  
**A.** NATO stock number (`NATO_STK_NO`) for the item.

**Q71.** What is Def Catalogue No (DCAN)?  
**A.** Defence catalogue number.

**Q72.** What does AIH mean?  
**A.** All India Holding; “Incl in AIH” marks whether the item is included in AIH (`Y`/`N`).

**Q73.** What is Nodal Dte?  
**A.** Nodal Directorate (e.g. Nodal Dte Inf/Arty/Armd/ASC, or DGOS/DGAS/DGEME contexts).

**Q74.** What is Line Dte?  
**A.** Line Directorate (examples: DGMI, DGMF, DGQA, DGOS, DG EME).

**Q75.** What does Obsn mean?  
**A.** Observation — used in Unit Obsn Status tracking.

**Q76.** What does DEO refer to in Unit Obsn search placeholder?  
**A.** It appears in the Unit Name search placeholder as “SUS No / DEO...”.

**Q77.** What does OH mean in UPDATE ARTY EQPT DATA?  
**A.** Overhaul (Minor OH, Major OH, Base OH, Intermediate OH).

**Q78.** What does WKSP mean?  
**A.** Workshop.

**Q79.** What is BOH Compl Dt?  
**A.** A barrel/overhaul completion date field on arty equipment details.

**Q80.** What is EFC in barrel details?  
**A.** A barrel-related field captured under Barrel Details for arty EQPT.

**Q81.** What is CoFR?  
**A.** A measurement field (Vertical/Horizontal in mm) on arty equipment.

**Q82.** What does BER mean in serviceability?  
**A.** Beyond Economic Repair.

**Q83.** What does Comd mean?  
**A.** Command (Army command formation level).

**Q84.** What are COD and AOD?  
**A.** Central Ordnance Depot and Advanced Ordnance Depot (sample depot names such as COD Delhi, AOD Pathankot).

**Q85.** What do TA and RR mean under Force Type?  
**A.** Force Type options alongside Regular (TA and RR).

**Q86.** What is Material No?  
**A.** Material number identifying the store/item material.

**Q87.** What is Item Code in Link Eqpt with UE?  
**A.** The Linked Item Code that associates a census record with UE item coding.

**Q88.** What is Op Clearance on arty barrel data?  
**A.** Operational clearance status: Cleared, Not Cleared, or Pending.

**Q89.** What is TFR_STATUS?  
**A.** Transfer status field in the database for transfer-related records.

**Q90.** What is OP_STATUS?  
**A.** Operational / approval status code in DB/UI workflows (e.g. EP Pending/Approved/Rejected).

**Q91.** What is Type of Holding?  
**A.** Holding classification: Authorised Holding, Temporary Holding, Surplus Holding, or Loan Holding.

**Q92.** What is Type of Eqpt?  
**A.** Equipment type category such as Small Arms, Crew Served Wpn, Optics & NVDs, Comn Eqpt, Artillery.

**Q93.** What spelling of serviceability appears on Unit Holding UPDATE EQPT DATA?  
**A.** “Serviciable” (as labelled in that UI), alongside Repairable, BER, Under Repair.

**Q94.** What spelling of serviceability appears on Capture EP Stores?  
**A.** Serviceable, Repairable, BER.

**Q95.** What does DGOS / DGAS / DGEME typically represent?  
**A.** Directorates used as sanctioning/issuer authorities and Line/Nodal Dte options.

**Q96.** What is File NO on RO generation?  
**A.** The file number field on the MMS RO GENERATION form.

**Q97.** What does “Is Registration No Avl?” mean?  
**A.** Whether a registration number is available (Yes/No).

**Q98.** What is Strip Inspection?  
**A.** A tab under UPDATE ARTY EQPT DATA for strip inspection details.

**Q99.** What are OH Details and Barrel Details?  
**A.** Tabs under UPDATE ARTY EQPT DATA for overhaul and barrel data.

**Q100.** What does “Gen EP Census” mean?  
**A.** Generate EP Census — create EP census numbers under a sub-domain.

---

## 5. Dashboard

**Q101.** What three summary cards appear on the Dashboard?  
**A.** MLCCS, EP, and MMS.

**Q102.** What MLCCS metrics are shown at a glance?  
**A.** Metrics such as Unique Census No. and PRF Group (holdings-at-a-glance style cards/charts).

**Q103.** What EP metrics are shown on the Dashboard?  
**A.** Total Domain, Sub Domain, and Total Regn No.

**Q104.** What MMS metrics are shown on the Dashboard?  
**A.** Total UE and Total UH.

**Q105.** What API supports dashboard counts?  
**A.** `GET /api/v1/dashboard/counts`.

**Q106.** What is the subtitle under the MLCCS dashboard card?  
**A.** Master List of Census of Controlled Stores.

**Q107.** What is the subtitle under the EP dashboard card?  
**A.** Equipment Personal / EP Stores.

**Q108.** What is the subtitle under the MMS dashboard card?  
**A.** UE and UH totals.

**Q109.** Can charts appear on the Dashboard?  
**A.** Yes. The Dashboard presents holdings-at-a-glance cards with charts.

**Q110.** Who can drill into the MMS dashboard card?  
**A.** ADMIN users.

---

## 6. MLCCS — View & capture

**Q111.** What is the purpose of View MLCCS?  
**A.** To search and view census records of controlled stores, with options such as CSV export and print.

**Q112.** By which fields can users search in View MLCCS?  
**A.** Nomenclature, Census No, Material No, and Cat Part No (with class filters and pagination).

**Q113.** Can View MLCCS export results?  
**A.** Yes. CSV export is supported.

**Q114.** Can View MLCCS open Capture MLCCS detail?  
**A.** Yes. Viewing can lead into Capture MLCCS detail for deeper record handling.

**Q115.** What API searches MLCCS records?  
**A.** `POST /api/v1/mlccs/search` (with related `/mlccs/options` and `/mlccs/status`).

**Q116.** What is Capture MLCCS Details used for?  
**A.** Adding new equipment census records and modifying existing census master data (ADMIN).

**Q117.** What tabs exist on Capture MLCCS Details?  
**A.** Add New Eqpt and Modify Census.

**Q118.** What is the Add New Eqpt flow for MLCCS?  
**A.** Select COS Section and Nomenclature → generate Census No → fill master fields → save to MLCCS equipment master.

**Q119.** What is the Modify Census flow?  
**A.** Look up by Census No / Nomenclature and update the master record.

**Q120.** Which table stores MLCCS equipment master data?  
**A.** `MMS_MLCCS_EQUIPMENT_MASTER`.

**Q121.** What default item status is commonly used for new MLCCS/EP census items?  
**A.** `CUR`.

**Q122.** What item status codes appear in MLCCS/EP contexts?  
**A.** `CUR`, `ACT`, `OBS`, and in Gen EP also `PHS`.

**Q123.** What op_status is set for a new MLCCS row on create?  
**A.** `NEW`.

**Q124.** What does Incl in AIH accept?  
**A.** `Y` or `N`, shown as Yes / No.

**Q125.** What Eqpt Category values are used in Gen EP / Capture MLCCS fallbacks?  
**A.** A, B, C.

**Q126.** What accounting unit fallbacks are common?  
**A.** NOS and EA (Gen EP also uses KG, LTR, MTR).

**Q127.** What domain-value keys feed MLCCS options?  
**A.** `TYPE_OF_HLDG`, `TYPE_OF_EQPT`, `SERVICE_STATUS`, `OP_STATUS` from `MMS_DOMAIN_VALUES`.

**Q128.** Where do reference domain codes live?  
**A.** `MMS_DOMAIN_VALUES` (domain_name, code_value, label_name, etc.).

**Q129.** What ADMIN APIs support Capture MLCCS Details?  
**A.** Under `/admin/capture-mlccs-details/` — generate, lookup, create, options, suggest-cos, suggest-census.

**Q130.** Is Capture MLCCS Details available to UNIT operators in the nav?  
**A.** No. It is under MMS Admin (ADMIN-only).

---

## 7. MMS Admin functions

**Q131.** What does Link Eqpt with UE do?  
**A.** Links a Census No to a Linked Item Code (UE item code), with nomenclature / Cat/Part / PRF context.

**Q132.** How does a user typically start Link Eqpt with UE?  
**A.** Census No typeahead → review nomenclature / Cat/Part / PRF → enter Linked Item Code → link.

**Q133.** Which API family supports Link Eqpt with UE?  
**A.** `/admin/link-census-no-with-item-code/` (suggest-census, lookup, link).

**Q134.** What does Unit Obsn Status track?  
**A.** Unit observations and MISO reply status for a period.

**Q135.** What filters are used on Unit Obsn Status?  
**A.** Unit Name (placeholder “SUS No / DEO...”), Period (month), and Status.

**Q136.** What status filter options appear for Unit Obsn Status?  
**A.** `-- ALL STATUS --`, Open, Closed, Pending.

**Q137.** Which table stores observation details?  
**A.** `MMS_OBSN_DETL`.

**Q138.** Which API searches Unit Obsn Status?  
**A.** `POST /admin/unit-obsn-status/search`.

**Q139.** What is MMS Domain Master for?  
**A.** Maintaining MMS domain reference data (codes/labels used across the module).

**Q140.** What tabs exist on MMS Domain Master?  
**A.** Add and Search.

**Q141.** What fields are entered when adding a domain value?  
**A.** Domain Name, Code Value, Label Name, Label Short, Display Order (and related module context such as MMS).

**Q142.** What placeholder text appears for Domain Name on MMS Domain Master?  
**A.** “Please Enter Domain Name...”

**Q143.** Which API supports MMS Domain Master?  
**A.** `/admin/mms-domain-master/` (domains, suggest-domains, search, create).

**Q144.** What does Search Regn No do?  
**A.** Looks up equipment by registration number (and related census/PRF filters).

**Q145.** What placeholders appear on Search Regn No?  
**A.** Examples such as `REGN-2000`, plus Census No and PRF Code fields.

**Q146.** Which API supports Search Regn No?  
**A.** `POST /admin/search-regn-no/search`.

**Q147.** Which table holds unit equipment / registration holdings?  
**A.** `MMS_UNIT_MSTR_DETL`.

**Q148.** Can UNIT users manage MMS Domain Master from the nav?  
**A.** No. MMS Domain Master is under MMS Admin.

**Q149.** What is the purpose of MISO Reply in Obsn context?  
**A.** It is the organisational reply tracked against a unit observation.

**Q150.** Why would an admin use Capture MLCCS Details instead of View MLCCS?  
**A.** Capture/Modify is for creating and updating master census data; View MLCCS is for search/view/export of census records.

---

## 8. Unit Holding

**Q151.** What is ADD NEW EQPT used for?  
**A.** Capturing details of new equipment against an IV header and line items for unit holding.

**Q152.** What is the form title for ADD NEW EQPT?  
**A.** ADD DETAILS OF NEW EQPT.

**Q153.** What key header field starts ADD NEW EQPT?  
**A.** IV No (Issue Voucher number), with related unit/search fields.

**Q154.** What line-item fields appear when adding new EQPT?  
**A.** PRF Group, Item Nomenclature, Material No, Qty, Make, Model, Unit Price, depreciation/%, Life of Assets, and related census/material fields.

**Q155.** What placeholder is used for PRF Group on ADD NEW EQPT?  
**A.** `----Select PRF Group----`.

**Q156.** What is APPROVE NEW EQPT used for?  
**A.** Searching and approving newly added equipment records pending unit holding approval.

**Q157.** What is the search panel title on APPROVE NEW EQPT?  
**A.** SEARCH DETAILS OF NEW EQPT.

**Q158.** What filters are typical on APPROVE NEW EQPT?  
**A.** SUS / unit search, dates, and status (`--Select the Value--`).

**Q159.** What is UPDATE EQPT DATA used for?  
**A.** Searching holdings and updating serviceability and related equipment data (including barrel I–IV style fields where applicable).

**Q160.** What serviceability options appear on UPDATE EQPT DATA?  
**A.** Serviciable, Repairable, BER, Under Repair.

**Q161.** What is UPDATE ARTY EQPT DATA used for?  
**A.** Updating artillery equipment data across OH Details, Barrel Details, and Strip Inspection tabs.

**Q162.** What OH Type options are used?  
**A.** Minor OH, Major OH, Base OH, Intermediate OH.

**Q163.** What Op Clearance values are used on arty data?  
**A.** Cleared, Not Cleared, Pending.

**Q164.** Are Unit Holding backends fully wired or partly scaffolded?  
**A.** Many Unit Holding actions are UI/mock with scaffold `/status` endpoints (`/unit-holding/add-new-eqpt`, `approve-new-eqpt`, `update-eqpt-data`, `update-arty-eqpt-data`).

**Q165.** Who typically uses Unit Holding screens?  
**A.** Unit Operators (UNIT) and admins working unit equipment holdings.

**Q166.** Why is IV important in ADD NEW EQPT?  
**A.** The Issue Voucher identifies the issue document against which new EQPT lines are captured.

**Q167.** Can multiple line items be associated under one IV in ADD NEW EQPT?  
**A.** Yes. The form is structured around an IV header plus equipment line details.

**Q168.** What does “Life of Assets” capture?  
**A.** Asset life information for the new EQPT line.

**Q169.** What does Unit Price capture on ADD NEW EQPT?  
**A.** The unit price of the equipment line item.

**Q170.** Why is UPDATE ARTY EQPT DATA separate from UPDATE EQPT DATA?  
**A.** Artillery equipment needs specialised OH, barrel, and strip inspection data beyond general EQPT updates.

---

## 9. EP Stores

**Q171.** What is EP Domain Master?  
**A.** Reference master for EQPT domain / category used by EP Stores.

**Q172.** What is EP Sub Domain Master?  
**A.** Sub-domain reference under an EQPT category/domain.

**Q173.** Which tables store EP domain and sub-domain masters?  
**A.** `MMS_EP_DOMAIN_MASTER` and `MMS_EP_SUB_DOMAIN`.

**Q174.** What does Gen EP Census do?  
**A.** Selects a sub-domain, generates a census number, and captures EP item metadata into `MMS_EP_MSTR`.

**Q175.** What item categories may appear in Gen EP Census hardcodes?  
**A.** Weapon, Ammo, Vehicle, Comms.

**Q176.** What class values may appear in Gen EP Census?  
**A.** Class I–III style classes and Cat-I / Cat-II digests.

**Q177.** What is Capture EP Stores used for?  
**A.** Capturing EP store holdings with sanctioning/issuing authority, holding unit, IV, domain/sub-domain, qty, regn lines, and serviceability.

**Q178.** What default op_status is set when capturing new EP Stores?  
**A.** `P` (Pending).

**Q179.** What default stores_type is used on new EP captures?  
**A.** `ORD`.

**Q180.** Which table stores EP capture transactions?  
**A.** `MMS_EP_TRANSACTION`.

**Q181.** What does Search/Approve EP Stores do?  
**A.** Filters EP transactions by Pending/Approved/Rejected (and All) and allows approval.

**Q182.** What op_status codes are used for EP approval?  
**A.** `P` = Pending, `A` = Approved, `R` = Rejected.

**Q183.** What happens when an EP store is approved?  
**A.** `op_status` becomes `A` (Approved).

**Q184.** Which APIs support Capture EP Stores lookups?  
**A.** `/ep/capture/` for sanctioning-auths, issuer-units, holding-units, and create.

**Q185.** Which API supports Search/Approve EP Stores?  
**A.** `/ep/search-approve/` (search, approve).

**Q186.** What is EP IUT (Inter Unit Transfer)?  
**A.** Inter-unit transfer of EP registration numbers between parent and receiving units.

**Q187.** What section headers appear on EP IUT?  
**A.** PARENT UNIT DETAILS and RECEIVING UNIT DETAILS.

**Q188.** What EQPT selectors appear on EP IUT?  
**A.** EQPT Domain and EQPT Sub Domain (`--Select EQPT Domain--`, `--Select EQPT Sub Domain--`).

**Q189.** Is RV No used on EP IUT?  
**A.** Yes. RV No can be entered (placeholder “Enter RV No...”).

**Q190.** What seeded issuer authority examples exist?  
**A.** DG CD, DGOS, DGAS, DGEME, plus depots/workshops such as COD Delhi and AOD Pathankot.

**Q191.** What seeded holding unit examples exist?  
**A.** 1 Guards, 2 Rajput, 3 Sikh, 4 Madras, 5 JAK LI, Artillery Regiment, Armoured Regiment.

**Q192.** Which tables support issuer and holding units for EP?  
**A.** `MMS_EP_ISSUER_UNIT` and `MMS_EP_HOLDING_UNIT`.

**Q193.** What serviceability options are used on Capture EP?  
**A.** Serviceable, Repairable, BER.

**Q194.** What is the recommended order of EP master setup before capture?  
**A.** Domain Master → Sub Domain Master → Gen EP Census → Capture EP Stores → Search/Approve EP Stores.

**Q195.** Can EP IUT transfer proceed without selecting parent and receiving units?  
**A.** No. Both PARENT UNIT DETAILS and RECEIVING UNIT DETAILS are required context for IUT.

**Q196.** What does “Search Regd ..” refer to on transfer/IUT screens?  
**A.** Searching registration (Regd/Regn) numbers available for transfer.

**Q197.** Is EP Domain Master the same as MMS Domain Master?  
**A.** No. EP Domain Master is for EP EQPT domains; MMS Domain Master is for general MMS reference domain values.

**Q198.** What API creates EP domains?  
**A.** `POST` under `/ep/domain-master/`.

**Q199.** What API generates and creates EP census?  
**A.** `/ep/gen-census/` (generate and create).

**Q200.** Why must EP captures be approved?  
**A.** New captures start as Pending (`P`) and must be approved (`A`) via Search/Approve EP Stores before they are treated as approved holdings.

---

## 10. Generate RO (Release Order)

**Q201.** What does Upload DIR/DRR do?  
**A.** Uploads DRR or DIR Excel/document types for receive/issue processing (form title DRR/ DIR UPLOAD).

**Q202.** What upload types are selectable on Upload DIR/DRR?  
**A.** DRR and DIR.

**Q203.** What is the form title for Generate RO?  
**A.** MMS RO GENERATION.

**Q204.** What is Generate RO used for?  
**A.** Creating MMS release orders against PRF/org hierarchy/unit context.

**Q205.** What Type of RO options exist?  
**A.** Fresh Issue, Replacement, Loan.

**Q206.** What key fields appear on MMS RO GENERATION?  
**A.** Type of RO, RO No, File NO, PRF, organisation hierarchy, and unit.

**Q207.** What is Search RO used for?  
**A.** Searching release orders (form title SEARCH RELEASE ORDER) by filters and collection status.

**Q208.** What Search RO collection status values exist?  
**A.** Not Yet Collected, Partially Collected, Fully Collected, Cancelled.

**Q209.** What Force Type options appear in RO-related forms?  
**A.** Regular, TA, RR.

**Q210.** Are RO backends fully implemented or scaffolded?  
**A.** Scaffold-oriented with `/ro/drr-dir-upload`, `/ro/generate-ro`, `/ro/search-ro` status endpoints; UI may toast on submit.

**Q211.** What Line Dte options may appear on Search RO?  
**A.** DGOS, DGAS, DGEME (among directorate options).

**Q212.** Why upload DRR/DIR before or alongside RO work?  
**A.** DRR/DIR uploads feed receive/issue document data used in the RO generation process.

**Q213.** What does “Fresh Issue” RO mean?  
**A.** A release order type for fresh issue of stores/equipment.

**Q214.** What does “Replacement” RO mean?  
**A.** A release order type for replacement issue.

**Q215.** What does “Loan” RO mean?  
**A.** A release order type for loan issue.

**Q216.** What does Partially Collected mean for an RO?  
**A.** The release order has been collected only in part.

**Q217.** What does Fully Collected mean for an RO?  
**A.** The release order has been completely collected.

**Q218.** What does Not Yet Collected mean for an RO?  
**A.** No collection has been recorded yet against the RO.

**Q219.** What does Cancelled mean for an RO?  
**A.** The release order has been cancelled.

**Q220.** Can PRF Group on RO use sample groups like Group A/B/C as well as PRF-INF style codes?  
**A.** Yes. Sample/option sets may include Group A/B/C and PRF-coded groups depending on screen.

---

## 11. EQPT Transfer / Deposit

**Q221.** What is Inter Unit Transfer (Unit to Unit)?  
**A.** Transfer of EQPT registration holdings from a parent unit to a receiving unit.

**Q222.** What is EQPT Transfer (Depot to Depot)?  
**A.** Transfer of EQPT between depots.

**Q223.** What is EQPT Deposit (Unit to Depot)?  
**A.** Deposit of EQPT from a unit to a depot.

**Q224.** What section headers are common on transfer forms?  
**A.** PARENT UNIT DETAILS and RECEIVING UNIT DETAILS (or equivalent parent/receiving depot context).

**Q225.** What selectors are typical before choosing census/regn on transfers?  
**A.** Type of Holding, Type of Eqpt, PRF Group, Nomenclature/Census, then Regn selection.

**Q226.** Can RV No/Date/Upload RV be captured on transfers?  
**A.** Yes. Optional RV No/Date/Upload RV is part of transfer/deposit flows.

**Q227.** What Type of Holding values are used on transfers?  
**A.** Authorised Holding, Temporary Holding, Surplus Holding, Loan Holding.

**Q228.** Are transfer backends fully wired?  
**A.** Largely scaffold (`/transfer/inter-unit`, `/depot-to-depot`, `/unit-to-depot` status endpoints) with UI mock submit behaviour.

**Q229.** Why must Regn Nos be selected for a transfer?  
**A.** Transfers move specific registered equipment items, not only nomenclature totals.

**Q230.** What placeholder is used for Type of Holding on transfer forms?  
**A.** `--Select Type of Holding--`.

**Q231.** What placeholder is used for PRF Group on transfer forms?  
**A.** `--Select PRF Group--`.

**Q232.** What placeholder is used for Census on transfer forms?  
**A.** `--Select Census--`.

**Q233.** How does Depot to Depot differ from Unit to Unit?  
**A.** Depot to Depot moves EQPT between depots; Unit to Unit moves between units.

**Q234.** How does Unit to Depot deposit differ from inter-unit transfer?  
**A.** Deposit sends EQPT from a unit into a depot rather than to another unit.

**Q235.** What does Upload RV mean on a transfer?  
**A.** Uploading the Receipt Voucher document supporting the transfer/deposit.

---

## 12. Reports

**Q236.** What does ALL INDIA HOLDING report?  
**A.** All-India equipment holding picture (AIH-oriented reporting).

**Q237.** What does UNIT WISE HOLDING DATA report?  
**A.** Holdings broken down unit-wise.

**Q238.** What does WPNS AND EQPT STATUS report?  
**A.** Weapon and equipment status across filters (form title style: WEAPON AND EQPT STATUS).

**Q239.** What does WPN AND EQPT DETAILS report?  
**A.** Detailed weapon and equipment listing by WPN CAT / SUB CAT and formation filters.

**Q240.** What does WPN EQPT STATUS NODAL DTE report?  
**A.** Weapon/equipment status scoped to Nodal Directorate.

**Q241.** What common filters appear across reports?  
**A.** PRF Group, Type of Holding, Month/Period, Arm, Command, Corps, Div, Bde, SUS No, Unit Name, Wpn categories, Line/Nodal Dte.

**Q242.** What WPN CAT field label appears on WPN AND EQPT DETAILS?  
**A.** WPN CAT (required).

**Q243.** What additional category field appears with WPN CAT?  
**A.** WPN SUB CAT.

**Q244.** What sample WPN categories appear in reports?  
**A.** Small Arms, Crew Served Wpn, Optics & NVDs, Comn Eqpt, Artillery; sub-cats such as Rifle, Carbine, LMG, MMG, Mortars, Radio Sets.

**Q245.** What Command options may appear?  
**A.** Northern, Western, Eastern, Southern, Central, and fuller names such as Northern Command … South Western Command.

**Q246.** What Corps samples may appear?  
**A.** I/II/III/IV/IX/X/XIV Corps style options.

**Q247.** Do report generate actions always hit live Oracle reports?  
**A.** Report UIs commonly use filter forms and may generate with frontend mock data depending on wiring.

**Q248.** What dual-select pane pattern is used on some reports?  
**A.** Dual-select panes to choose items/units then generate.

**Q249.** What holding filter placeholder appears on WPNS AND EQPT STATUS?  
**A.** `-- ALL Holdings --`.

**Q250.** What Arm filter placeholder appears on WPNS AND EQPT STATUS?  
**A.** `-- All ARMS --`.

**Q251.** What Command filter placeholder appears on WPNS AND EQPT STATUS?  
**A.** `-- All Command --`.

**Q252.** Why filter by Nodal Dte?  
**A.** To restrict weapon/EQPT status reporting to the responsible nodal directorate.

**Q253.** Why filter by SUS No on unit-wise reports?  
**A.** SUS No uniquely identifies the unit for precise holding extraction.

**Q254.** What does Month/Period do on reports?  
**A.** Restricts the holding/status snapshot to the selected reporting period.

**Q255.** Is ALL INDIA HOLDING the same as Incl in AIH on a master record?  
**A.** Related conceptually: AIH is the all-India holding view; Incl in AIH marks whether an item is included in that picture.

---

## 13. Roles, permissions & security behaviour

**Q256.** Which role is intended for central MMS administration?  
**A.** ADMIN (MMS Admin).

**Q257.** Which role is intended for unit-level operators?  
**A.** UNIT (Unit Operator).

**Q258.** What unit_id might a seed UNIT account have?  
**A.** Example `UNIT001`.

**Q259.** Does ADMIN typically have a unit_id?  
**A.** ADMIN may have `null` unit_id (not tied to one unit).

**Q260.** Can UNIT users access Capture MLCCS Details from the nav?  
**A.** No.

**Q261.** Can UNIT users access Link Eqpt with UE from the nav?  
**A.** No.

**Q262.** Can UNIT users access Unit Obsn Status from the nav?  
**A.** No (MMS Admin tile set).

**Q263.** Can UNIT users still use View MLCCS?  
**A.** Yes. View MLCCS is under MLCCS, not MMS Admin.

**Q264.** Can UNIT users use EP Stores screens?  
**A.** Yes. EP Stores is a Weapon sub-module available in general nav (not ADMIN-gated like MMS Admin).

**Q265.** Can UNIT users use Generate RO screens?  
**A.** Yes, subject to app access; RO is not the ADMIN-only MMS Admin block.

**Q266.** Can UNIT users use EQPT Transfer/Deposit screens?  
**A.** Yes, as part of Weapon modules available to signed-in operators.

**Q267.** What protected API helper requires unit or admin?  
**A.** `require_unit_or_admin` style dependency allowing both ADMIN and UNIT.

**Q268.** Where are users stored?  
**A.** `MMS_USERS`.

**Q269.** What active flag value means the account can log in?  
**A.** `Y`.

**Q270.** Should training answers invent leave/HR permissions for MMS?  
**A.** No. MMS has no leave/attendance/duty roster module.

---

## 14. Data entities & backend map

**Q271.** What database platform does MMS use?  
**A.** Oracle (SQLAlchemy models; `MMS_*` tables).

**Q272.** What is the API base path?  
**A.** `/api/v1`.

**Q273.** What typical backend port is used in development?  
**A.** `8001`.

**Q274.** How does the frontend reach the API in Vite dev?  
**A.** Vite proxies `/api/v1` to the backend.

**Q275.** What does `GET /health` check?  
**A.** Basic API health.

**Q276.** What does `GET /health/ready` check?  
**A.** Readiness (including deeper dependency readiness as implemented).

**Q277.** What endpoints handle authentication?  
**A.** `POST /auth/login` and `GET /auth/me`.

**Q278.** Which model represents MLCCS equipment master?  
**A.** `MlccsEquipmentMaster` → `MMS_MLCCS_EQUIPMENT_MASTER`.

**Q279.** Which model represents domain values?  
**A.** `DomainValue` → `MMS_DOMAIN_VALUES`.

**Q280.** Which model represents unit master detail holdings?  
**A.** `UnitMasterDetail` → `MMS_UNIT_MSTR_DETL`.

**Q281.** Which model represents EP master census?  
**A.** `EpMstr` → `MMS_EP_MSTR`.

**Q282.** Which model represents EP transactions?  
**A.** `EpTransaction` → `MMS_EP_TRANSACTION`.

**Q283.** Which model represents MMS users?  
**A.** `MmsUser` → `MMS_USERS`.

**Q284.** What conceptual entities often appear in UI even when mocked?  
**A.** Unit, Depot, Command, Corps, Div, Bde, Arm, PRF Group, Release Order, DRR/DIR file, Regn pool, RV uploads.

**Q285.** What frontend stack is used?  
**A.** TanStack Start / React / TypeScript / Tailwind.

**Q286.** What backend stack is used?  
**A.** FastAPI + SQLAlchemy + Oracle.

**Q287.** Where is architecture documented in-repo?  
**A.** `docs/ARCHITECTURE.md`.

**Q288.** Is there an existing end-user FAQ in the repo prior to this corpus?  
**A.** No dedicated FAQ/help-centre existed; README and ARCHITECTURE cover setup/architecture.

**Q289.** What table stores EP issuer units?  
**A.** `MMS_EP_ISSUER_UNIT`.

**Q290.** What table stores EP holding units?  
**A.** `MMS_EP_HOLDING_UNIT`.

---

## 15. Status codes & dropdown vocabulary

**Q291.** Expand EP op_status `P`.  
**A.** Pending.

**Q292.** Expand EP op_status `A`.  
**A.** Approved.

**Q293.** Expand EP op_status `R`.  
**A.** Rejected.

**Q294.** What does item_status `CUR` mean in practice for training?  
**A.** Current item status (default for new census-style items).

**Q295.** What does item_status `ACT` indicate?  
**A.** Active status code used in MLCCS/EP item status sets.

**Q296.** What does item_status `OBS` indicate?  
**A.** Obsolete / observation-related item status code in the status set.

**Q297.** What does item_status `PHS` indicate in Gen EP?  
**A.** An additional Gen EP item status option alongside CUR/ACT/OBS.

**Q298.** What are Authorised Holding, Temporary Holding, Surplus Holding, and Loan Holding?  
**A.** The four Type of Holding classifications used in transfers/reports/options.

**Q299.** What serviceability set should be cited for EP Capture?  
**A.** Serviceable, Repairable, BER.

**Q300.** What serviceability set should be cited for UPDATE EQPT DATA?  
**A.** Serviciable, Repairable, BER, Under Repair.

**Q301.** When is Under Repair used?  
**A.** On Unit Holding UPDATE EQPT DATA serviceability options.

**Q302.** What does Incl in AIH = Y mean?  
**A.** Yes — include the item in All India Holding.

**Q303.** What does Incl in AIH = N mean?  
**A.** No — do not include the item in All India Holding.

**Q304.** What OH types should a model list for arty EQPT?  
**A.** Minor OH, Major OH, Base OH, Intermediate OH.

**Q305.** What Op Clearance values should a model list?  
**A.** Cleared, Not Cleared, Pending.

**Q306.** What Force Types should a model list?  
**A.** Regular, TA, RR.

**Q307.** What RO types should a model list?  
**A.** Fresh Issue, Replacement, Loan.

**Q308.** What RO collection statuses should a model list?  
**A.** Not Yet Collected, Partially Collected, Fully Collected, Cancelled.

**Q309.** What Obsn statuses should a model list?  
**A.** Open, Closed, Pending (plus `-- ALL STATUS --`).

**Q310.** What DRR/DIR upload type values should a model list?  
**A.** DRR, DIR.

---

## 16. End-to-end workflows (how-to)

**Q311.** How does a user open View MLCCS after login?  
**A.** Dashboard/Home → Weapon → MLCCS → View MLCCS.

**Q312.** How does an ADMIN capture a new MLCCS equipment?  
**A.** Weapon → MMS Admin → Capture MLCCS Details → Add New Eqpt → COS Section + Nomenclature → generate Census No → fill fields → save.

**Q313.** How does an ADMIN modify an existing census?  
**A.** Capture MLCCS Details → Modify Census → lookup by Census No/Nomenclature → update → save.

**Q314.** How does an ADMIN link census to UE item code?  
**A.** Weapon → MMS Admin → Link Eqpt with UE → select Census No → enter Linked Item Code → link.

**Q315.** How does an ADMIN check unit observations?  
**A.** Weapon → MMS Admin → Unit Obsn Status → filter by Unit Name/Period/Status → review Obsn and MISO Reply.

**Q316.** How does an ADMIN add a domain reference value?  
**A.** MMS Domain Master → Add → enter Domain Name, Code Value, Label Name, Label Short, Display Order → save.

**Q317.** How does a user search a registration number as ADMIN?  
**A.** MMS Admin → Search Regn No → enter Regn No (and optional Census No / PRF Code) → search.

**Q318.** How is EP category hierarchy created?  
**A.** EP Stores → Domain Master (create domain) → Sub Domain Master (create sub-domain under domain).

**Q319.** How is an EP census generated?  
**A.** EP Stores → Gen EP Census → select sub-domain → generate census → capture metadata → save to EP master.

**Q320.** How is an EP holding captured?  
**A.** Capture EP Stores → select sanctioning/issuer auth, holding unit, IV, domain/sub-domain, qty, regn lines, serviceability → submit (Pending).

**Q321.** How is a pending EP store approved?  
**A.** Search/Approve EP Stores → filter Pending → select record → approve (`op_status` → `A`).

**Q322.** How is an EP inter-unit transfer initiated in UI?  
**A.** EP IUT → fill PARENT UNIT DETAILS (domain/sub-domain/RV as needed) → RECEIVING UNIT DETAILS → select Regd/Regn → submit.

**Q323.** How does a unit add new EQPT to holding?  
**A.** Unit Holding → ADD NEW EQPT → enter IV and line details (PRF, nomenclature, material, qty, etc.) → submit.

**Q324.** How does a unit get new EQPT approved?  
**A.** Unit Holding → APPROVE NEW EQPT → search by SUS/unit/dates/status → approve.

**Q325.** How does a unit update general EQPT serviceability?  
**A.** UPDATE EQPT DATA → search holding → update serviceability (Serviciable/Repairable/BER/Under Repair) and related fields.

**Q326.** How does a unit update artillery-specific data?  
**A.** UPDATE ARTY EQPT DATA → use OH Details / Barrel Details / Strip Inspection tabs → save.

**Q327.** How is a Release Order generated in UI?  
**A.** Generate RO → Generate RO tile → MMS RO GENERATION → enter Type of RO, RO No, File NO, PRF, org hierarchy, unit → submit.

**Q328.** How is DRR/DIR uploaded?  
**A.** Generate RO → Upload DIR/DRR → choose DRR or DIR → upload file → submit.

**Q329.** How is an RO searched by collection status?  
**A.** Search RO → SEARCH RELEASE ORDER → apply filters including collection status → search.

**Q330.** How is a unit-to-unit EQPT transfer done in UI?  
**A.** EQPT Transfer/Deposit → Inter Unit Transfer (Unit to Unit) → parent/receiving details → Type of Holding/PRF/Census → select Regn → optional RV → submit.

**Q331.** How is a depot-to-depot transfer done in UI?  
**A.** EQPT Transfer (Depot to Depot) → select parent/receiving depot context and EQPT/regn details → submit.

**Q332.** How is a unit-to-depot deposit done in UI?  
**A.** EQPT Deposit (Unit to Depot) → unit as parent, depot as receiving → select EQPT/regn → submit.

**Q333.** How is ALL INDIA HOLDING generated in UI?  
**A.** Reports → ALL INDIA HOLDING → set filters → generate.

**Q334.** How is UNIT WISE HOLDING DATA generated?  
**A.** Reports → UNIT WISE HOLDING DATA → filter by formation/SUS/unit as required → generate.

**Q335.** How is WPN EQPT STATUS NODAL DTE generated?  
**A.** Reports → WPN EQPT STATUS NODAL DTE → select Nodal Dte and other filters → generate.

---

## 17. Field-level & form language

**Q336.** What does a required WPN CAT mean on a report form?  
**A.** The user must select a weapon category before generating WPN AND EQPT DETAILS.

**Q337.** What does `--Select Unit--` imply?  
**A.** A unit must be chosen from the dropdown/search control.

**Q338.** What does `--Select All--` / `-- Select All --` imply on Command?  
**A.** No single-command restriction; include all commands.

**Q339.** What does `-- ALL --` mean on MMS Domain Master search?  
**A.** Do not restrict the search to one domain filter value.

**Q340.** What does “Enter IV No...” prompt the user for?  
**A.** Issue Voucher number.

**Q341.** What does “Enter RV No...” prompt the user for?  
**A.** Receipt Voucher number.

**Q342.** What does “Enter Material No...” prompt the user for?  
**A.** Material number of the EQPT line.

**Q343.** What does “Enter Qty...” prompt the user for?  
**A.** Quantity of the EQPT being captured.

**Q344.** What does “In %...” refer to on ADD NEW EQPT?  
**A.** A percentage field (e.g. depreciation-related input) on the new EQPT form.

**Q345.** What does “Search Regd ..” mean?  
**A.** Search registered equipment numbers for selection.

**Q346.** What does PARENT UNIT DETAILS contain?  
**A.** The transferring/source unit side of an IUT or transfer (holding type, PRF, census, RV, etc.).

**Q347.** What does RECEIVING UNIT DETAILS contain?  
**A.** The destination unit side that will receive the EQPT/regn.

**Q348.** Why is Nomenclature important across modules?  
**A.** It is the human-readable item designation used in search, capture, transfer, and reports.

**Q349.** Why is Census No important across modules?  
**A.** It is the controlled-store census key linking master MLCCS/EP identity to holdings and links.

**Q350.** Why is Regn No important across modules?  
**A.** It identifies the specific physical equipment instance for search, approve, IUT, and transfers.

---

## 18. Distinctions & common confusions

**Q351.** Is MLCCS the same as EP Stores?  
**A.** No. MLCCS is the Master List of Census of Controlled Stores; EP Stores is Equipment Personal stores with its own domain/census/capture/approve lifecycle.

**Q352.** Is MMS Admin the same as the MMS dashboard card?  
**A.** No. MMS Admin is an ADMIN module of admin tools; the MMS dashboard card shows Total UE and Total UH.

**Q353.** Is Generate RO part of EP Stores?  
**A.** No. Generate RO is its own Weapon sub-module for Release Orders.

**Q354.** Is EP IUT the same as Inter Unit Transfer (Unit to Unit) under EQPT Transfer/Deposit?  
**A.** Related concept (inter-unit movement) but different screens: EP IUT is under EP Stores; Unit to Unit transfer is under EQPT Transfer/Deposit.

**Q355.** Is View MLCCS an ADMIN-only screen?  
**A.** No. It is under MLCCS and available in general Weapon navigation.

**Q356.** Is Capture MLCCS Details available without ADMIN?  
**A.** Not via normal nav; it is under MMS Admin.

**Q357.** Does “Unit Obsn Status” manage equipment transfers?  
**A.** No. It tracks unit observations and MISO replies.

**Q358.** Does “Link Eqpt with UE” create a release order?  
**A.** No. It links Census No to Linked Item Code (UE).

**Q359.** Does ADD NEW EQPT immediately mean All India Holding update?  
**A.** No. ADD NEW EQPT captures unit holding new equipment details; AIH is a reporting/inclusion concept.

**Q360.** Is BER a Type of Holding?  
**A.** No. BER is a serviceability status (Beyond Economic Repair).

**Q361.** Is PRF the same as Census No?  
**A.** No. PRF/PRF Group is a grouping code; Census No is the census identifier.

**Q362.** Is IV the same as RV?  
**A.** No. IV is Issue Voucher; RV is Receipt Voucher.

**Q363.** Is SUS No the same as Regn No?  
**A.** No. SUS No identifies the unit/store system number; Regn No identifies equipment registration.

**Q364.** Is Nodal Dte the same as Line Dte?  
**A.** No. Both are directorate concepts but used as distinct filter dimensions (Nodal vs Line).

**Q365.** Is OH the same as Obsn?  
**A.** No. OH is Overhaul; Obsn is Observation.

**Q366.** Is UE the same as UH?  
**A.** No. UE relates to entitlement/item-code linkage; UH relates to unit holding totals/context.

**Q367.** Should the model expand MMS as Military Management System?  
**A.** No. In this product, MMS means Material / Master List Management.

**Q368.** Should the model invent attendance marking in MMS?  
**A.** No. Attendance/leave/duty are out of scope.

**Q369.** Should the model treat IT Asset as a full implemented inventory suite?  
**A.** No. IT Asset is a placeholder module in the current app.

**Q370.** Should answers prefer UI labels exactly (e.g. UPDATE ARTY EQPT DATA)?  
**A.** Yes. Prefer exact tile and form labels used in MISO · MMS.

---

## 19. Troubleshooting & operator Q&A

**Q371.** A UNIT user cannot see MMS Admin tiles. Is this a bug?  
**A.** No. MMS Admin is intentionally ADMIN-only.

**Q372.** Login fails with inactive account. What should be checked?  
**A.** The user’s active flag on `MMS_USERS` must be `Y`.

**Q373.** EP capture saved but not visible as approved. Why?  
**A.** New captures are Pending (`P`) until approved in Search/Approve EP Stores.

**Q374.** Census No cannot be generated on Capture MLCCS. What is usually required first?  
**A.** COS Section and Nomenclature (then generate Census No).

**Q375.** Link Eqpt with UE cannot find an item. What should be checked?  
**A.** Valid Census No via typeahead/lookup and a correct Linked Item Code.

**Q376.** Transfer form cannot list Regn numbers. What is usually missing?  
**A.** Parent unit/holding filters such as Type of Holding, PRF Group, and Census selection.

**Q377.** Report returns empty. What should the operator review?  
**A.** Filters such as Command/Corps/Div/Bde, Arm, PRF Group, Period, SUS No, and WPN CAT.

**Q378.** Session suddenly returns to login. What likely happened?  
**A.** Token expiry or unauthorized (401) response cleared the session.

**Q379.** User asks where to upload DRR. Where is it?  
**A.** Weapon → Generate RO → Upload DIR/DRR.

**Q380.** User asks where to approve EP stores. Where is it?  
**A.** Weapon → EP Stores → Search/Approve EP Stores.

**Q381.** User asks where to update barrel data for guns. Where is it?  
**A.** Weapon → Unit Holding → UPDATE ARTY EQPT DATA → Barrel Details.

**Q382.** User asks where to see Total UE / Total UH. Where is it?  
**A.** Dashboard → MMS card.

**Q383.** User asks where to maintain EP sub-domains. Where is it?  
**A.** Weapon → EP Stores → Sub Domain Master.

**Q384.** User asks difference between Search RO and Generate RO.  
**A.** Generate RO creates a release order; Search RO finds existing ROs and their collection status.

**Q385.** User asks whether print/export exists on View MLCCS.  
**A.** Yes — CSV export and print (with watermark) are part of View MLCCS capabilities.

---

## 20. Sample PRF, directorates & formation language

**Q386.** Give sample PRF Group codes used in the app samples.  
**A.** PRF-INF-01, PRF-ARTY-02, PRF-ARMD-03, PRF-ASC-04, PRF-ENGR-05.

**Q387.** Give sample Line Dte values.  
**A.** DGMI, DGMF, DGQA, DGOS, DG EME.

**Q388.** Give sample Nodal Dte style values.  
**A.** Nodal Dte Inf, Arty, Armd, ASC (and related DGOS/DGAS/DGEME contexts).

**Q389.** Give sample Command names.  
**A.** Northern Command, Western Command, Eastern Command, Southern Command, Central Command, South Western Command (and short labels Northern/Western/Eastern/Southern/Central).

**Q390.** Give sample Corps labels.  
**A.** I Corps, II Corps, III Corps, IV Corps, IX Corps, X Corps, XIV Corps.

**Q391.** Give sample holding units used in seeds/demos.  
**A.** 1 Guards, 2 Rajput, 3 Sikh, 4 Madras, 5 JAK LI, Artillery Regiment, Armoured Regiment.

**Q392.** Give sample depots/workshops used in seeds/demos.  
**A.** COD Delhi, AOD Pathankot, and similar COD/AOD/WKSP names.

**Q393.** Give sample Type of Eqpt values.  
**A.** Small Arms, Crew Served Wpn, Optics & NVDs, Comn Eqpt, Artillery.

**Q394.** Give sample WPN SUB CAT values.  
**A.** Rifle, Carbine, LMG, MMG, Mortars, Radio Sets.

**Q395.** Give sample Accounting Unit values.  
**A.** NOS, EA, KG, LTR, MTR.

**Q396.** What does “Comn Eqpt” mean in Type of Eqpt / WPN lists?  
**A.** Communication equipment.

**Q397.** What does “Crew Served Wpn” mean?  
**A.** Crew-served weapon category.

**Q398.** What does “Optics & NVDs” mean?  
**A.** Optics and Night Vision Devices category.

**Q399.** When answering formation questions, which hierarchy order should be preferred?  
**A.** Command → Corps → Div → Bde → Unit (SUS No / Unit Name).

**Q400.** What single sentence best describes MMS for model answers?  
**A.** MISO · MMS (Material / Master List Management) is the Indian Army application for MLCCS census, unit holdings, EP stores, release orders, EQPT transfers/deposits, and related weapon/equipment reports under ADMIN and UNIT roles.

---

## 21. Extra high-value training pairs (401–420)

**Q401.** What modules should be named if asked “What can I do under Weapon?”  
**A.** MLCCS, Unit Holding, Reports, MMS Admin (ADMIN), EP Stores, Generate RO, EQPT Transfer/Deposit.

**Q402.** What exact tile label is used for artillery update?  
**A.** UPDATE ARTY EQPT DATA.

**Q403.** What exact tile label is used for EP inter-unit transfer?  
**A.** EP IUT (Inter Unit Transfer).

**Q404.** What exact tile label is used for uploading receive/issue files?  
**A.** Upload DIR/DRR.

**Q405.** What exact form title is used for RO creation?  
**A.** MMS RO GENERATION.

**Q406.** What exact form title is used for RO search?  
**A.** SEARCH RELEASE ORDER.

**Q407.** What exact form title is used for adding unit EQPT?  
**A.** ADD DETAILS OF NEW EQPT.

**Q408.** What exact search title is used on approve new EQPT?  
**A.** SEARCH DETAILS OF NEW EQPT.

**Q409.** What notification examples may appear in the header popover?  
**A.** “RO pending approval”, “Census sync complete”, “Eqpt transfer raised”.

**Q410.** If asked for the full product name line, what should be answered?  
**A.** MANAGEMENT INFORMATION SYSTEM ORGANISATION — MISO · Version 5.0 — MMS (Material / Master List Management) for the Indian Army.

**Q411.** What does “Controlled Stores” refer to in MLCCS?  
**A.** Equipment/stores tracked on the Master List of Census of Controlled Stores.

**Q412.** What does “sanctioning authority” relate to in EP Capture?  
**A.** The authority that sanctions/issues EP stores (issuer auth units such as DGOS/DGAS/DGEME/depots).

**Q413.** What does “holding unit” mean in EP Capture?  
**A.** The unit that holds the captured EP stores/regn quantities.

**Q414.** Should answers mix civilian inventory jargon like “SKU cart” for Census No?  
**A.** No. Prefer Census No, Regn No, PRF Group, SUS No, and other MMS terms.

**Q415.** Should answers say “ticket” for Unit Obsn?  
**A.** Prefer Observation / Obsn and MISO Reply terminology.

**Q416.** What print concern is associated with View MLCCS?  
**A.** Printed output may include a watermark for controlled viewing.

**Q417.** What does pagination support on View MLCCS?  
**A.** Browsing large census search result sets page by page.

**Q418.** What does class filter do on View MLCCS?  
**A.** Restricts census search results by class.

**Q419.** If a question asks for leave balance in MMS, what is the correct response style?  
**A.** State that MMS does not manage leave/attendance; it manages material/master list and equipment holdings under MISO.

**Q420.** If a question asks how many user roles exist in MMS auth?  
**A.** Two primary roles: ADMIN and UNIT.

---

## Appendix A — Abbreviation cheat sheet

| Abbrev | Expansion / meaning in MMS |
|--------|----------------------------|
| MISO | Management Information System Organisation |
| MMS | Material / Master List Management |
| MLCCS | Master List of Census of Controlled Stores |
| EP | Equipment Personal / EP Stores |
| EQPT | Equipment |
| WPN | Weapon |
| ARTY | Artillery |
| RO | Release Order |
| DRR / DIR | Upload document types (receive/issue) |
| IUT | Inter Unit Transfer |
| UE | Unit Entitlement (link/totals context) |
| UH | Unit Holding (totals/context) |
| SUS No | Unit/store unique system number |
| Census No | Census identifier |
| Regn / Regd No | Registration number |
| IV | Issue Voucher |
| RV | Receipt Voucher |
| PRF | Equipment group code |
| COS | Class of Store (section) |
| AIH | All India Holding |
| Obsn | Observation |
| OH | Overhaul |
| BER | Beyond Economic Repair |
| NSN | NATO Stock No |
| DCAN | Def Catalogue No |
| AHSP | Authority Holding Sealed Particulars |
| A/U | Accounting Unit |
| Comd | Command |
| Nodal Dte / Line Dte | Directorates |
| COD / AOD | Central / Advanced Ordnance Depot |
| WKSP | Workshop |
| TA / RR | Force Type options with Regular |

## Appendix B — Suggested training use

- Use **Q/A pairs** as supervised fine-tuning or RAG chunks.
- Prefer **exact UI labels** in model outputs.
- Keep **ADMIN vs UNIT** gating accurate for MMS Admin.
- Do not invent HR modules; stay within MLCCS, Unit Holding, EP, RO, Transfer/Deposit, Reports, Dashboard, IT Asset placeholder.
- When unsure if a backend is live, describe the **UI workflow** and note scaffold/mock where relevant rather than inventing Oracle behaviours.

---

*Corpus size: 420 Q&A pairs + appendices. Generated for MISO · MMS model training.*
