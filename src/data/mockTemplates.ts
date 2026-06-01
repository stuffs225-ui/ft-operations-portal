import type { DocumentTemplate, TemplateField, GeneratedDocument } from '../types';

const now = new Date().toISOString();
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

export const MOCK_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-001',
    template_code: 'TPL-2025-0001',
    template_name: 'Vehicle Ownership Transfer Letter',
    template_type: 'letter',
    department: 'Procurement',
    description: 'Standard letter to request ownership transfer of a delivered vehicle.',
    file_name: null,
    storage_path: null,
    template_body:
      'Dear {{recipient_name}},\n\n' +
      'Please process the ownership transfer for vehicle chassis number ' +
      '{{chassis_number}} under project {{project_code}} for {{customer_name}}, ' +
      'commercial registration number {{commercial_registration_number}}.\n\n' +
      'Date: {{date}}\n\nRegards,\n{{signatory_name}}',
    template_format: 'plain_text',
    approval_status: 'approved',
    submitted_by: 'usr-proc-01',
    submitted_at: daysAgo(20),
    approved_by: 'usr-admin-01',
    approved_at: daysAgo(18),
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    version: 'v1',
    is_active: true,
    visibility_scope: 'all_departments',
    created_at: daysAgo(20),
    updated_at: daysAgo(18),
    submitted_by_profile: { full_name: 'Khalid (Procurement)' },
  },
  {
    id: 'tpl-002',
    template_code: 'TPL-2025-0002',
    template_name: 'Pre-Delivery Inspection Checklist',
    template_type: 'checklist',
    department: 'AFS',
    description: 'Checklist completed before a vehicle is marked ready for delivery.',
    file_name: null,
    storage_path: null,
    template_body:
      'Pre-Delivery Inspection — {{project_code}}\n\n' +
      'Chassis: {{chassis_number}}\nInspector: {{inspector_name}}\nDate: {{date}}\n\n' +
      '[ ] Exterior condition verified\n[ ] All missing items resolved\n' +
      '[ ] Release note issued\n[ ] Photos attached',
    template_format: 'plain_text',
    approval_status: 'approved',
    submitted_by: 'usr-afs-01',
    submitted_at: daysAgo(15),
    approved_by: 'usr-admin-01',
    approved_at: daysAgo(14),
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    version: 'v1',
    is_active: true,
    visibility_scope: 'department',
    created_at: daysAgo(15),
    updated_at: daysAgo(14),
    submitted_by_profile: { full_name: 'Sara (AFS)' },
  },
  {
    id: 'tpl-003',
    template_code: 'TPL-2025-0003',
    template_name: 'Supplier Warning Letter',
    template_type: 'letter',
    department: 'Procurement',
    description: 'Formal warning to a supplier after repeated delays.',
    file_name: null,
    storage_path: null,
    template_body:
      'To: {{supplier_name}}\n\nThis letter concerns repeated delivery delays on ' +
      'PO {{po_number}}. Please provide a recovery plan by {{deadline_date}}.\n\n' +
      '{{signatory_name}}',
    template_format: 'plain_text',
    approval_status: 'submitted_for_approval',
    submitted_by: 'usr-proc-01',
    submitted_at: daysAgo(2),
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    version: 'v1',
    is_active: true,
    visibility_scope: 'department',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
    submitted_by_profile: { full_name: 'Khalid (Procurement)' },
  },
  {
    id: 'tpl-004',
    template_code: 'TPL-2025-0004',
    template_name: 'Internal Material Request Form',
    template_type: 'form',
    department: 'Factory',
    description: 'Draft form for requesting materials from store.',
    file_name: null,
    storage_path: null,
    template_body:
      'Material Request — {{project_code}}\nRequested by: {{requester_name}}\n' +
      'Item: {{item_name}} x {{quantity}}\nNeeded by: {{needed_by}}',
    template_format: 'plain_text',
    approval_status: 'draft',
    submitted_by: 'usr-fac-01',
    submitted_at: null,
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    version: 'v1',
    is_active: true,
    visibility_scope: 'department',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    submitted_by_profile: { full_name: 'Omar (Factory)' },
  },
];

