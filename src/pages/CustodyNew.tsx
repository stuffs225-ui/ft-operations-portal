import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { isSupabaseConfigured } from '../lib/supabase';
import { MOCK_STORE_RECEIPTS, MOCK_RECEIPT_ITEMS } from '../data/mockStore';
import type { StoreReceiptItem } from '../types';

export function CustodyNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [devSuccess, setDevSuccess] = useState(false);

  // Step 1
  const [selectedItem, setSelectedItem] = useState<StoreReceiptItem | null>(null);

  // Step 2
  const [issueType, setIssueType] = useState<'assign_to_project' | 'temporary_custody'>('assign_to_project');
  const [issuedToRole, setIssuedToRole] = useState('factory_user');
  const [issuedToDept, setIssuedToDept] = useState('');
  const [projectId, setProjectId] = useState('');
  const [remarks, setRemarks] = useState('');

  const approvalRequired = issueType === 'temporary_custody';

  // Get items available for issuance (in_store)
  const availableItems: StoreReceiptItem[] = MOCK_STORE_RECEIPTS.flatMap(r =>
    (MOCK_RECEIPT_ITEMS[r.id] ?? []).filter(i => i.status === 'in_store')
  );

  function handleIssue() {
    if (!isSupabaseConfigured) {
      setDevSuccess(true);
      setTimeout(() => navigate('/custody'), 1500);
      return;
    }
    navigate('/custody');
  }

  if (devSuccess) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8">
          <ShieldCheck size={32} className="text-green-500 mx-auto mb-3" />
          <p className="text-green-700 font-semibold">Custody record created (Dev Mode — not persisted)</p>
          <p className="text-green-600 text-sm mt-1">Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="Issue Material Custody" subtitle={`Step ${step} of 3`} />

      <div className="flex items-center gap-2 mb-2">
        {['Select Material', 'Issue Details', 'Confirm'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === i + 1 ? 'bg-sky-600 text-white' : step > i + 1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>{i + 1}</div>
            <span className={`text-sm ${step === i + 1 ? 'text-sky-700 font-medium' : 'text-gray-400'}`}>{label}</span>
            {i < 2 && <ChevronRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <div className="p-5 space-y-3">
            <h3 className="font-semibold text-gray-700">Select an item to issue</h3>
            {availableItems.length === 0 ? (
              <p className="text-sm text-gray-400">No items currently available in store for issuance.</p>
            ) : (
              <div className="space-y-2">
                {availableItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedItem?.id === item.id
                        ? 'border-sky-400 bg-sky-50'
                        : 'border-gray-200 hover:border-sky-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.item_name}</p>
                        <p className="text-xs text-gray-500">{item.material_category} · {item.quantity_received} {item.unit}</p>
                        {item.storage_location && <p className="text-xs text-gray-400">Location: {item.storage_location}</p>}
                      </div>
                      <Badge variant="success">In Store</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => { if (selectedItem) setStep(2); }}>
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <div className="p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">Issue Details</h3>

            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-800">{selectedItem?.item_name}</p>
              <p className="text-gray-500">{selectedItem?.material_category} · {selectedItem?.quantity_received} {selectedItem?.unit}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
              <div className="flex gap-3">
                {(['assign_to_project', 'temporary_custody'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setIssueType(type)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      issueType === type ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {type === 'assign_to_project' ? 'Assign to Project' : 'Temporary Custody'}
                  </button>
                ))}
              </div>
            </div>

            {issueType === 'temporary_custody' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">Temporary custody requires Admin or Operations Manager approval before the material can be issued.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issued To Role</label>
              <select value={issuedToRole} onChange={e => setIssuedToRole(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                <option value="factory_user">Factory / Production</option>
                <option value="afs_user">AFS / Dubai</option>
                <option value="store_user">Store</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text" value={issuedToDept} onChange={e => setIssuedToDept(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                <option value="">No project link</option>
                <option value="proj-005">FT-2025-0005 — GACA</option>
                <option value="proj-006">FT-2025-0006 — Dubai CD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}><ChevronLeft size={14} /> Back</Button>
              <Button variant="primary" size="sm" onClick={() => setStep(3)}>Next <ChevronRight size={14} /></Button>
            </div>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <div className="p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">Confirm Custody Issue</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Item:</span><span>{selectedItem?.item_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Issue Type:</span>
                <Badge variant={issueType === 'temporary_custody' ? 'warning' : 'info'}>{issueType.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Issued To:</span><span>{issuedToRole}</span></div>
              {projectId && <div className="flex justify-between"><span className="text-gray-500">Project:</span><span>{projectId}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Approval Required:</span>
                <Badge variant={approvalRequired ? 'warning' : 'neutral'}>{approvalRequired ? 'Yes — Admin/Ops' : 'Not Required'}</Badge>
              </div>
            </div>
            {!isSupabaseConfigured && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                Dev Mode — changes will not be persisted.
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}><ChevronLeft size={14} /> Back</Button>
              <Button variant="primary" size="sm" onClick={handleIssue}>Issue Custody</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="text-center">
        <Link to="/custody" className="text-sm text-gray-400 hover:text-gray-600">← Back to custody</Link>
      </div>
    </div>
  );
}
