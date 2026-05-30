import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, FileText, Package, Calendar, AlertTriangle, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { MOCK_FACTORY_RECORDS, MOCK_FACTORY_REQUIREMENTS, MOCK_RAW_MATERIAL_REQUESTS } from '../data/mockFactory';
import { MOCK_PROJECTS } from '../data/mockProjects';
import type { UserRole } from '../types';

const FACTORY_ROLES: UserRole[] = ['admin', 'operations_manager', 'factory_user'];

interface KpiStat {
  label: string;
  value: number;
  subtitle: string;
  borderColor: string;
  textColor: string;
}

export function Factory() {
  const { role } = useAuth();
  const [kpis, setKpis] = useState<KpiStat[]>([]);

  useEffect(() => {
    const inProduction = MOCK_FACTORY_RECORDS.filter(
      (r) => r.production_status === 'in_production',
    ).length;

    const missingBoq = MOCK_FACTORY_REQUIREMENTS.filter(
      (r) => r.requirement_type_id === 'rqt-001' && r.status === 'pending',
    ).length;

    const missingGa = MOCK_FACTORY_REQUIREMENTS.filter(
      (r) => r.requirement_type_id === 'rqt-003' && r.status === 'pending',
    ).length;

    const monthlyRequired = MOCK_FACTORY_RECORDS.filter(
      (r) => r.monthly_update_required,
    ).length;

    const openRmrs = MOCK_RAW_MATERIAL_REQUESTS.filter(
      (r) => !['fulfilled', 'rejected', 'cancelled'].includes(r.status),
    ).length;

    // Saudi projects count — used for KPI label context
    const saudiInProduction = MOCK_PROJECTS.filter(
      (p) => p.project_status === 'approved' && p.manufacturing_location === 'saudi',
    ).length;

    setKpis([
      {
        label: 'In Production',
        value: inProduction,
        subtitle: `${saudiInProduction} approved Saudi project(s)`,
        borderColor: 'border-l-green-500',
        textColor: 'text-green-700',
      },
      {
        label: 'Missing BOQ',
        value: missingBoq,
        subtitle: 'Pending bill of quantities',
        borderColor: 'border-l-amber-500',
        textColor: 'text-amber-700',
      },
      {
        label: 'Missing GA Drawing',
        value: missingGa,
        subtitle: 'Pending GA drawings',
        borderColor: 'border-l-amber-500',
        textColor: 'text-amber-700',
      },
      {
        label: 'Updates Required',
        value: monthlyRequired,
        subtitle: 'Monthly update overdue',
        borderColor: 'border-l-red-500',
        textColor: 'text-red-700',
      },
      {
        label: 'Open RMRs',
        value: openRmrs,
        subtitle: 'Raw material requests open',
        borderColor: 'border-l-sky-500',
        textColor: 'text-sky-700',
      },
    ]);
  }, []);

  if (!role || !FACTORY_ROLES.includes(role)) {
    return (
      <div className="p-6">
        <PageHeader
          title="Factory / Production"
          icon={<Wrench size={18} />}
        />
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-800">
              Access restricted to Factory / Production team
            </p>
            <p className="text-xs text-gray-500">
              Contact your administrator if you require access to this module.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const navSections = [
    {
      title: 'Factory Projects',
      description: 'Approved Saudi projects with active WO',
      path: '/factory/projects',
      icon: <Wrench size={18} className="text-brand-600" />,
    },
    {
      title: 'Requirements',
      description: 'BOQ, BOM, GA Drawing, Detail Drawings status',
      path: '/factory/requirements',
      icon: <FileText size={18} className="text-brand-600" />,
    },
    {
      title: 'Raw Material Requests',
      description: 'Project-related and stock RMRs',
      path: '/factory/raw-material-requests',
      icon: <Package size={18} className="text-brand-600" />,
    },
    {
      title: 'Monthly Updates',
      description: 'Projects requiring production updates',
      path: '/factory/monthly-updates',
      icon: <Calendar size={18} className="text-brand-600" />,
    },
    {
      title: 'Pending Raw Materials',
      description: 'Items awaiting procurement fulfillment',
      path: '/factory/pending-raw-materials',
      icon: <Package size={18} className="text-brand-600" />,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Factory / Production"
        subtitle="Saudi factory workspace — manage WO, BOQ, BOM, GA Drawings, and production progress"
        icon={<Wrench size={18} />}
      />

      {!isSupabaseConfigured && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800">
          <AlertTriangle size={13} className="text-amber-600 shrink-0" />
          Dev mode — using mock factory data. Changes will not be persisted.
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={`p-4 border-l-4 ${kpi.borderColor}`}>
            <p className={`text-2xl font-bold ${kpi.textColor}`}>{kpi.value}</p>
            <p className="text-xs font-semibold text-gray-800 mt-0.5">{kpi.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{kpi.subtitle}</p>
          </Card>
        ))}
      </div>

      {/* WO Gate Notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4">
        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-amber-900">
            Factory operations require a confirmed WO. Projects without WO are blocked.
          </span>
          <Link to="/wo-pn-gate" className="text-xs font-semibold text-amber-800 underline">
            → WO/PN Gate
          </Link>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="space-y-2">
        {navSections.map((section) => (
          <Link key={section.path} to={section.path}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                    {section.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{section.title}</p>
                    <p className="text-xs text-gray-500">{section.description}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Role badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Your role:</span>
        <Badge variant="default">{role}</Badge>
      </div>
    </div>
  );
}
