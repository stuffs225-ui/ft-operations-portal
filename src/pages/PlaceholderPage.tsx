import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: number;
  module: string;
  roles: string[];
  features: string[];
  governanceNotes?: string[];
}

export function PlaceholderPage({
  title,
  description,
  phase,
  module,
  roles,
  features,
  governanceNotes = [],
}: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader
        title={title}
        subtitle={description}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="warning">Phase {phase}</Badge>
            <Badge variant="neutral">{module}</Badge>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coming Soon */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Construction size={28} className="text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-2">
                Coming in Phase {phase}
              </h3>
              <p className="text-sm text-gray-500 max-w-xs">
                This module is part of the Phase {phase} implementation scope. The full workflow and UI will be built here.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {features.map((f) => (
                  <span key={f} className="text-xs bg-brand-50 text-brand-700 border border-brand-200 rounded px-2 py-1">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Module Info Sidebar */}
        <div className="space-y-4">
          <Card>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Module Info
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Module</span>
                <span className="font-medium text-gray-800">{module}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Target Phase</span>
                <Badge variant="warning">Phase {phase}</Badge>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Authorized Roles
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {roles.map((r) => (
                <span key={r} className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5">
                  {r}
                </span>
              ))}
            </div>
          </Card>

          {governanceNotes.length > 0 && (
            <Card className="bg-amber-50 border-amber-200">
              <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
                Governance Rules
              </h3>
              <ul className="space-y-2">
                {governanceNotes.map((note) => (
                  <li key={note} className="text-xs text-amber-800 flex items-start gap-2">
                    <span className="text-amber-500 shrink-0 mt-0.5">▸</span>
                    {note}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
