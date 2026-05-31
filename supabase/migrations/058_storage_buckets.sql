-- Phase: Real Supabase Readiness — Storage buckets + object RLS
--
-- Creates the private storage buckets that back the document-metadata tables
-- (project_documents, quotation_documents, qc_inspection_documents, etc.) and
-- applies role-aware RLS on storage.objects.
--
-- NOTE: storage.* objects are owned by the Supabase platform. If your migration
-- runner lacks ownership of the storage schema, run this file via the Supabase
-- SQL Editor (which executes as the postgres role) instead of the CLI.
--
-- All buckets are PRIVATE. Downloads must use createSignedUrl(); there are no
-- public object URLs. Role checks use the canonical public.current_user_role()
-- helper (defined in 003_rls_profiles.sql), consistent with table RLS.

-- ── Buckets ──────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('project-documents',  'project-documents',  false),
  ('quotation-documents','quotation-documents', false),
  ('raw-material-files',  'raw-material-files',  false),
  ('vehicle-photos',      'vehicle-photos',      false),
  ('qc-documents',        'qc-documents',        false),
  ('afs-attachments',     'afs-attachments',     false)
on conflict (id) do nothing;

-- ── Helper predicate ──────────────────────────────────────────────────────────
-- Read: any authenticated user may read objects in these private buckets
-- (object-level cost sensitivity is governed by the metadata tables; files are
-- served only via short-lived signed URLs). Write/delete: admin/ops plus the
-- module-owning role.

-- project-documents: write = admin/ops/sales_user
drop policy if exists "obj_project_docs_read"  on storage.objects;
drop policy if exists "obj_project_docs_write" on storage.objects;
create policy "obj_project_docs_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-documents');
create policy "obj_project_docs_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'project-documents'
    and public.current_user_role() in ('admin','operations_manager','sales_user'))
  with check (bucket_id = 'project-documents'
    and public.current_user_role() in ('admin','operations_manager','sales_user'));

-- quotation-documents: write = admin/ops/sales_user/sales_coordinator
drop policy if exists "obj_quote_docs_read"  on storage.objects;
drop policy if exists "obj_quote_docs_write" on storage.objects;
create policy "obj_quote_docs_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'quotation-documents');
create policy "obj_quote_docs_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'quotation-documents'
    and public.current_user_role() in ('admin','operations_manager','sales_user','sales_coordinator'))
  with check (bucket_id = 'quotation-documents'
    and public.current_user_role() in ('admin','operations_manager','sales_user','sales_coordinator'));

-- raw-material-files: write = admin/ops/factory_user
drop policy if exists "obj_rm_files_read"  on storage.objects;
drop policy if exists "obj_rm_files_write" on storage.objects;
create policy "obj_rm_files_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'raw-material-files');
create policy "obj_rm_files_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'raw-material-files'
    and public.current_user_role() in ('admin','operations_manager','factory_user'))
  with check (bucket_id = 'raw-material-files'
    and public.current_user_role() in ('admin','operations_manager','factory_user'));

-- vehicle-photos: write = admin/ops/store_user
drop policy if exists "obj_vehicle_photos_read"  on storage.objects;
drop policy if exists "obj_vehicle_photos_write" on storage.objects;
create policy "obj_vehicle_photos_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'vehicle-photos');
create policy "obj_vehicle_photos_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'vehicle-photos'
    and public.current_user_role() in ('admin','operations_manager','store_user'))
  with check (bucket_id = 'vehicle-photos'
    and public.current_user_role() in ('admin','operations_manager','store_user'));

-- qc-documents (also serves NCR evidence + release notes): write = admin/ops/qc_user
drop policy if exists "obj_qc_docs_read"  on storage.objects;
drop policy if exists "obj_qc_docs_write" on storage.objects;
create policy "obj_qc_docs_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'qc-documents');
create policy "obj_qc_docs_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'qc-documents'
    and public.current_user_role() in ('admin','operations_manager','qc_user'))
  with check (bucket_id = 'qc-documents'
    and public.current_user_role() in ('admin','operations_manager','qc_user'));

-- afs-attachments: write = admin/ops/afs_user
drop policy if exists "obj_afs_attach_read"  on storage.objects;
drop policy if exists "obj_afs_attach_write" on storage.objects;
create policy "obj_afs_attach_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'afs-attachments');
create policy "obj_afs_attach_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'afs-attachments'
    and public.current_user_role() in ('admin','operations_manager','afs_user'))
  with check (bucket_id = 'afs-attachments'
    and public.current_user_role() in ('admin','operations_manager','afs_user'));
