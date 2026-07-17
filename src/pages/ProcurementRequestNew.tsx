import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Check, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isMissingColumnError } from '../lib/deferredMigrationSafety';
import { nextDocNumber } from '../lib/docNumbers';
import type { PRType } from '../types';

interface ProjectOption {
  id: string;
  project_code: string;
  so_number: string;
  customer_name: string;
}

interface DraftLine {
  item_code: string;
  quantity: number;
  description: string;
}

const SOURCE_DEPT_OPTIONS = [
  'Factory',
  'Store',
  'AFS / Dubai',
  'Engineering',
  'Management',
  'Manual / Other',
];

// Month prefix for PR numbers, e.g. "PR-2607-".
function prPrefix(): string {
  const now = new Date();
  return `PR-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}-`;
}

export function ProcurementRequestNew() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [prType, setPrType] = useState<PRType>('local');
  const [negPoNumber, setNegPoNumber] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sourceDepartment, setSourceDepartment] = useState('');
  const [remarks, setRemarks] = useState('');

  // PR lines — Procurement enters only code + quantity + description.
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [newLine, setNewLine] = useState<DraftLine>({ item_code: '', quantity: 1, description: '' });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // Prefill the next sequential PR number for this month (MAX+1, not random —
    // the old Math.random() 3-digit numbers collided within ~35 PRs/month).
    // The field stays editable for externally-issued PR numbers.
    let cancelled = false;
    nextDocNumber({ table: 'procurement_requests', column: 'pr_number', prefix: prPrefix() })
      .then((n) => { if (!cancelled) setPrNumber((prev) => prev || n); });

    if (!isSupabaseConfigured || !supabase) return () => { cancelled = true; };
    supabase
      .from('projects')
      .select('id, project_code, so_number, customer_name')
      .in('project_status', ['active', 'approved'])
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setProjects((data as ProjectOption[]) ?? []);
      });
    return () => { cancelled = true; };
  }, []);

  function addLine() {
    if (!newLine.description.trim() || newLine.quantity <= 0) return;
    setLines((prev) => [...prev, { ...newLine, item_code: newLine.item_code.trim(), description: newLine.description.trim() }]);
    setNewLine({ item_code: '', quantity: 1, description: '' });
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prNumber.trim()) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    if (!isSupabaseConfigured || !supabase) {
      setSaving(false);
      navigate('/procurement/requests');
      return;
    }

    if (!projectId) {
      setError('Please select a linked project before registering the PR.');
      setSaving(false);
      return;
    }
    if (prType === 'neg' && !negPoNumber.trim()) {
      setError('A NEG PR always comes with its NEG PO — enter the NEG PO number.');
      setSaving(false);
      return;
    }

    const basePayload = {
      pr_number: prNumber.trim(),
      project_id: projectId,
      received_date: receivedDate || null,
      source_department: sourceDepartment || null,
      status: 'pr_received',
      remarks: remarks.trim() || null,
      created_by: profile?.id ?? null,
    };

    // Try with the migration-115 columns first; fall back without them if the
    // migration has not been applied to the live database yet.
    let insertRes = await supabase
      .from('procurement_requests')
      .insert({ ...basePayload, pr_type: prType, neg_po_number: prType === 'neg' ? negPoNumber.trim() : null })
      .select('id')
      .single();

    if (insertRes.error && isMissingColumnError(insertRes.error)) {
      setNotice('Migration 115 pending — PR saved without the PR type / NEG PO fields.');
      insertRes = await supabase
        .from('procurement_requests')
        .insert(basePayload)
        .select('id')
        .single();
    }

    // Unique violation on pr_number → another PR grabbed this number in the
    // meantime. Refresh the suggestion instead of surfacing a raw constraint
    // error (mirrors the server-side doc-number retry from migration 114).
    if (insertRes.error && insertRes.error.code === '23505') {
      const fresh = await nextDocNumber({ table: 'procurement_requests', column: 'pr_number', prefix: prPrefix() });
      setPrNumber(fresh);
      setError(`PR number was already taken — updated the suggestion to ${fresh}. Submit again.`);
      setSaving(false);
      return;
    }

    if (insertRes.error) {
      setError(insertRes.error.message);
      setSaving(false);
      return;
    }

    const prId = (insertRes.data as { id: string }).id;

    if (lines.length > 0) {
      const { error: linesError } = await supabase
        .from('procurement_request_items')
        .insert(
          lines.map((l) => ({
            procurement_request_id: prId,
            project_id: projectId,
            item_code: l.item_code || null,
            item_name: l.description,
            description: l.description,
            quantity_required: l.quantity,
            status: 'pending',
          })),
        );
      if (linesError) {
        setError(`PR registered, but adding lines failed: ${linesError.message}. Add them from the PR detail page.`);
        setSaving(false);
        navigate(`/procurement/requests/${prId}`);
        return;
      }
    }

    navigate(`/procurement/requests/${prId}`);
  }

  return (
    <div>
      <PageHeader
        title="Register Purchase Request"
        subtitle="Record an incoming PR from production, engineering, or other departments."
        icon={<FileText size={18} />}
        breadcrumb={[
          { label: 'Procurement', href: '/procurement' },
          { label: 'Purchase Requests', href: '/procurement/requests' },
          { label: 'Register PR' },
        ]}
        actions={
          <Link to="/procurement/requests">
            <Button variant="ghost" icon={<ArrowLeft size={15} />}>Back</Button>
          </Link>
        }
        className="mb-6"
      />

      {!isSupabaseConfigured && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-xs text-amber-800">
          Dev mode — form submission navigates back without persisting data
        </div>
      )}

      <Card className="p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* PR type — Local supplier PR vs NEG inter-company PR from NAFFCO Dubai */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              PR Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrType('local')}
                className={`text-left border rounded-lg px-3 py-2.5 transition-colors ${
                  prType === 'local' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <span className="block text-sm font-semibold text-gray-800">Local PR</span>
                <span className="block text-xs text-gray-500 mt-0.5">Purchased from local / external suppliers via PO.</span>
              </button>
              <button
                type="button"
                onClick={() => setPrType('neg')}
                className={`text-left border rounded-lg px-3 py-2.5 transition-colors ${
                  prType === 'neg' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <span className="block text-sm font-semibold text-gray-800">NEG PR — NAFFCO Dubai</span>
                <span className="block text-xs text-gray-500 mt-0.5">Inter-company (Dubai → Saudi); arrives with a NEG PO.</span>
              </button>
            </div>
          </div>

          {prType === 'neg' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                NEG PO Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={negPoNumber}
                onChange={(e) => setNegPoNumber(e.target.value)}
                placeholder="NEG PO accompanying this PR"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                PR Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={prNumber}
                onChange={(e) => setPrNumber(e.target.value)}
                required
                placeholder="PR-YYMM-NNN"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-xs text-gray-400 mt-1">Auto-generated — edit if needed</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Received Date
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Source Department
            </label>
            <select
              value={sourceDepartment}
              onChange={(e) => setSourceDepartment(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select source…</option>
              {SOURCE_DEPT_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Linked Project / SO <span className="text-red-500">*</span>
              {!isSupabaseConfigured && <span className="ml-2 text-gray-400 font-normal">(select not available in dev mode)</span>}
            </label>
            {isSupabaseConfigured && projects.length > 0 ? (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_code} — {p.so_number} — {p.customer_name}
                  </option>
                ))}
              </select>
            ) : isSupabaseConfigured ? (
              <input
                type="text"
                disabled
                placeholder="Loading projects…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400"
              />
            ) : (
              <input
                type="text"
                disabled
                placeholder="Not available in dev mode"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400"
              />
            )}
            <p className="text-xs text-gray-400 mt-1">Every PR line is tied to this project's SO — the Store sees the link at receiving time.</p>
          </div>

          {/* PR lines — code + quantity + description only */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">PR Lines</label>
            <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50/50">
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newLine.item_code}
                  onChange={(e) => setNewLine((p) => ({ ...p, item_code: e.target.value }))}
                  placeholder="Code"
                  className="col-span-3 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="number"
                  min={1}
                  value={newLine.quantity}
                  onChange={(e) => setNewLine((p) => ({ ...p, quantity: Number(e.target.value) }))}
                  placeholder="Qty"
                  className="col-span-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="text"
                  value={newLine.description}
                  onChange={(e) => setNewLine((p) => ({ ...p, description: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }}
                  placeholder="Description"
                  className="col-span-5 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="col-span-2"
                  onClick={addLine}
                  disabled={!newLine.description.trim() || newLine.quantity <= 0}
                  icon={<Plus size={14} />}
                >
                  Add
                </Button>
              </div>

              {lines.length > 0 && (
                <table className="w-full text-left text-sm bg-white border border-gray-100 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Code</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-3 py-2 text-xs font-medium text-gray-500">Description</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lines.map((l, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-mono text-xs text-gray-700">{l.item_code || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">{l.quantity}</td>
                        <td className="px-3 py-2 text-gray-800">{l.description}</td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="text-xs text-gray-500">
                The PR stays pending until a PO to supplier is raised for every line.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Scope of PR, urgency, special notes…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {notice && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
              {notice}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-800">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="submit"
              loading={saving}
              icon={<Check size={15} />}
              className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
            >
              Register PR
            </Button>
            <Link to="/procurement/requests">
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
