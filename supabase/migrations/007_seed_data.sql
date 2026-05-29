-- Seed data for all master data tables.
-- All inserts use ON CONFLICT DO NOTHING for idempotency — safe to re-run.

-- ── vehicle_types ──────────────────────────────────────────────────────────
insert into public.vehicle_types (id, name, code, description) values
  ('a1000001-0000-0000-0000-000000000001', 'Fire Truck',       'FT',  'Standard fire suppression vehicle'),
  ('a1000001-0000-0000-0000-000000000002', 'Ambulance',        'AMB', 'Emergency medical response vehicle'),
  ('a1000001-0000-0000-0000-000000000003', 'SUV (4x4)',        'SUV', 'Light utility vehicle, off-road capable'),
  ('a1000001-0000-0000-0000-000000000004', 'Pick-up Truck',    'PUT', 'General utility pickup'),
  ('a1000001-0000-0000-0000-000000000005', 'Command Vehicle',  'CMD', 'Incident command and coordination'),
  ('a1000001-0000-0000-0000-000000000006', 'Water Tanker',     'WTK', 'High-capacity water supply vehicle'),
  ('a1000001-0000-0000-0000-000000000007', 'Rescue Vehicle',   'RSC', 'Heavy rescue and extrication')
on conflict (id) do nothing;

-- ── material_categories ────────────────────────────────────────────────────
insert into public.material_categories (id, name, requires_serial, description) values
  ('a2000001-0000-0000-0000-000000000001', 'Medical Equipment', true,  'AED, stretchers, medical kits'),
  ('a2000001-0000-0000-0000-000000000002', 'Electrical',        false, 'Wiring, panels, lighting systems'),
  ('a2000001-0000-0000-0000-000000000003', 'Mechanical',        false, 'Pumps, valves, mechanical parts'),
  ('a2000001-0000-0000-0000-000000000004', 'Hydraulic',         false, 'Cylinders, hoses, hydraulic systems'),
  ('a2000001-0000-0000-0000-000000000005', 'Body Parts',        false, 'Panels, doors, structural components'),
  ('a2000001-0000-0000-0000-000000000006', 'Safety Equipment',  true,  'SCBA, harnesses, PPE'),
  ('a2000001-0000-0000-0000-000000000007', 'Communication',     true,  'Radios, MDT units, antennas')
on conflict (id) do nothing;

-- ── supplier_categories ────────────────────────────────────────────────────
insert into public.supplier_categories (id, name, description) values
  ('a3000001-0000-0000-0000-000000000001', 'Local Supplier',        'Saudi Arabia-based suppliers'),
  ('a3000001-0000-0000-0000-000000000002', 'International Supplier','Import from outside KSA'),
  ('a3000001-0000-0000-0000-000000000003', 'Approved Vendor',       'Pre-approved, reduced-review suppliers'),
  ('a3000001-0000-0000-0000-000000000004', 'Emergency Vendor',      'One-off emergency procurement only')
on conflict (id) do nothing;

-- ── document_types ─────────────────────────────────────────────────────────
insert into public.document_types (id, name, required_at, description) values
  ('a4000001-0000-0000-0000-000000000001', 'Quotation PDF',          'Sales',         'Customer-facing price quotation'),
  ('a4000001-0000-0000-0000-000000000002', 'Customer PO / Contract', 'Sales',         'Signed purchase order or contract'),
  ('a4000001-0000-0000-0000-000000000003', 'PO to Supplier',         'Procurement',   'Supplier purchase order (>10,000 SAR requires Admin or Ops Manager approval)'),
  ('a4000001-0000-0000-0000-000000000004', 'Raw Material Excel',     'Procurement',   'Bill of materials spreadsheet'),
  ('a4000001-0000-0000-0000-000000000005', 'Vehicle Photos',         'QC / Delivery', 'Chassis number + completion photos (mandatory)'),
  ('a4000001-0000-0000-0000-000000000006', 'Release Note',           'Delivery',      'Blocked until Project QC inspection is closed'),
  ('a4000001-0000-0000-0000-000000000007', 'BOQ',                    'Projects',      'Bill of quantities'),
  ('a4000001-0000-0000-0000-000000000008', 'BOM',                    'Factory',       'Bill of materials for production'),
  ('a4000001-0000-0000-0000-000000000009', 'GA Drawing',             'Factory',       'General arrangement drawing'),
  ('a4000001-0000-0000-0000-000000000010', 'Detail Drawing',         'Factory',       'Component detail drawing')
on conflict (id) do nothing;

