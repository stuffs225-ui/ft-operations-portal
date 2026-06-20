import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Check } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ProjectOption {
  id: string;
  project_code: string;
  so_number: string;
  customer_name: string;
}

const SOURCE_DEPT_OPTIONS = [
  'Factory',
  'Store',
  'AFS / Dubai',
  'Engineering',
  'Management',
  'Manual / Other',
];

function generatePRNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `PR-${yy}${mm}-${seq}`;
}

export function ProcurementRequestNew() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState('');
  const [prNumber, setPrNumber] = useState(generatePRNumber());
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sourceDepartment, setSourceDepartment] = useState('');
  const [remarks, setRemarks] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase
      .from('projects')
      .select('id, project_code, so_number, customer_name')
      .in('project_status', ['active', 'approved'])
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setProjects((data as ProjectOption[]) ?? []);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prNumber.trim()) return;

    setSaving(true);
    setError(null);

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

    const { data, error: insertError } = await supabase
      .from('procurement_requests')
      .insert({
        pr_number: prNumber.trim(),
        project_id: projectId,
        received_date: receivedDate || null,
        source_department: sourceDepartment || null,
        status: 'pr_received',
        remarks: remarks.trim() || null,
        created_by: profile?.id ?? null,
      })
      .select('id')
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    navigate(`/procurement/requests/${(data as { id: string }).id}`);
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

      <Card className="p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
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
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select source…</option>
              {SOURCE_DEPT_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Linked Project / SO
              {!isSupabaseConfigured && <span className="ml-2 text-gray-400 font-normal">(select not available in dev mode)</span>}
            </label>
            {isSupabaseConfigured && projects.length > 0 ? (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select project (optional)…</option>
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
            <p className="text-xs text-gray-400 mt-1">Link this PR to an active project. Can be added later via PR detail.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Scope of PR, urgency, special notes…"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

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
