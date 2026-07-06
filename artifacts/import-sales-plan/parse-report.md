# Sales Plan 2026 — Parse Report

- **Source file:** `/root/.claude/uploads/b9ff02c6-47a8-5ca2-bbd1-4d6bc69a8070/6a29c2f9-Trucks_and_Vehicles_2026__June__Copy.xlsx`
- **Sheet:** `Invoicing plan 2026` (cross-referenced with `Under production Orders`)
- **Generated:** 2026-07-06T19:58:52.468Z
- **Data rows read:** 63 (TOTAL row detected at sheet row 65, excluded)
- **Distinct SO-number groups (→ one `projects` row each):** 38
- **Rows with no SO number (excluded, need a decision):** 6
- **SO-number cells containing multiple values (excluded, need a decision):** 1
- **"Under production Orders" rows matched to an approved owner (used for enrichment):** 35
- **"Under production Orders" rows excluded (owner not one of the 10 approved users):** 31

## Grouping logic (read this first)

`SO number` (column F) is the true one-project key — `projects.so_number` is unique in the schema.
`Proj. No` (column E) is a **per-line** internal reference (several distinct Proj. No values often
share one SO number, e.g. one Sales Order with 5 vehicle types) — it is NOT used as `project_code`.
`project_code` is set to the SO number itself (already unique, human-recognizable). Flag if you
would prefer a different source.

`customer_delivery_date` (required, not-null in the schema) has no direct source column in either
sheet. Every project below estimates it as the **last month with a scheduled invoicing amount**
(or 2026-12-31 if none) — shown per project as "(estimated)". Treat every delivery date as
provisional; a per-project flag only appears below when a project has NO monthly amount at all.

## Owner match summary

| Approved user | Found in plan sheet | SO groups | Total value |
|---|---|---|---|
| Nader (nader@ft.com) | yes | 2 | 28,900,541 |
| Mahmoud (mahmoud@ft.com) | yes | 9 | 68,902,835 |
| Abdullah (abdullah.s@ft.com) | yes | 10 | 32,664,625 |
| Abdulhamid (abdulhamid@ft.com) | yes | 5 | 2,115,550 |
| ESSAM (essam@ft.com) | yes | 1 | 1,500,000 |
| Obada (obada@ft.com) | yes | 4 | 5,618,020 |
| Ahmed Qadomi (ahmed.qadomi@ft.com) | yes | 1 | 3,155,150 |
| Hatem (hatem@ft.com) | yes | 4 | 3,103,000 |
| Suliman (suliman@ft.com) | yes | 1 | 7,900,000 |
| Nadeem (nadeem@ft.com) | yes | 1 | 14,940,675 |

## Decisions needed before import

### Rows with no SO number

| Row | Done by | Customer | JOH | Total Value |
|---|---|---|---|---|
| 8 | Nader | SAR | FIRE FIGHTING & RESCUE VEHICLE | 38692500 |
| 9 | Nader | SAR | RailRoad Type I  ambulance | 10569900 |
| 10 | Nader | SAR | NFPA 1917 | 126500 |
| 11 | Nader | SAR | AMC-3 years ambulances | 1080000 |
| 12 | Nader | SAR | AMC-3 years firetrucks | 4200000 |
| 23 | Mahmoud | AFRAS - SEAFTY | SEAFTY | 1009023.71 |

### SO-number cells containing multiple values

- `"103351 | 103243"` — rows 14, 15 (AMBULANCE TYPE II / XFRAME STRETCH AMBU II MX PRO R3 STRYKER)

### Per-project flags requiring review

- **SO 102412** (KFSHRC - RIYADH):
  - location "(blank)" not recognized (expected Dubai/KSA) — defaulted to not_set
- **SO 102964** (SRCA - Ambulances):
  - row 7 (Nupco - 57 ambulances): quantity was 0/blank in source — defaulted to 1 to satisfy quantity>0, verify
- **SO 103074** (MOD):
  - row 34: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
