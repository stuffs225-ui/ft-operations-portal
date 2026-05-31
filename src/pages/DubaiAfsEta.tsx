import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { MOCK_DUBAI_FOLLOWUPS } from '../data/mockAfs';

function etaVariant(s: string): 'neutral' | 'warning' | 'success' | 'info' | 'critical' | 'default' {
  if (s === 'delayed') return 'warning';
  if (s === 'on_track') return 'success';
  if (s === 'arrived') return 'info';
  if (s === 'not_set') return 'neutral';
  return 'neutral';
}

export function DubaiAfsEta() {
  const followups = [...MOCK_DUBAI_FOLLOWUPS].sort((a, b) => {
    if (!a.eta_date) return 1;
    if (!b.eta_date) return -1;
    return a.eta_date.localeCompare(b.eta_date);
  });

  return (
    <div className="space-y-5">
      <PageHeader title="ETA Tracking" subtitle="Monitor vehicle arrival ETAs and delay status for all Dubai follow-ups" />

      <Card>
        {followups.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No follow-ups found.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            <div className="px-5 py-2 grid grid-cols-5 gap-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <span>Project</span>
              <span>Vehicle Line</span>
              <span>ETA Date</span>
              <span>ETA Status</span>
              <span></span>
            </div>
            {followups.map(f => (
              <div key={f.id} className="px-5 py-3 grid grid-cols-5 gap-4 items-center text-sm">
                <div>
                  <span className="font-mono font-medium text-gray-900">{f.project?.project_code}</span>
                  <div className="text-xs text-gray-500">{f.project?.customer_name}</div>
                </div>
                <span className="text-gray-700">{f.vehicle_line?.vehicle_type ?? 'Project-wide'}</span>
                <div className="flex items-center gap-1">
                  <Clock size={13} className="text-gray-400" />
                  <span>{f.eta_date ? new Date(f.eta_date).toLocaleDateString('en-GB') : '—'}</span>
                </div>
                <Badge variant={etaVariant(f.eta_status)}>{f.eta_status.replace(/_/g, ' ')}</Badge>
                <Link to={`/dubai-afs/projects/${f.id}`}>
                  <Button variant="ghost" size="sm">View</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
