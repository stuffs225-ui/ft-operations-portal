import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, FileText, TrendingUp, UserCheck, FolderKanban,
  ShieldCheck, GitBranch, ShoppingCart, Factory, Warehouse, PackageCheck,
  Truck, Microscope, ClipboardCheck, ClipboardList, Plane, Wrench, BarChart2, BarChart3,
  Settings, Users, X, ScrollText, FileStack, Bell, UserPlus, BellRing,
  CalendarClock, Activity, Flame, Package, Clock, AlertCircle, AlertTriangle,
  Layers, ArrowUpRight, Hash, RotateCcw, CheckCircle2, XCircle,
  ListChecks, AlertOctagon, Search, FileCheck, FilePlus,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { NAV_ITEMS, dedupeNavItems } from '../../data/navigation';
import { useAuth } from '../../hooks/useAuth';
import { BrandLogo } from '../ui/BrandLogo';
import type { NavItem, UserRole } from '../../types';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Inbox, FileText, TrendingUp, UserCheck, FolderKanban,
  ShieldCheck, GitBranch, ShoppingCart, Factory, Warehouse, PackageCheck,
  Truck, Microscope, ClipboardCheck, ClipboardList, Plane, Wrench, BarChart2, BarChart3,
  Settings, Users, ScrollText, FileStack, Bell, UserPlus, BellRing,
  CalendarClock, Activity, Flame, Package, Clock, AlertCircle, AlertTriangle,
  Layers, ArrowUpRight, Hash, RotateCcw, CheckCircle2, XCircle,
  ListChecks, AlertOctagon, Search, FileCheck, FilePlus,
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// An item is visible if it has no roles restriction, or the user's role is listed.
// strict: true disables the admin bypass — item is only visible to its listed roles.
function isItemVisible(item: NavItem, role: UserRole | null): boolean {
  if (!item.roles || item.roles.length === 0) return true;
  if (!role) return false;
  if (role === 'admin' && !item.strict) return true;
  return item.roles.includes(role);
}

// Build the filtered nav list: role-filter, dedupe true duplicates, then drop
// separators that have no visible children.
function buildVisibleNav(role: UserRole | null): NavItem[] {
  const visible = NAV_ITEMS.filter((item) => item.path === '#' || isItemVisible(item, role));
  const deduped = dedupeNavItems(visible);

  const result: NavItem[] = [];
  let pendingSeparator: NavItem | null = null;

  for (const item of deduped) {
    if (item.path === '#') {
      // Hold the separator — emit it only if a visible child follows
      pendingSeparator = item;
    } else {
      if (pendingSeparator) {
        result.push(pendingSeparator);
        pendingSeparator = null;
      }
      result.push(item);
    }
  }

  return result;
}

function NavItemRow({ item, onClose, isFirst }: { item: NavItem; onClose: () => void; isFirst?: boolean }) {
  if (item.path === '#') {
    return (
      <div className={cn('px-4 pb-1.5', isFirst ? 'pt-3' : 'pt-5')}>
        <span className="text-[11px] font-semibold text-white/45 uppercase tracking-[0.08em]">
          {item.label}
        </span>
      </div>
    );
  }

  const Icon = ICON_MAP[item.icon];

  return (
    <NavLink
      to={item.path}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 h-9 px-3 mx-2 rounded-btn text-[13px] transition-colors',
          isActive
            ? 'bg-brand-800 text-white font-semibold shadow-[inset_3px_0_0_0_#C8102E]'
            : 'text-white/70 hover:bg-white/[0.06] hover:text-white font-medium',
        )
      }
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto text-[10px] bg-danger text-white rounded-btn px-1.5 py-0.5 font-semibold num">
          {item.badge}
        </span>
      )}
    </NavLink>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { role } = useAuth();
  const visibleItems = buildVisibleNav(role);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel — dark navy (Visual Identity D5); contrast is the edge, no border. */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-60 bg-brand-900 z-50 flex flex-col transition-transform duration-200',
          'lg:relative lg:translate-x-0 lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Mobile close */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/10 lg:hidden">
          <BrandLogo size={28} withWordmark dark tagline="NAFFCO Vehicles Division" />
          <button onClick={onClose} className="p-1 rounded text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Desktop brand header */}
        <Link
          to="/"
          className="hidden lg:flex items-center h-14 px-4 border-b border-white/10 shrink-0 hover:bg-white/[0.04] transition-colors"
        >
          <BrandLogo size={28} withWordmark dark tagline="NAFFCO Vehicles Division" />
        </Link>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {visibleItems.map((item, idx) => (
            <NavItemRow
              key={item.id}
              item={item}
              onClose={onClose}
              isFirst={idx === 0}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] text-white/45">FT Operations Portal</span>
          <span className="text-[10px] text-white/30">v9</span>
        </div>
      </aside>
    </>
  );
}