- **SO 103084** (Royal air defense):
  - location "(blank)" not recognized (expected Dubai/KSA) — defaulted to not_set
- **SO 103252/103251** (Afras):
  - row 13: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
- **SO 103445** (NUPCO - MOD Saud Force):
  - row 47: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
- **SO 103453** (King Fahad Military Med. City):
  - row 21: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
  - row 22: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
- **SO 103479** (NADEC):
  - row 43: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
- **SO 103486** (RAC):
  - row 25: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
  - row 26: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
  - row 27: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
  - row 28: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
  - row 29: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
  - row 30: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
  - row 31: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
  - row 32: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
- **SO 103522** (MBCC):
  - row 33: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify
- **SO 103534** (SE Company):
  - row 64: 2027 column has an amount but no month — schedule line defaulted to January 2027, verify

### "Under production Orders" rows excluded — owner not one of the 10 approved users

| Owner (not approved) | Count | SO numbers |
|---|---|---|
| Zohairy | 9 | 103013, 103084, 103084, 103165, 102079, 102412, 102826, 102800, 102800 |
| Ayman | 4 | 103077, 103111, 102729, 102978 |
| Duha | 2 | 102792, 102792 |
| Rahaf | 1 | 103055 |
| Khaled | 4 | 103134 / 103156, 102744, 102959, 102948 |
| Osama | 6 | 103123/103126/103127, 103123/103126/103127, 103123/103126/103127, 102586, 102640, 102584 |
| Dam (Soliman hassan) | 3 | 102408, 102578, 102320 |
| EXPORT (Huthaifa & Mohamad) | 2 | 103103, 103022/102943 |


## Per-owner breakdown

### Nader (`nader@ft.com`)

#### SO 102964 — SRCA - Ambulances

- Location: `saudi` · Status: `completed` · Total value: 605,341 · Delivery date estimate: 2026-05-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Nupco - 57 ambulances | 1 (was 0) | 605,341 | 605,341 |

| Invoicing month | Amount |
|---|---|
| 2026-05 | 605,341 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 7 | PO#: 5818 | Proj No: 1906 | Pending Value: 0 | Delivery (contract): 46190 | Remarks: Done | Sector: Gov. | Penalty: SAFE / 0 / 1% deduction for each late week, up to a maximum of  6% | Total incl. VAT (source): 69245310 | Location detail: JED | Production remarks: 48 kits have been delivered.
3 units have been delivered.
6 units are nearly ready, and we will arrange shipping soon.
 materials are still pending for all delivered units. / All chassis received.
- Awaiting pending materials and kits from Dubai.
- 15 kits received in 3 containers on 29.03.2025.
- Pending list for 15 sets sent to Josvin on 09.04.2025.
- 33 kits received (2nd lot) on 29.04.2025; pending list sent to Dubai.
- Awaiting balance materials from Dubai.
- Partial items received in 2 containers on 25.06.2025.
- Partial items received in 1 container on 26.06.2025.
- Remaining items ETA: 15.07.2025 (still not received).

#### SO 103009 — Afras - Custom project

- Location: `dubai` · Status: `completed` · Total value: 28,295,200 · Delivery date estimate: 2026-02-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Combined Fire & Rescue Vehicle | 3 | 2,044,000 | 6,132,000 |
| 2 | Light Rescue Vehicle | 2 | 1,580,000 | 3,160,000 |
| 3 | Water Tanker | 4 | 1,625,300 | 6,501,200 |
| 4 | Rapid Intervention Vehicle | 4 | 880,000 | 3,520,000 |
| 5 | Hazmat Vehicle | 3 | 2,994,000 | 8,982,000 |

| Invoicing month | Amount |
|---|---|
| 2026-02 | 6,132,000 |
| 2026-02 | 3,160,000 |
| 2026-02 | 6,501,200 |
| 2026-02 | 3,520,000 |
| 2026-02 | 8,982,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 2,3,4,5,6 | PO#: 5929 | Proj No: 1921 / 1923 / 1924 / 1922 / 1920 | Pending Value: 0 | Delivery (contract): 3 Units,12-Dec-2025
3 Units, 12-Feb-2026
3 Units, 13-Apr-2026 | 5 Units,12-Dec-2025
5 Units, 12-Feb-2026
10Units, 13-Apr-2026 | 2 Units,12-Dec-2025
 3 Units, 12-Feb-2026
