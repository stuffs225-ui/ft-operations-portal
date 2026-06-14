import { Link } from 'react-router-dom';
import {
  BarChart2, Activity, TrendingUp, ShoppingCart, Wrench, Package,
  ClipboardCheck, Plane, Users, AlertTriangle, Database, Shield,
  CheckCircle, FileText, BookOpen,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '../components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

interface ReportCardDef {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
  badge?: string;
}

const REPORT_GROUPS: { heading: string; cards: ReportCardDef[] }[] = [
  {
    heading: 'Executive',
    cards: [
      { title: 'Control Tower', description: 'Full lifecycle overview — exceptions, delivery readiness, and operational health', path: '/control-tower', icon: <Activity size={20} />, roles: ['admin', 'operations_manager', 'viewer'], badge: 'Live' },
      { title: 'Executive Dashboard', description: 'Project lifecycle, critical exceptions, and health summary', path: '/reports/executive', icon: <BarChart2 size={20} />, roles: ['admin', 'operations_manager', 'viewer'] },
    ],
  },
  {
    heading: 'Projects & Sales',
    cards: [
      { title: 'Project Reports', description: 'Lifecycle status, blockers, WO/PN status, and health scores', path: '/reports/projects', icon: <FileText size={20} /> },
      { title: 'Sales Reports', description: 'Quotation pipeline, conversion rates, and active projects', path: '/reports/sales', icon: <TrendingUp size={20} /> },
    ],
  },
  {
    heading: 'Operations',
    cards: [
      { title: 'Procurement Reports', description: 'PRs, PO to Supplier, ETA delays, and supplier status', path: '/reports/procurement', icon: <ShoppingCart size={20} /> },
      { title: 'Factory Reports', description: 'Production blockers, BOQ gaps, monthly updates, QC readiness', path: '/reports/factory', icon: <Wrench size={20} /> },
      { title: 'Store Reports', description: 'Material receipts, vehicle receiving, custody, and serial tracking', path: '/reports/store', icon: <Package size={20} /> },
      { title: 'QC Reports', description: 'Material QC, NCRs, project QC findings, release note status', path: '/reports/qc', icon: <ClipboardCheck size={20} /> },
      { title: 'Dubai / AFS Reports', description: 'Missing PN, ETA, arrival reports, pre-delivery, maintenance', path: '/reports/afs', icon: <Plane size={20} /> },
    ],
  },
  {
    heading: 'Suppliers',
    cards: [
      { title: 'Supplier Reports', description: 'Supplier scorecards, delivery performance, and NCR counts', path: '/reports/suppliers', icon: <Users size={20} />, roles: ['admin', 'operations_manager', 'procurement_user'] },
    ],
  },
  {
    heading: 'Operational Excellence',
    cards: [
      { title: 'SLA & Escalations', description: 'SLA rules, open breaches, escalation levels, and resolution tracking', path: '/reports/sla', icon: <AlertTriangle size={20} />, roles: ['admin', 'operations_manager'], badge: 'SLA' },
      { title: 'Data Quality', description: 'Missing data, gaps, and recommended fixes across all modules', path: '/reports/data-quality', icon: <Database size={20} /> },
      { title: 'Health Scores', description: 'Project, department, and supplier health scores with scoring transparency', path: '/reports/health-scores', icon: <Shield size={20} />, roles: ['admin', 'operations_manager'] },
      { title: 'Issues & Risks', description: 'Operational issues, risk register, and escalations', path: '/reports/issues', icon: <AlertTriangle size={20} /> },
      { title: 'CAPA Records', description: 'Corrective and preventive action records linked to issues and NCRs', path: '/reports/capa', icon: <CheckCircle size={20} />, roles: ['admin', 'operations_manager', 'qc_user'] },
    ],
  },
  {
    heading: 'Reference',
    cards: [
      { title: 'Audit Log', description: 'Full system audit trail for all write actions', path: '/audit-log', icon: <BookOpen size={20} />, roles: ['admin'] },
    ],
  },
];

export function Reports() {
  const { role } = useAuth();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports & Control Tower"
        subtitle="Centralised reporting, SLA monitoring, health scores, and operational intelligence"
        breadcrumb={[{ label: 'Reports' }]}
        actions={
          <Link to="/control-tower">
            <button className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Activity size={15} />
              Open Control Tower
            </button>
          </Link>
        }
      />

      {REPORT_GROUPS.map(group => {
        const visibleCards = group.cards.filter(
          c => !c.roles || !role || c.roles.includes(role) || role === 'admin'
        );
        if (visibleCards.length === 0) return null;
        return (
          <section key={group.heading}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">{group.heading}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleCards.map(card => (
                <Link key={card.path} to={card.path} className="group">
                  <Card className="p-5 h-full hover:border-sky-300 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="text-sky-600 mt-0.5 shrink-0">{card.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 group-hover:text-sky-700 transition-colors">{card.title}</span>
                          {card.badge && (
                            <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-semibold">{card.badge}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{card.description}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
