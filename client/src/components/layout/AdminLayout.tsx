import React from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  Activity,
  Users,
  Gamepad2,
  FileCheck,
  Coins,
  ShieldAlert,
  Shield,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user } = useAuthStore();

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  const adminNav = [
    { to: '/admin', label: 'Platform Metrics', icon: <Activity className="w-4 h-4" />, end: true },
    { to: '/admin/games', label: 'Room Operations', icon: <Gamepad2 className="w-4 h-4" /> },
    { to: '/admin/users', label: 'User Directory', icon: <Users className="w-4 h-4" /> },
    { to: '/admin/kyc', label: 'KYC Reviews', icon: <FileCheck className="w-4 h-4" /> },
    { to: '/admin/fraud', label: 'Fraud & Risk Engine', icon: <ShieldAlert className="w-4 h-4" /> },
    { to: '/admin/bet-records', label: 'Player Bets & Ledger', icon: <Coins className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Top Banner */}
      <div className="p-6 rounded-3xl glass-panel-elevated border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-gold-glow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black font-display text-arena-text">
                Dagi Bingo Admin Suite
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-black uppercase font-mono">
                ENGINE HEALTHY
              </span>
            </div>
            <p className="text-xs text-arena-muted">
              Live server room controller, player compliance, and real-time security monitor
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30">
          OPERATOR: {user.username.toUpperCase()}
        </span>
      </div>

      {/* Admin Sub-Nav Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-arena-surface rounded-2xl border border-arena-border scrollbar-none">
        {adminNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `px-4 py-2.5 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-gold-glow'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Rendered Admin Page */}
      <div className="min-h-[500px]">
        <Outlet />
      </div>
    </div>
  );
};