2 Units, 13-Apr-2026 | Remarks: Done | Sector: Private | Penalty: SAFE / 0 / 0.5% deduction for each late week, up to a maximum of 10%. | Total incl. VAT (source): 24101700 | Location detail: Dubai | Production remarks: Chassis will be received Mid of AUG
3 units will be ready for FAT by 25 Sep 2025
4 units will be ready for FAT by 30 Oct 2025

### Mahmoud (`mahmoud@ft.com`)

#### SO 102412 — KFSHRC - RIYADH

- Location: `not_set` · Status: `active` · Total value: 2,039,069 · Delivery date estimate: 2026-07-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Hazmat & Hazard | 2 | 1,019,534.5 | 2,039,069 |

| Invoicing month | Amount |
|---|---|
| 2026-07 | 2,039,069 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 20 | PO#: 4109 | Proj No: 1605/1606 | Pending Value: 2039069 | Delivery (contract): 45538 | Remarks: 1 Unit Pass SASO
1 Unit waiting SASO

#### SO 103055 — Al-Jazerah / john hopkins aramco

- Location: `saudi` · Status: `active` · Total value: 9,215,000 · Delivery date estimate: 2026-08-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | AMBULANCE | 19 | 485,000 | 9,215,000 |

| Invoicing month | Amount |
|---|---|
| 2026-07 | 4,850,000 |
| 2026-08 | 4,365,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 19 | PO#: 6052 | Proj No: 1938 | Pending Value: 9215000 | Delivery (contract): Prototype, 1-May-2025
2 Units, 28-Jun-2025
3 Units, 28-Jul-2025
4 Units, 28Aug-2025
5 Units, 28-Sep-2025
5 Units, 28-Oct-2025 | Remarks: 1st Amb, dispatched from AFS.
19 Units pending the boxes from Dubai + raw materiaks

#### SO 103084 — Royal air defense

- Location: `not_set` · Status: `active` · Total value: 7,548,900 · Delivery date estimate: 2026-08-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | water tanker (18,000 Ltrs) | 2 | 1,393,500 | 2,787,000 |
| 2 | RIV F-550 | 3 | 1,587,300 | 4,761,900 |

| Invoicing month | Amount |
|---|---|
| 2026-08 | 2,787,000 |
| 2026-08 | 4,761,900 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 16,17 | PO#: 6151 | Proj No: 1985 / 1984 | Pending Value: 7548900 | Delivery (contract): 46050 | Remarks: Expected to move from Dubai on 15 July as per the latest update

#### SO 103165 — Royal air defense

- Location: `saudi` · Status: `active` · Total value: 633,000 · Delivery date estimate: 2026-06-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | AMBULANCE TYPE II | 1 | 633,000 | 633,000 |

| Invoicing month | Amount |
|---|---|
| 2026-06 | 633,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 18 | Proj No: 2016 | Pending Value: 633000 | Delivery (contract): 45889 | Remarks: Ready for Delivery, Waiting Arkan to Deliver Materials

#### SO 103252/103251 — Afras

- Location: `saudi` · Status: `active` · Total value: 6,785,000 · Delivery date estimate: 2027-01-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Hazmat Vehicle | 2 | 3,392,500 | 6,785,000 |

| Invoicing month | Amount |
|---|---|
| 2027-01 (month estimated) | 6,785,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 13 | PO#: 7259 | Proj No: PR#2554
Start Date 8/25/2025 | Pending Value: 6785000 | Delivery (contract): No ETA | Remarks: In Hold | source status was "Pending"

#### SO 103416 — DR. SULAIMAN AL HABIB

- Location: `saudi` · Status: `active` · Total value: 17,137,500 · Delivery date estimate: 2026-10-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | AMBULANCE TYPE II | 50 | 342,750 | 17,137,500 |

