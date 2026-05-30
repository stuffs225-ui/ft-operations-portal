import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, AlertCircle, ShoppingCart, PackageCheck, Truck,
  ClipboardX, ShieldAlert, Package, FileText, TrendingUp, TrendingDown,
  Minus, ArrowRight, Send, CheckCircle, Wrench, Calendar, type LucideIcon,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { DASHBOARD_KPI_CARDS, PROJECT_SUMMARY } from '../data/mockDashboard';
import type { KpiCard } from '../types';
import { cn } from '../lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  FileText, AlertTriangle, AlertCircle, ShoppingCart, PackageCheck,
  Truck, ClipboardX, ShieldAlert, Package, Send, CheckCircle, Wrench, Calendar,
};

const severityConfig = {
  normal:   { border: 'border-l-green-400',  badge: 'bg-green-50 text-green-700',  dot: 'bg-green-400' },
  warning:  { border: 'border-l-amber-400',  badge: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-400' },
  critical: { border: 'border-l-red-500',    badge: 'bg-red-50 text-red-700',      dot: 'bg-red-500'   },
  info:     { border: 'border-l-sky-400',    badge: 'bg-sky-50 text-sky-700',      dot: 'bg-sky-400'   },
};

function KpiCardItem({ card }: { card: KpiCard }) {
  const navigate = useNavigate();
  const Icon = ICON_MAP[card.icon] ?? FileText;
  const sc = severityConfig[card.severity];

  return (
    <div
      onClick={() => navigate(card.path)}
      className={cn(
        'bg-white rounded-xl border border-gray-200 border-l-4 shadow-sm p-5 cursor-pointer',
        'hover:shadow-md hover:border-gray-300 transition-all',
        sc.border,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg', sc.badge)}>
          <Icon size={18} />
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          {card.trend === 'up'      && <TrendingUp size={12} className="text-red-400" />}
          {card.trend === 'down'    && <TrendingDown size={12} className="text-green-400" />}
          {card.trend === 'neutral' && <Minus size={12} />}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{card.value}</div>
      <div className="text-sm font-semibold text-gray-700 mb-1">{card.title}</div>
      {card.subtitle && (
        <div className="text-xs text-gray-500 leading-snug">{card.subtitle}</div>
      )}
    </div>
  );
}

export function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Operations Control Tower"
        subtitle="Live operational status — static data, Phase 0"
        breadcrumb={[{ label: 'Dashboard' }]}
        action={
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Static Demo Data
          </div>
        }
      />

      {/* Project Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {[
          { label: 'Active Projects', value: PROJECT_SUMMARY.totalActive, color: 'text-brand-700' },
          { label: 'Saudi Route', value: PROJECT_SUMMARY.saudi, color: 'text-blue-700' },
          { label: 'Dubai Route', value: PROJECT_SUMMARY.dubai, color: 'text-sky-700' },
          { label: 'With WO', value: PROJECT_SUMMARY.withWO, color: 'text-green-700' },
          { label: 'With PN', value: PROJECT_SUMMARY.withPN, color: 'text-teal-700' },
          { label: 'In Production', value: PROJECT_SUMMARY.inProduction, color: 'text-amber-700' },
          { label: 'In QC', value: PROJECT_SUMMARY.inQC, color: 'text-purple-700' },
          { label: 'Ready to Deliver', value: PROJECT_SUMMARY.readyToDeliver, color: 'text-green-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
            <div className={cn('text-xl font-bold', item.color)}>{item.value}</div>
            <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{item.label}</div>
          </div>
        ))}
      </div>

      {/* KPI Cards Grid */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-brand-600 rounded-full inline-block" />
          Critical Operational Indicators
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {DASHBOARD_KPI_CARDS.map((card) => (
            <KpiCardItem key={card.id} card={card} />
          ))}
        </div>
      </div>

      {/* Governance Rules Banner */}
      <Card className="bg-brand-950 border-brand-800 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="text-xs font-semibold text-brand-300 mb-1 uppercase tracking-wide">
              Governance Golden Rules — Active
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-brand-200">
              {[
                'SO = commercial reference. WO = mandatory for Saudi. PN = mandatory for Dubai.',
                'No BOQ, BOM, drawings, or Raw Material Requests before WO (Saudi).',
                'No Dubai ETA, Dubai PO, or AFS readiness before PN (Dubai).',
                'PO to Supplier > 10,000 SAR requires Admin or Operations Manager approval.',
                'Temporary Custody requires Admin or Operations Manager approval.',
                'Release Note blocked until all QC findings and rework are closed.',
                'Medical items must be tracked by serial number.',
                'Vehicle receiving requires chassis number and photos.',
              ].map((rule) => (
                <div key={rule} className="flex items-start gap-2">
                  <span className="text-brand-400 shrink-0 mt-0.5">▸</span>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="shrink-0 hidden lg:flex flex-col items-end gap-1 text-brand-400 text-xs">
            <span>Playbook v3.2</span>
            <ArrowRight size={16} />
          </div>
        </div>
      </Card>
    </div>
  );
}