export const MOCK_TEMPLATE_FIELDS: TemplateField[] = [
  // tpl-001 — ownership transfer letter
  fld('tpl-001', 'recipient_name', 'Recipient Name', 'text', true, 1),
  fld('tpl-001', 'chassis_number', 'Vehicle Chassis Number', 'text', true, 2),
  fld('tpl-001', 'project_code', 'Project / SO', 'project_selector', true, 3),
  fld('tpl-001', 'customer_name', 'Customer / Entity Name', 'customer_selector', true, 4),
  fld('tpl-001', 'commercial_registration_number', 'Commercial Registration No.', 'text', true, 5),
  fld('tpl-001', 'date', 'Date', 'date', true, 6),
  fld('tpl-001', 'signatory_name', 'Signatory', 'text', false, 7),
  // tpl-002 — pre-delivery checklist
  fld('tpl-002', 'project_code', 'Project / SO', 'project_selector', true, 1),
  fld('tpl-002', 'chassis_number', 'Chassis Number', 'text', true, 2),
  fld('tpl-002', 'inspector_name', 'Inspector', 'employee_selector', true, 3),
  fld('tpl-002', 'date', 'Date', 'date', true, 4),
  // tpl-003 — supplier warning
  fld('tpl-003', 'supplier_name', 'Supplier Name', 'text', true, 1),
  fld('tpl-003', 'po_number', 'PO Number', 'text', true, 2),
  fld('tpl-003', 'deadline_date', 'Recovery Deadline', 'date', true, 3),
  fld('tpl-003', 'signatory_name', 'Signatory', 'text', false, 4),
];

export const MOCK_GENERATED_DOCUMENTS: GeneratedDocument[] = [
  {
    id: 'gdoc-001',
    template_id: 'tpl-001',
    generated_document_number: 'GEN-2025-0001',
    project_id: null,
    related_module: 'procurement',
    generated_by: 'usr-proc-01',
    generated_at: daysAgo(5),
    output_title: 'Ownership Transfer — FT-2025-0003',
    filled_values_json: {
      recipient_name: 'Traffic Department',
      chassis_number: 'JTEBU5JR0K1234567',
      project_code: 'FT-2025-0003',
      customer_name: 'Saudi Red Crescent',
      commercial_registration_number: '1010101010',
      date: '2025-05-20',
      signatory_name: 'Khalid Al-Otaibi',
    },
    rendered_content:
      'Dear Traffic Department,\n\nPlease process the ownership transfer for vehicle chassis number JTEBU5JR0K1234567 under project FT-2025-0003 for Saudi Red Crescent, commercial registration number 1010101010.\n\nDate: 2025-05-20\n\nRegards,\nKhalid Al-Otaibi',
    exported_file_path: null,
    status: 'generated',
    remarks: null,
    created_at: daysAgo(5),
    updated_at: daysAgo(5),
    template: { template_name: 'Vehicle Ownership Transfer Letter', template_code: 'TPL-2025-0001', template_type: 'letter' },
  },
];

function fld(
  templateId: string,
  key: string,
  label: string,
  type: TemplateField['field_type'],
  required: boolean,
  order: number,
): TemplateField {
  return {
    id: `${templateId}-${key}`,
    template_id: templateId,
    field_key: key,
    field_label: label,
    field_type: type,
    is_required: required,
    default_value: type === 'date' ? new Date().toISOString().split('T')[0] : null,
    help_text: null,
    display_order: order,
    options_json: null,
    created_at: now,
    updated_at: now,
  };
}

export function getMockTemplate(id: string): DocumentTemplate | undefined {
  return MOCK_TEMPLATES.find((t) => t.id === id);
}

export function getMockTemplateFields(templateId: string): TemplateField[] {
  return MOCK_TEMPLATE_FIELDS.filter((f) => f.template_id === templateId).sort(
    (a, b) => a.display_order - b.display_order,
  );
}

export function getMockGeneratedDocument(id: string): GeneratedDocument | undefined {
  return MOCK_GENERATED_DOCUMENTS.find((g) => g.id === id);
}