| Invoicing month | Amount |
|---|---|
| 2026-08 | 5,141,250 |
| 2026-09 | 5,141,250 |
| 2026-10 | 6,855,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 24 | PO#: 9008 | Proj No: 2135 | Pending Value: 17137500 | Delivery (contract): 46543 | Remarks: Waiting for the chassis. Firs raw materials Batch received in JED. 
Second batch under process

#### SO 103453 — King Fahad Military Med. City

- Location: `saudi` · Status: `active` · Total value: 1,977,730 · Delivery date estimate: 2027-01-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | AMBULANCE TYPE II | 1 | 1,111,150 | 1,111,150 |
| 2 | AMBULANCE TYPE I | 1 | 866,580 | 866,580 |

| Invoicing month | Amount |
|---|---|
| 2027-01 (month estimated) | 1,111,150 |
| 2027-01 (month estimated) | 866,580 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 21,22 | PO#: PO NUPCO 4600119387
WO # 26917177 PO#9090 | Proj No: 2129 / 2130 | Pending Value: 1977730 | Delivery (contract): 46422 | Remarks: Chassis PO is still pending from CEO's office.
Waiting for raw materials from Dubai

#### SO 103486 — RAC

- Location: `saudi` · Status: `active` · Total value: 22,876,636 · Delivery date estimate: 2027-01-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Mobile Command Vehicle | 4 | 572,400 | 2,289,600 |
| 2 | Structural Pumpers | 3 | 2,060,000 | 6,180,000 |
| 3 | Heayy Rescue Vehicle | 2 | 1,440,000 | 2,880,000 |
| 4 | Light Rescue Vehicle | 2 | 1,820,000 | 3,640,000 |
| 5 | Hazmat Vehicle | 1 | 1,688,000 | 1,688,000 |
| 6 | AMBULANCE | 1 | 699,036 | 699,036 |
| 7 | Mini Pumper | 2 | 1,050,000 | 2,100,000 |
| 8 | Water Tanker | 2 | 1,700,000 | 3,400,000 |

| Invoicing month | Amount |
|---|---|
| 2027-01 (month estimated) | 2,289,600 |
| 2027-01 (month estimated) | 6,180,000 |
| 2027-01 (month estimated) | 2,880,000 |
| 2027-01 (month estimated) | 3,640,000 |
| 2027-01 (month estimated) | 1,688,000 |
| 2027-01 (month estimated) | 699,036 |
| 2027-01 (month estimated) | 2,100,000 |
| 2027-01 (month estimated) | 3,400,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 25,26,27,28,29,30,31,32 | PO#: New | Proj No: WO# NIS27063349 | Pending Value: 22876636 | Delivery (contract): 46479 | Remarks: Po sent to Dubai

#### SO 103522 — MBCC

- Location: `saudi` · Status: `active` · Total value: 690,000 · Delivery date estimate: 2027-01-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | First response Vehicle | 1 | 690,000 | 690,000 |

| Invoicing month | Amount |
|---|---|
| 2027-01 (month estimated) | 690,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 33 | PO#: 4500845450 | Proj No: WO# NIS27070253 | Pending Value: 690000 | Delivery (contract): 46350 | Remarks: Po sent to Dubai

### Abdullah (`abdullah.s@ft.com`)

#### SO 102699 — King Faisal Specialist Hospital

- Location: `saudi` · Status: `completed` · Total value: 652,900 · Delivery date estimate: 2026-04-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | AMBULANCE TYPE I | 1 | 652,900 | 652,900 |

| Invoicing month | Amount |
|---|---|
| 2026-04 | 652,900 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 38 | PO#: 4906 | Proj No: 1791 | Pending Value: 0 | Delivery (contract): 45777

#### SO 102792 — Saudi Air forces

- Location: `saudi` · Status: `completed` · Total value: 3,540,000 · Delivery date estimate: 2026-01-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Fire truck - MAN 4x2 | 2 | 1,770,000 | 3,540,000 |

