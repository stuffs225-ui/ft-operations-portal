-- ── 112_vehicle_types_catalog.sql ─────────────────────────────────────────────
-- Adds a `category` column to vehicle_types and seeds the real NAFFCO vehicle
-- catalog (ambulances/medical, firefighting/rescue, command/special-purpose).
-- Idempotent: re-running refreshes name/description/category by code and never
-- duplicates (code is unique). Existing placeholder rows are left untouched —
-- deactivate them in Settings › Vehicle Types if no longer needed.
-- Apply supervised in the SQL Editor.
-- ──────────────────────────────────────────────────────────────────────────────

alter table public.vehicle_types add column if not exists category text;

insert into public.vehicle_types (name, code, description, category, is_active) values
  -- Ambulances & Medical Vehicles
  ('American Type I Ambulance',        'AMB-I',   'Box-body ambulance on pickup or truck chassis for advanced life support and rescue operations.', 'Ambulance & Medical', true),
  ('American Type II Ambulance',       'AMB-II',  'Van-based ambulance with a reinforced raised roof for patient transfer and BLS or ALS operations.', 'Ambulance & Medical', true),
  ('European Type A Ambulance',        'AMB-A',   'Patient transport ambulance configured for one or two patients with limited treatment space.', 'Ambulance & Medical', true),
  ('European Type B Ambulance',        'AMB-B',   'Emergency ambulance designed for basic treatment and independent emergency response.', 'Ambulance & Medical', true),
  ('European Type C Ambulance',        'AMB-C',   'Mobile intensive care ambulance for critical-care transport and advanced medical equipment.', 'Ambulance & Medical', true),
  ('4x4 Ambulance',                    'AMB-4X4', 'Off-road ambulance designed for difficult terrain, remote locations and rapid emergency response.', 'Ambulance & Medical', true),
  ('Minibus / Van Ambulance',          'AMB-VAN', 'Van or minibus ambulance for patient transfer and BLS or ALS applications.', 'Ambulance & Medical', true),
  ('Mass Casualty Ambulance',          'AMB-MC',  'Multi-patient ambulance designed for mass-casualty response and patient transportation.', 'Ambulance & Medical', true),
  ('ALS Response Vehicle',             'ALS-RV',  'Rapid-response vehicle carrying advanced life-support equipment for on-scene intervention.', 'Ambulance & Medical', true),
  ('Mass Casualty Unit',               'MCU',     'Large mobile unit supporting mass-casualty operations for 75, 95 or 150 persons.', 'Ambulance & Medical', true),
  ('Emergency Support Unit',           'ESU',     'Mobile disaster-management vehicle carrying medical supplies and emergency support equipment.', 'Ambulance & Medical', true),
  -- Firefighting, Rescue & Hazmat Vehicles
  ('ARFF - Falcon Series',             'ARFF-F',  'Custom-chassis aircraft rescue and firefighting vehicle for rapid airport emergency response.', 'Firefighting & Rescue', true),
  ('ARFF - Commercial Chassis',        'ARFF-C',  'Airport rescue and firefighting vehicle built on a commercial truck chassis.', 'Firefighting & Rescue', true),
  ('Municipal Firefighting Vehicle',   'MUN-FT',  'City firefighting vehicle available in light, medium and heavy-duty configurations.', 'Firefighting & Rescue', true),
  ('Industrial Firefighting Vehicle',  'IND-FT',  'Industrial fire truck for high-capacity water, foam, dry powder and special-hazard protection.', 'Firefighting & Rescue', true),
  ('Rescue & Rapid Intervention Vehicle', 'RIV',  'Fast intervention vehicle carrying firefighting, extrication, rescue and medical equipment.', 'Firefighting & Rescue', true),
  ('Hydraulic Access Platform',        'HAP',     'Aerial firefighting platform providing elevated access for rescue and firefighting operations.', 'Firefighting & Rescue', true),
  ('Turntable Ladder Vehicle',         'TTL',     'Extendable ladder vehicle for high-rise rescue and elevated firefighting operations.', 'Firefighting & Rescue', true),
  ('Hazmat Response Vehicle',          'HAZ',     'Hazardous-material response vehicle with specialized storage and mitigation equipment.', 'Firefighting & Rescue', true),
  -- Command, Defence & Special-Purpose Vehicles
  ('Command & Control Vehicle',        'CCV',     'Mobile command center equipped with communications, CCTV, workstations and meeting facilities.', 'Command & Special-Purpose', true),
  ('Command / Rescue Vehicle',         'CRV',     'Combined command and rescue vehicle with communications, monitoring and rescue equipment.', 'Command & Special-Purpose', true),
  ('Incident Command Support Vehicle', 'ICSV',    'Field coordination vehicle supporting incident command during emergency operations.', 'Command & Special-Purpose', true),
  ('Canine Carrier Vehicle',           'K9V',     'Specialized vehicle for safe transport and operational support of canine teams.', 'Command & Special-Purpose', true),
  ('Custom Special-Purpose Vehicle',   'SPV',     'Custom-built vehicle for requirements not covered by the standard vehicle categories.', 'Command & Special-Purpose', true)
on conflict (code) do update set
  name        = excluded.name,
  description = excluded.description,
  category    = excluded.category,
  is_active   = true,
  updated_at  = now();
