import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { isSupabaseConfigured } from '../lib/supabase';
import type { PhotoType } from '../types';

const REQUIRED_PHOTO_TYPES: PhotoType[] = ['front', 'rear', 'left_side', 'right_side', 'chassis_plate'];
const ALL_PHOTO_TYPES: { type: PhotoType; label: string; required: boolean }[] = [
  { type: 'front', label: 'Front', required: true },
  { type: 'rear', label: 'Rear', required: true },
  { type: 'left_side', label: 'Left Side', required: true },
  { type: 'right_side', label: 'Right Side', required: true },
  { type: 'chassis_plate', label: 'Chassis Plate', required: true },
  { type: 'damage', label: 'Damage', required: false },
  { type: 'other', label: 'Other', required: false },
];

type PhotoRecord = Partial<Record<PhotoType, string>>;

export function StoreVehicleReceivingNew() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [devSuccess, setDevSuccess] = useState(false);

  // Step 1
  const [vehicleType, setVehicleType] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [mileage, setMileage] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageLocation, setStorageLocation] = useState('');

  // Step 2
  const [conditionStatus, setConditionStatus] = useState('good');
  const [damageNotes, setDamageNotes] = useState('');
  const [photos, setPhotos] = useState<PhotoRecord>({});

  const uploadedRequired = REQUIRED_PHOTO_TYPES.filter(t => photos[t]).length;
  const allRequiredUploaded = uploadedRequired === REQUIRED_PHOTO_TYPES.length;

  function handleSave() {
    if (!isSupabaseConfigured) {
      setDevSuccess(true);
      setTimeout(() => navigate('/store/vehicle-receiving'), 1500);
      return;
    }
    navigate('/store/vehicle-receiving');
  }

  if (devSuccess) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8">
          <Truck size={32} className="text-green-500 mx-auto mb-3" />
          <p className="text-green-700 font-semibold">Vehicle receipt saved (Dev Mode — not persisted)</p>
          <p className="text-green-600 text-sm mt-1">Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader title="New Vehicle Receipt" subtitle={`Step ${step} of 3`} />

      <div className="flex items-center gap-2 mb-2">
        {['Vehicle Info', 'Condition & Photos', 'Review'].map((label, i) => (
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
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type <span className="text-red-500">*</span></label>
              <input type="text" value={vehicleType} onChange={e => setVehicleType(e.target.value)}
                placeholder="Fire Truck, Ambulance, ARFF, Rescue Vehicle…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chassis Number <span className="text-red-500">*</span></label>
              <input type="text" value={chassisNumber} onChange={e => setChassisNumber(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-300" />
              <p className="text-xs text-gray-400 mt-1">Mandatory — must be unique across all vehicle receipts.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received Date <span className="text-red-500">*</span></label>
              <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mileage (km)</label>
              <input type="number" value={mileage} onChange={e => setMileage(e.target.value)} placeholder="Optional"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link to Project</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                <option value="">Unallocated</option>
                <option value="proj-005">FT-2025-0005 — GACA (Saudi)</option>
                <option value="proj-006">FT-2025-0006 — Dubai Civil Defence</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
              <input type="text" value={storageLocation} onChange={e => setStorageLocation(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
            </div>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => { if (vehicleType && chassisNumber && receivedDate) setStep(2); }}>
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <select value={conditionStatus} onChange={e => setConditionStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300">
                <option value="good">Good</option>
                <option value="minor_damage">Minor Damage</option>
                <option value="major_damage">Major Damage</option>
                <option value="total_loss">Total Loss</option>
              </select>
            </div>
            {conditionStatus !== 'good' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Damage Notes <span className="text-red-500">*</span></label>
                <textarea value={damageNotes} onChange={e => setDamageNotes(e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Photo Documentation</h4>
              <div className="space-y-2">
                {ALL_PHOTO_TYPES.map(({ type, label, required }) => {
                  const uploaded = Boolean(photos[type]);
                  return (
                    <div key={type} className="flex items-center gap-3 p-2 border border-gray-100 rounded-lg">
                      <div className="w-5 h-5 flex-shrink-0">
                        {uploaded
                          ? <CheckCircle size={18} className="text-green-500" />
                          : required
                            ? <AlertCircle size={18} className="text-red-400" />
                            : <div className="w-4 h-4 rounded-full border-2 border-gray-200" />}
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-28">{label}</span>
                      {required && <span className="text-xs text-red-500 font-medium">Required</span>}
                      {!required && <span className="text-xs text-gray-400">Optional</span>}
                      <input
                        type="text"
                        placeholder="Enter filename…"
                        value={photos[type] ?? ''}
                        onChange={e => setPhotos(p => ({ ...p, [type]: e.target.value }))}
                        className="ml-auto flex-1 max-w-xs border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-300"
                      />
                    </div>
                  );
                })}
              </div>
              {!allRequiredUploaded && (
                <p className="text-xs text-amber-600 mt-2">
                  {REQUIRED_PHOTO_TYPES.length - uploadedRequired} required photo(s) still missing. Vehicle receipt cannot be closed until all 5 required photos are uploaded.
                </p>
              )}
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
            <h3 className="font-semibold text-gray-700">Review & Save</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Vehicle Type:</span><span>{vehicleType}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Chassis #:</span><span className="font-mono">{chassisNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Received Date:</span><span>{receivedDate}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Condition:</span><span>{conditionStatus}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Photos:</span>
                <span className={allRequiredUploaded ? 'text-green-600' : 'text-red-600'}>
                  {uploadedRequired}/{REQUIRED_PHOTO_TYPES.length} required
                </span>
              </div>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-700">
              Governance: Vehicle receipt is complete only when chassis number and all 5 required photos are recorded.
            </div>
            {!isSupabaseConfigured && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                Dev Mode — changes will not be persisted.
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}><ChevronLeft size={14} /> Back</Button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleSave}>Save as Draft</Button>
                <Button variant="primary" size="sm" onClick={handleSave}>Mark as Received</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="text-center">
        <Link to="/store/vehicle-receiving" className="text-sm text-gray-400 hover:text-gray-600">← Back to vehicle receipts</Link>
      </div>
    </div>
  );
}