| Invoicing month | Amount |
|---|---|
| 2026-01 | 3,540,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 37 | PO#: 5185 | Proj No: 1814 | Pending Value: 0 | Delivery (contract): 46197

#### SO 102934 — Nupco - Riyadh - مدينة الملك عبدالعزيز

- Location: `saudi` · Status: `active` · Total value: 25,500 · Delivery date estimate: 2026-07-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Supply of Medical Items | 1 | 25,500 | 25,500 |

| Invoicing month | Amount |
|---|---|
| 2026-07 | 25,500 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 40 | PO#: Al Jeel Medical 
PO#5727 | Pending Value: 25500 | Remarks: Not received yet from Al jeel | source status was "Delayed" | Sector: Gov. | Penalty: APPLIED / Depending on NUPCO / Depending on NUPCO | Total incl. VAT (source): 25500 | Location detail: Purchase | Production remarks: Not received from supplier (From LC 2.5 M

#### SO 102958 — Nupco - Jizan - Jizan University

- Location: `saudi` · Status: `completed` · Total value: 163,750 · Delivery date estimate: 2026-03-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Supply of Medical Items | 1 | 163,750 | 163,750 |

| Invoicing month | Amount |
|---|---|
| 2026-03 | 163,750 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 41 | PO#: Al Jeel Medical 
PO#5835 | Pending Value: 0 | Delivery (contract): 45778 | Sector: Gov. | Penalty: APPLIED / Depending on NUPCO / Depending on NUPCO | Total incl. VAT (source): 163750 | Location detail: Purchase | Production remarks: Not received from supplier (From LC 2.5 M
LIFEPAK 1000 Defibrillator, Standard Accessories and Defib Pads for Adult/Paediatric/Infant	
7,500.00 ر.س.‏
	2 remaining material

#### SO 102975 — KFSH

- Location: `saudi` · Status: `completed` · Total value: 162,000 · Delivery date estimate: 2026-01-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Supply of Medical Items | 1 | 162,000 | 162,000 |

| Invoicing month | Amount |
|---|---|
| 2026-01 | 162,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 42 | PO#: 76835 CPO | Proj No: 1464 | Pending Value: 0

#### SO 102978 — Cluster2

- Location: `saudi` · Status: `completed` · Total value: 8,997,750 · Delivery date estimate: 2026-03-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | AMBULANCE TYPE II | 9 | 999,750 | 8,997,750 |

| Invoicing month | Amount |
|---|---|
| 2026-01 | 999,750 |
| 2026-03 | 7,998,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 39 | PO#: 5829 | Proj No: 1910 | Pending Value: 0 | Delivery (contract): 46007

#### SO 103074 — MOD

- Location: `saudi` · Status: `active` · Total value: 11,584,300 · Delivery date estimate: 2027-01-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | AMBULANCE TYPE II | 15 | 772,286.67 | 11,584,300.05 |

| Invoicing month | Amount |
|---|---|
| 2026-05 | 6,525,450 |
| 2027-01 (month estimated) | 5,058,850 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 34 | PO#: 6342  / WO # 25616597 | Proj No: 1847 / 1970 | Pending Value: 5058850 | Delivery (contract): 45981 | Remarks: 6 VEHICLES:
Materials shipped from Dubai, completion Date expected next week | source status was "Delayed" | Sector: Gov. | Penalty: CRITICAL / 0 / 1% deduction for each late week, up to a maximum of  6% | Total incl. VAT (source): 11584300 | Location detail: JED | Production remarks: 9 chassis Received.
 Partial Drawings received on 08/07/2025. remaining drawings required.
Awaiting  Kits from Dubai -

#### SO 103076 — Amal hospital - Tabouk

- Location: `saudi` · Status: `completed` · Total value: 38,425 · Delivery date estimate: 2026-01-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Medical Item | 1 | 38,425 | 38,425 |

