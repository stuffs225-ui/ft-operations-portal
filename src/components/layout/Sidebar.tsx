import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, FileText, TrendingUp, UserCheck, FolderKanban,
  ShieldCheck, GitBranch, ShoppingCart, Factory, Warehouse, PackageCheck,
  Truck, Microscope, ClipboardCheck, Plane, Wrench, BarChart3, Settings,
  Users, X, ScrollText, FileStack, Bell, UserPlus, BellRing, CalendarClock, Activity, Flame,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { NAV_ITEMS } from '../../data/navigation';
import { useAuth } from '../../hooks/useAuth';
import { BrandLogo } from '../ui/BrandLogo';
import type { NavItem, UserRole } from '../../types';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Inbox, FileText, TrendingUp, UserCheck, FolderKanban,
  ShieldCheck, GitBranch, ShoppingCart, Factory, Warehouse, PackageCheck,
  Truck, Microscope, ClipboardCheck, Plane, Wrench, BarChart3, Settings,
  Users, ScrollText, FileStack, Bell, UserPlus, BellRing, CalendarClock, Activity, Flame,
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// An item is visible if it has no roles restriction, or the user's role is listed
function isItemVisible(item: NavItem, role: UserRole | null): boolean {
  if (!item.roles || item.roles.length === 0) return true;
  if (!role) return false;
  if (role === 'admin') return true;
  return item.roles.includes(role);
}

// Build the filtered nav list, removing separators that have no visible children
function buildVisibleNav(role: UserRole | null): NavItem[] {
  const result: NavItem[] = [];
  let pendingSeparator: NavItem | null = null;

  for (const item of NAV_ITEMS) {
    if (item.path === '#') {
      // Hold the separator — emit it only if a visible child follows
      pendingSeparator = item;
    } else {
      if (isItemVisible(item, role)) {
        if (pendingSeparator) {
          result.push(pendingSeparator);
          pendingSeparator = null;
        }
        result.push(item);
      }
    }
  }

  return result;
}

function NavItemRow({ item, onClose }: { item: NavItem; onClose: () => void }) {
  if (item.path === '#') {
    return (
      <div className="px-3 pt-4 pb-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
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
          'flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
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
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 lg:hidden">
          <BrandLogo size={28} withWordmark tagline="Operations Portal" />
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {visibleItems.map((item) => (
            <NavItemRow key={item.id} item={item} onClose={onClose} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 text-[10px] text-gray-400">
          NAFFCO Fire Trucks — Operations Portal
        </div>
      </aside>
    </>
  );
}
