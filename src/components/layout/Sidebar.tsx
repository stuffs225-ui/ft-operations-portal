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
      <div className={cn('px-3 pb-1', isFirst ? 'pt-3' : 'pt-6')}>
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em]">
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
          'flex items-center gap-2.5 px-3 py-3 mx-2 rounded-md text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-700 font-semibold shadow-[inset_2px_0_0_0_theme(colors.brand.600)]'
            : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900',
        )
      }
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto text-[10px] bg-red-100 text-red-700 rounded-full px-1.5 py-0.5 font-semibold">
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

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-200 z-50 flex flex-col transition-transform duration-200',
          'lg:relative lg:translate-x-0 lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Mobile close */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 lg:hidden">
          <BrandLogo size={28} withWordmark tagline="Operations Portal" />
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Desktop brand header */}
        <Link
          to="/"
          className="hidden lg:flex items-center h-16 px-4 border-b border-gray-200 shrink-0 hover:bg-gray-50 transition-colors"
        >
          <BrandLogo size={28} withWordmark tagline="Operations Portal" />
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
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">Operations Portal</span>
          <span className="text-[10px] text-gray-300">v8B</span>
        </div>
      </aside>
    </>
  );
}