| Invoicing month | Amount |
|---|---|
| 2026-01 | 38,425 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 36 | PO#: Dubai | Pending Value: 0 | Delivery (contract): 45813 | Sector: Gov. | Penalty: APPLIED / 2305.5 / 1% deduction for each late week, up to a maximum of  6% | Total incl. VAT (source): 38425 | Location detail: Dubai | Production remarks: PO to Dubai as instruction

#### SO 103088 — SRCA

- Location: `dubai` · Status: `active` · Total value: 6,000,000 · Delivery date estimate: 2026-07-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Electrical ambulance | 10 | 600,000 | 6,000,000 |

| Invoicing month | Amount |
|---|---|
| 2026-07 | 6,000,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 35 | PO#: 6162 | Proj No: 1952 | Pending Value: 6000000 | Delivery (contract): 46018 | Remarks: the units are expected to be received in KSA factory by the next week ,Tariq Said. | source status was "Delayed" | Sector: Gov. | Penalty: CRITICAL / 0 / 1% deduction for each late week, up to a maximum of  6% | Total incl. VAT (source): 6000000 | Location detail: Dubai | Production remarks: Units delivery is on Januray 2026 / factory postpone to jan 2026

#### SO 103479 — NADEC

- Location: `saudi` · Status: `active` · Total value: 1,500,000 · Delivery date estimate: 2027-01-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Water Tanker | 1 | 1,500,000 | 1,500,000 |

| Invoicing month | Amount |
|---|---|
| 2027-01 (month estimated) | 1,500,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 43 | Pending Value: 1500000 | Delivery (contract): 46428 | Remarks: Waiting for the Payment

### Abdulhamid (`abdulhamid@ft.com`)

#### SO 103111 — SRCA

- Location: `saudi` · Status: `active` · Total value: 963,500 · Delivery date estimate: 2026-07-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Medical Item | 1 | 963,500 | 963,500 |

| Invoicing month | Amount |
|---|---|
| 2026-07 | 963,500 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 45 | PO#: Al Jeel Medical 
PO#6315 | Pending Value: 963500 | Delivery (contract): 45852 | Remarks: Ready for Delivery, needs to be discussed

#### SO 103156 — Security Forces Hospital

- Location: `saudi` · Status: `active` · Total value: 375,750 · Delivery date estimate: 2026-07-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Medical Item | 4 | 93,937.5 | 375,750 |

| Invoicing month | Amount |
|---|---|
| 2026-07 | 375,750 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 44 | PO#: Al Jeel Medical
PO#6551 | Pending Value: 375750 | Delivery (contract): 45897 | Remarks: Ready for Delivery, needs to be discussed

#### SO 103421 — NUPCO - QASSIM ARMED FORCES HOSPITAL

- Location: `saudi` · Status: `active` · Total value: 92,800 · Delivery date estimate: 2026-07-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Medical Item 1 Unit | 1 | 92,800 | 92,800 |

| Invoicing month | Amount |
|---|---|
| 2026-07 | 92,800 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 46 | PO#: PO NUPCO 4600119387 | Pending Value: 92800 | Delivery (contract): 45798 | Remarks: Not received yet

#### SO 103445 — NUPCO - MOD Saud Force

- Location: `saudi` · Status: `active` · Total value: 600,500 · Delivery date estimate: 2027-01-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Medical Item 650 x 3 Units | 1 | 600,500 | 600,500 |

| Invoicing month | Amount |
|---|---|
| 2027-01 (month estimated) | 600,500 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 47 | PO#: Contract:  ATT96412 | Pending Value: 600500 | Delivery (contract): 46139 | Remarks: Not received yet

#### SO 103520 — KFSH

- Location: `saudi` · Status: `active` · Total value: 83,000 · Delivery date estimate: 2026-06-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Medical Item | 1 | 83,000 | 83,000 |

| Invoicing month | Amount |
|---|---|
| 2026-06 | 83,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 48 | PO#: 77175 | Pending Value: 0 | Delivery (contract): 46140 | Remarks: AFS to delivery it

### ESSAM (`essam@ft.com`)

#### SO 103519 — Ministry of Defense

