import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/api/auth';

interface NavbarProps {
  title: string;
  /** Render a back chevron that calls this callback */
  onBack?: () => void;
  /** Extra content rendered in the centre-right area (e.g. a Refresh button) */
  actions?: React.ReactNode;
}

const CrossIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="9.5" y="3" width="5" height="18" rx="1.2" />
    <rect x="3" y="9.5" width="18" height="5" rx="1.2" />
  </svg>
);

const ROLE_STYLES: Record<string, string> = {
  admin:     'bg-rose-900/50 text-rose-300 border-rose-800/60',
  nurse:     'bg-blue-900/50 text-blue-300 border-blue-800/60',
  reception: 'bg-emerald-900/50 text-emerald-300 border-emerald-800/60',
};

export const Navbar: React.FC<NavbarProps> = ({ title, onBack, actions }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const roleStyle = ROLE_STYLES[user.role] ?? 'bg-slate-800 text-slate-300 border-slate-700';

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950 border-b border-slate-800 flex items-center gap-3 px-4 sm:px-6 h-14 shrink-0">

      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          aria-label="Go back"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
      )}

      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-900/50">
          <CrossIcon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-white font-bold text-sm hidden sm:block">OR Tracking</span>
      </div>

      {/* Divider + page title */}
      <div className="hidden sm:block w-px h-5 bg-slate-700 shrink-0" />
      <span className="text-slate-200 font-semibold text-sm truncate">{title}</span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Centre-right actions slot */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {/* Role pill — hidden on xs */}
      <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize shrink-0 ${roleStyle}`}>
        {user.role || 'staff'}
      </span>

      {/* User name — hidden on small screens */}
      <span className="hidden md:block text-slate-300 text-sm font-medium shrink-0 max-w-[120px] truncate">
        {user.name}
      </span>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  );
};
