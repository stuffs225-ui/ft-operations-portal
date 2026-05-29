import { Bell, Menu, Search, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_CONFIGS } from '../../lib/roles';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { profile, role, signOut, isDevMode } = useAuth();

  const displayName = profile?.full_name ?? profile?.email ?? 'User';
  const roleConfig = role ? ROLE_CONFIGS[role] : null;
  const avatarInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shrink-0 z-30">
      {/* Hamburger */}
      <button
        onClick={onMenuToggle}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 bg-brand-700 rounded-md flex items-center justify-center">
          <span className="text-white text-xs font-bold">FT</span>
        </div>
        <span className="font-bold text-gray-900 text-sm hidden sm:block">Operations Portal</span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects, SO, WO, PN…"
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Dev mode indicator */}
      {isDevMode && (
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 font-medium">
          DEV MODE
        </span>
      )}

      {/* Notifications */}
      <button className="relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
        <Bell size={18} />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      {/* User chip */}
      <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
        <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-semibold">{avatarInitials}</span>
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-semibold text-gray-800 leading-none truncate max-w-[120px]">
            {displayName}
          </div>
          {roleConfig && (
            <div className="text-xs text-gray-500 mt-0.5">
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${roleConfig.color}`}>
                {roleConfig.label}
              </span>
            </div>
          )}
        </div>
        <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
      </div>

      {/* Logout */}
      <button
        onClick={() => void signOut()}
        title="Sign out"
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-1"
      >
        <LogOut size={16} />
      </button>
    </header>
  );
}
