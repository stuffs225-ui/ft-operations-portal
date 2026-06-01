import { useState } from 'react';
import { Printer, Download, Save, Check, Mail } from 'lucide-react';
import { Button } from '../ui/Button';
import { printReport, saveReportSnapshot } from '../../lib/reportExport';
import type { ReportMetric } from '../../lib/reportExport';
import { EMAIL_PROVIDER_CONFIGURED } from '../../lib/notifications';
import { useAuth } from '../../hooks/useAuth';

interface ReportExportBarProps {
  reportKey: string;
  reportTitle: string;
  department?: string;
  /** Called when the user clicks "Export CSV". */
  onExportCsv?: () => void;
  /** Snapshot payload builders (optional). */
  summary?: string;
  metrics?: ReportMetric[];
  rows?: Record<string, unknown>[];
  dateFrom?: string | null;
  dateTo?: string | null;
}

/**
 * Shared report action toolbar: Print, Export CSV, Save Snapshot. Designed to be
 * dropped at the top of any report page. Marked `no-print` so it is excluded from
 * the printed output. When no email provider is configured, the "share later"
 * affordance is shown as a disabled, clearly-labelled future-integration badge.
 */
export function ReportExportBar({
  reportKey,
  reportTitle,
  department,
  onExportCsv,
  summary,
  metrics,
  rows,
  dateFrom,
  dateTo,
}: ReportExportBarProps) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    const result = await saveReportSnapshot({
      reportKey,
      reportTitle,
      department,
      dateFrom,
      dateTo,
      summary,
      metrics,
      rows,
      generatedBy: profile?.id ?? null,
    });
    setSaving(false);
    if (result.persisted) {
      setSaved(true);
      setMsg('Snapshot saved.');
    } else {
      setSaved(true);
      setMsg('Snapshot captured (dev mode — not persisted).');
    }
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2 mb-4">
      <Button size="sm" variant="outline" icon={<Printer size={14} />} onClick={() => printReport()}>
        Print
      </Button>
      {onExportCsv && (
        <Button size="sm" variant="outline" icon={<Download size={14} />} onClick={onExportCsv}>
          Export CSV
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        icon={saved ? <Check size={14} /> : <Save size={14} />}
        loading={saving}
        onClick={handleSave}
      >
        {saved ? 'Saved' : 'Save Snapshot'}
      </Button>

      <span
        className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-gray-500 border border-gray-200 rounded px-2 py-1"
        title="Email/SMS sharing requires a server-side provider (see EMAIL_SMS_INTEGRATION_PLAN.md)"
      >
        <Mail size={11} />
        {EMAIL_PROVIDER_CONFIGURED ? 'Share by email' : 'Share by email — provider not configured'}
      </span>

      {msg && <span className="text-xs text-gray-500">{msg}</span>}
    </div>
  );
}