- Location: `saudi` · Status: `active` · Total value: 1,500,000 · Delivery date estimate: 2026-11-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Fire Fighting Truck | 1 | 1,500,000 | 1,500,000 |

| Invoicing month | Amount |
|---|---|
| 2026-11 | 1,500,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 49 | PO#: 1955 | Proj No: WO# NIS27063313 | Pending Value: 1500000 | Delivery (contract): 46161 | Remarks: POs for some materials sent to Dubai

### Obada (`obada@ft.com`)

#### SO 102744 — KAMC

- Location: `dubai` · Status: `active` · Total value: 4,199,020 · Delivery date estimate: 2026-05-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Ambulance | 3 | 1,399,673.33 | 4,199,019.99 |

| Invoicing month | Amount |
|---|---|
| 2026-04 | 1,958,700 |
| 2026-05 | 2,240,320 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 53 | PO#: 5272 | Proj No: 1851 | Pending Value: 0 | Delivery (contract): 45735 | source status was "Delayed"

#### SO 102898 — KFSH

- Location: `saudi` · Status: `completed` · Total value: 83,000 · Delivery date estimate: 2026-01-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Medical Item | 1 | 83,000 | 83,000 |

| Invoicing month | Amount |
|---|---|
| 2026-01 | 83,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 52 | PO#: LOCAL | Pending Value: 0 | Delivery (contract): 45648 | Sector: Semi-Gov. | Penalty: APPLIED / Depending on NUPCO / Depending on NUPCO | Total incl. VAT (source): 83000 | Location detail: Purchase

#### SO 103056 — KFSH

- Location: `saudi` · Status: `completed` · Total value: 249,000 · Delivery date estimate: 2026-01-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Medical Item | 3 | 83,000 | 249,000 |

| Invoicing month | Amount |
|---|---|
| 2026-01 | 249,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 51 | PO#: Al Jeel Medical 
PO#5835 | Pending Value: 0 | Delivery (contract): 45711 | Sector: Semi-Gov. | Penalty: APPLIED / Depending on NUPCO / Depending on NUPCO | Total incl. VAT (source): 249000 | Location detail: Purchase

#### SO 103060 — JEDCO

- Location: `dubai` · Status: `active` · Total value: 1,087,000 · Delivery date estimate: 2026-04-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | AMBULANCE TYPE II | 2 | 543,500 | 1,087,000 |

| Invoicing month | Amount |
|---|---|
| 2026-04 | 1,087,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 50 | PO#: 6238 | Proj No: 1964 | Pending Value: 0 | Delivery (contract): 45960 | source status was "Delayed" | Sector: Semi-Gov. | Penalty: CRITICAL / 0 / 1% deduction for each late week, up to a maximum of 6%. | Total incl. VAT (source): 1087000 | Location detail: Dubai | Production remarks: under process. Units will be ready by Oct 2025

### Ahmed Qadomi (`ahmed.qadomi@ft.com`)

#### SO 103482 — King AbdelAziz Med.City

- Location: `dubai` · Status: `active` · Total value: 3,155,150 · Delivery date estimate: 2026-10-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | AMBULANCE VEHICLE 4X4 | 4 | 788,787.5 | 3,155,150 |

| Invoicing month | Amount |
|---|---|
| 2026-10 | 3,155,150 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 54 | PO#: NUPCO# 4600140435
PN#2157
PO#9426 | Proj No: PO#9426 | Pending Value: 3155150 | Delivery (contract): 46292 | Remarks: Waiting for Chassis Qut from Purchase.
Offline work on boxes is in progress

### Hatem (`hatem@ft.com`)

#### SO 102640 — Imam Abdulrahman Al Faisal Hospital - Dhahran

- Location: `dubai` · Status: `active` · Total value: 1,295,000 · Delivery date estimate: 2026-06-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | Fire truck | 1 | 1,295,000 | 1,295,000 |

| Invoicing month | Amount |
|---|---|
| 2026-06 | 1,295,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 58 | PO#: 5786 | Proj No: 1905 | Pending Value: 0 | Delivery (contract): 45930 | Remarks: SASO | source status was "Delayed"