-- ── sla_rules ──────────────────────────────────────────────────────────────
insert into public.sla_rules (id, trigger_event, required_action, sla_hours, escalate_to) values
  ('a5000001-0000-0000-0000-000000000001', 'Quotation submitted',      'Operations Manager review',      48, 'Admin'),
  ('a5000001-0000-0000-0000-000000000002', 'Customer PO received',     'SO creation',                   24, 'Operations Manager'),
  ('a5000001-0000-0000-0000-000000000003', 'SO created',               'WO issuance (Saudi)',            72, 'Operations Manager'),
  ('a5000001-0000-0000-0000-000000000004', 'SO created',               'PN issuance (Dubai)',            48, 'Operations Manager'),
  ('a5000001-0000-0000-0000-000000000005', 'PO to Supplier raised',    'Admin approval (>10,000 SAR)',   24, 'Admin'),
  ('a5000001-0000-0000-0000-000000000006', 'Material arrived',         'Material QC inspection',        24, 'Operations Manager'),
  ('a5000001-0000-0000-0000-000000000007', 'Production complete',      'Project QC inspection',         48, 'QC Manager'),
  ('a5000001-0000-0000-0000-000000000008', 'QC passed',                'Release Note generation',       24, 'Operations Manager')
on conflict (id) do nothing;

-- ── root_cause_categories ──────────────────────────────────────────────────
insert into public.root_cause_categories (id, name, description) values
  ('a6000001-0000-0000-0000-000000000001', 'Design Error',       'Engineering or design specification issue'),
  ('a6000001-0000-0000-0000-000000000002', 'Supplier Defect',    'Material or component quality failure from supplier'),
  ('a6000001-0000-0000-0000-000000000003', 'Installation Error', 'Incorrect fitting or assembly in factory'),
  ('a6000001-0000-0000-0000-000000000004', 'Transport Damage',   'Damage incurred during shipping or delivery'),
  ('a6000001-0000-0000-0000-000000000005', 'Operator Error',     'User or operator misuse or incorrect operation'),
  ('a6000001-0000-0000-0000-000000000006', 'Wear & Tear',        'Normal degradation over service life'),
  ('a6000001-0000-0000-0000-000000000007', 'Environmental',      'Extreme climate, dust, humidity, or corrosion')
on conflict (id) do nothing;

-- ── store_locations ────────────────────────────────────────────────────────
insert into public.store_locations (id, name, code, capacity, description) values
  ('a7000001-0000-0000-0000-000000000001', 'Main Warehouse',    'WH-MAIN', 'High',   'Primary storage for all incoming materials'),
  ('a7000001-0000-0000-0000-000000000002', 'AFS Bay',           'WH-AFS',  'Medium', 'After-sales and Dubai AFS components'),
  ('a7000001-0000-0000-0000-000000000003', 'Production Floor',  'WH-PROD', 'Low',    'In-progress materials on active work orders'),
  ('a7000001-0000-0000-0000-000000000004', 'Quarantine Area',   'WH-QRN',  'Low',    'Rejected or under-review materials — access restricted')
on conflict (id) do nothing;

-- ── wo_statuses ────────────────────────────────────────────────────────────
insert into public.wo_statuses (id, name, color, description, sort_order) values
  ('a8000001-0000-0000-0000-000000000001', 'Draft',         'bg-gray-100 text-gray-600',    'WO created, not yet submitted for approval', 1),
  ('a8000001-0000-0000-0000-000000000002', 'Submitted',     'bg-blue-100 text-blue-700',    'Awaiting Operations Manager review',          2),
  ('a8000001-0000-0000-0000-000000000003', 'Approved',      'bg-brand-100 text-brand-700',  'Approved and ready for factory execution',    3),
  ('a8000001-0000-0000-0000-000000000004', 'In Production', 'bg-amber-100 text-amber-700',  'Factory is actively building',                4),
  ('a8000001-0000-0000-0000-000000000005', 'Completed',     'bg-green-100 text-green-700',  'All production tasks finished',               5),
  ('a8000001-0000-0000-0000-000000000006', 'Cancelled',     'bg-red-100 text-red-700',      'WO voided, no further action',                6)
on conflict (id) do nothing;

-- ── pn_statuses ────────────────────────────────────────────────────────────
insert into public.pn_statuses (id, name, color, description, sort_order) values
  ('a9000001-0000-0000-0000-000000000001', 'Draft',                  'bg-gray-100 text-gray-600',     'PN created, pending submission',         1),
  ('a9000001-0000-0000-0000-000000000002', 'Submitted',              'bg-blue-100 text-blue-700',     'Awaiting Operations Manager review',      2),
  ('a9000001-0000-0000-0000-000000000003', 'Approved',               'bg-brand-100 text-brand-700',   'Approved for Dubai follow-up',            3),
  ('a9000001-0000-0000-0000-000000000004', 'Dubai Follow-up Active', 'bg-purple-100 text-purple-700', 'AFS team tracking in Dubai',              4),
  ('a9000001-0000-0000-0000-000000000005', 'Vehicle Arrived',        'bg-amber-100 text-amber-700',   'Vehicle landed, QC/handover pending',     5),
  ('a9000001-0000-0000-0000-000000000006', 'Completed',              'bg-green-100 text-green-700',   'All steps done, project closed',          6)
on conflict (id) do nothing;
