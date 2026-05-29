import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Inbox, FileText, TrendingUp, UserCheck, FolderKanban,
  ShieldCheck, GitBranch, ShoppingCart, Factory, Warehouse, PackageCheck,
  Truck, Microscope, ClipboardCheck, Plane, Wrench, BarChart3, Settings, Users, X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { NAV_ITEMS } from '../../data/navigation';
import type { NavItem } from '../../types';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, Inbox, FileText, TrendingUp, UserCheck, FolderKanban,
  ShieldCheck, GitBranch, ShoppingCart, Factory, Warehouse, PackageCheck,
  Truck, Microscope, ClipboardCheck, Plane, Wrench, BarChart3, Settings, Users,
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function NavItemRow({ item, onClose }: { item: NavItem; onClose: () => void }) {
  // Section separator
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
        {/* Mobile close button */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-700 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">FT</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">Operations Portal</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {NAV_ITEMS.map((item) => (
            <NavItemRow key={item.id} item={item} onClose={onClose} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 text-[10px] text-gray-400">
          FT Operations Portal v0.1 — Phase 0
        </div>
      </aside>
    </>
  );
}