#### SO 103123 — Almoosa Health

- Location: `saudi` · Status: `completed` · Total value: 904,000 · Delivery date estimate: 2026-02-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | AMBULANCE TYPE II | 2 | 452,000 | 904,000 |

| Invoicing month | Amount |
|---|---|
| 2026-02 | 904,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 55 | PO#: 6318 | Proj No: 1969-2044 | Pending Value: 0 | Delivery (contract): 45943 | Remarks: Done

#### SO 103126 — Almoosa Health

- Location: `saudi` · Status: `completed` · Total value: 452,000 · Delivery date estimate: 2026-03-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | AMBULANCE TYPE II | 1 | 452,000 | 452,000 |

| Invoicing month | Amount |
|---|---|
| 2026-03 | 452,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 56 | PO#: 6318 | Proj No: 1969-2044 | Pending Value: 0 | Delivery (contract): 45946 | Remarks: Done

#### SO 103127 — Almoosa Health

- Location: `saudi` · Status: `completed` · Total value: 452,000 · Delivery date estimate: 2026-03-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | AMBULANCE TYPE II | 1 | 452,000 | 452,000 |

| Invoicing month | Amount |
|---|---|
| 2026-03 | 452,000 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 57 | PO#: 6318 | Proj No: 1969-2044 | Pending Value: 0 | Delivery (contract): 45946 | Remarks: Done

### Suliman (`suliman@ft.com`)

#### SO 103469 — DACO

- Location: `dubai` · Status: `active` · Total value: 7,900,000 · Delivery date estimate: 2026-09-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | AMBULANCE TYPE II | 5 | 908,200 | 4,541,000 |
| 2 | Ambulance Vehicle - heavy duty Box Type | 1 | 873,400 | 873,400 |
| 3 | Command/Rapid Response Vehicle | 3 | 503,700 | 1,511,100 |
| 4 | Pickup vehicle | 2 | 391,650 | 783,300 |
| 5 | Services Charge | 1 | 191,200 | 191,200 |

| Invoicing month | Amount |
|---|---|
| 2026-09 | 4,541,000 |
| 2026-09 | 873,400 |
| 2026-09 | 1,511,100 |
| 2026-09 | 783,300 |
| 2026-09 | 191,200 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 59,60,61,62,63 | PO#: 9108 | Proj No: 2138 / 2139 | Pending Value: 7900000 | Delivery (contract): 45915 | Remarks: Waiting NEG POs for medicals.
AL Jazerra to hold the 2 pickup chassis as per tariq request.
Production going well so far, as per tariq

### Nadeem (`nadeem@ft.com`)

#### SO 103534 — SE Company

- Location: `saudi` · Status: `active` · Total value: 14,940,675 · Delivery date estimate: 2027-01-01 (estimated)

| Line | Vehicle type (JOH) | Qty | Unit value | Line total |
|---|---|---|---|---|
| 1 | INCIDENT COMMAND TRUCK (37116) | 15 | 996,045 | 14,940,675 |

| Invoicing month | Amount |
|---|---|
| 2027-01 (month estimated) | 14,940,675 |

- Unmapped fields → notes: Source: Invoicing plan 2026 row(s) 64 | PO#: PO#4500664526
PR#4448 to make Full PO | Pending Value: 14940675 | Delivery (contract): 46622

## Not imported (informational only)

- Rows with no SO number (see Decisions needed above) — cannot create a `projects` row without one.
- SO-number cells containing multiple values — needs a human decision on which SO (or whether to split).
- "Under production Orders" rows owned by someone outside the 10 approved users — not enriched, not imported.
- Sector, Customer PO#, Proj. No, Pending Value, delay/penalty %, VAT, delivered counts, JED remarks,
  free-text delivery — no column exists for these on `projects`/`project_vehicle_lines` today. They are
  preserved verbatim in the `notes` field above and documented as future schema candidates in
  `docs/implementation/sales-plan-2026-import.md`.
