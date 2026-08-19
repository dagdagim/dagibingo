import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Gamepad2,
  Wallet,
  Sparkles,
  Play,
  Flame,
  Bomb,
  Menu,
  X,
  Trophy,
  BookOpen,
  User,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export const MobileNav: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainLinks = [
    { label: 'Lobby', path: '/lobby', icon: <Gamepad2 className="w-5 h-5" /> },
    { label: 'Hounds', path: '/greyhound', icon: <span className="text-xl">🐕</span> },
    { label: 'Derby', path: '/horserace', icon: <span className="text-xl">🐎</span> },
    { label: 'Mines', path: '/mines', icon: <Bomb className="w-5 h-5 text-emerald-400" /> },
    { label: 'Wallet', path: isAuthenticated ? '/wallet' : '/login', icon: <Wallet className="w-5 h-5 text-emerald-400" /> },
  ];

  return (
    <>
      {/* Floating Bottom Glassmorphic Mobile Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 dark:bg-slate-950/90 backdrop-blur-2xl border-t border-arena-border px-3 py-2 flex items-center justify-around shadow-2xl safe-area-bottom">
        {mainLinks.map((link) => (
          <NavLink
            key={link.label}
            to={link.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-amber-400 font-black scale-105 bg-amber-500/15 border border-amber-500/30 shadow-md shadow-amber-500/15'
                  : 'text-arena-muted hover:text-arena-text'
              }`
            }
          >
            {link.icon}
            <span className="text-[10px] font-black uppercase tracking-wider font-display">
              {link.label}
            </span>
          </NavLink>
        ))}

        {/* More Options Drawer Trigger */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl text-arena-muted hover:text-arena-text transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5 text-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-wider font-display">More</span>
        </button>
      </div>

      {/* More Games & Navigation Drawer */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-md lg:hidden">
          <div className="w-full glass-panel-elevated rounded-t-3xl p-5 border-t border-arena-border shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between border-b border-arena-border pb-3">
              <span className="text-sm font-black uppercase tracking-wider font-display text-arena-text">
                Arena Navigation & Games
              </span>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1 hover:bg-arena-surface rounded-xl text-arena-muted hover:text-arena-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instant Games Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/towers"
                onClick={() => setIsMoreOpen(false)}
                className="p-3 bg-arena-surface rounded-2xl border border-arena-border flex items-center gap-2.5 hover:border-yellow-400 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                  <span className="text-base">🏰</span>
                </div>
                <div>
                  <span className="text-xs font-black text-arena-text block">Towers</span>
                  <span className="text-[9px] text-arena-muted">Floor Climb</span>
                </div>
              </Link>

              <Link
                to="/limbo"
                onClick={() => setIsMoreOpen(false)}
                className="p-3 bg-arena-surface rounded-2xl border border-arena-border flex items-center gap-2.5 hover:border-rose-400 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <span className="text-base">🚀</span>
                </div>
                <div>
                  <span className="text-xs font-black text-arena-text block">Limbo</span>
                  <span className="text-[9px] text-arena-muted">Target Roller</span>
                </div>
              </Link>

              <Link
                to="/aviator"
                onClick={() => setIsMoreOpen(false)}
                className="p-3 bg-arena-surface rounded-2xl border border-arena-border flex items-center gap-2.5 hover:border-rose-400 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <Play className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                </div>
                <div>
                  <span className="text-xs font-black text-arena-text block">Aviator</span>
                  <span className="text-[9px] text-arena-muted">Crash Curve</span>
                </div>
              </Link>

              <Link
                to="/keno"
                onClick={() => setIsMoreOpen(false)}
                className="p-3 bg-arena-surface rounded-2xl border border-arena-border flex items-center gap-2.5 hover:border-amber-400 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-arena-text block">Keno 80</span>
                  <span className="text-[9px] text-arena-muted">Instant Draws</span>
                </div>
              </Link>

              <Link
                to="/plinko"
                onClick={() => setIsMoreOpen(false)}
                className="p-3 bg-arena-surface rounded-2xl border border-arena-border flex items-center gap-2.5 hover:border-orange-400 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-arena-text block">Plinko</span>
                  <span className="text-[9px] text-arena-muted">Physics Arcade</span>
                </div>
              </Link>

              <Link
                to="/chickenroad"
                onClick={() => setIsMoreOpen(false)}
                className="p-3 bg-arena-surface rounded-2xl border border-arena-border flex items-center gap-2.5 hover:border-green-400 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
                  <span className="text-base">🐔</span>
                </div>
                <div>
                  <span className="text-xs font-black text-arena-text block">Chicken</span>
                  <span className="text-[9px] text-arena-muted">Road Crossing</span>
                </div>
              </Link>

              <Link
                to="/leaderboard"
                onClick={() => setIsMoreOpen(false)}
                className="p-3 bg-arena-surface rounded-2xl border border-arena-border flex items-center gap-2.5 hover:border-indigo-400 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-arena-text block">Rankings</span>
                  <span className="text-[9px] text-arena-muted">Leaderboards</span>
                </div>
              </Link>

              <Link
                to="/how-it-works"
                onClick={() => setIsMoreOpen(false)}
                className="p-3 bg-arena-surface rounded-2xl border border-arena-border flex items-center gap-2.5 hover:border-emerald-400 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-arena-text block">Rules</span>
                  <span className="text-[9px] text-arena-muted">How to Play</span>
                </div>
              </Link>
            </div>

            {/* Profile & Account Links */}
            {isAuthenticated && (
              <div className="pt-2 border-t border-arena-border space-y-2">
                <Link
                  to="/profile"
                  onClick={() => setIsMoreOpen(false)}
                  className="p-3 bg-arena-surface rounded-2xl border border-arena-border flex items-center justify-between text-xs font-bold text-arena-text"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>My Profile & KYC</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {user?.username}
                  </span>
                </Link>

                {user?.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMoreOpen(false)}
                    className="p-3 bg-amber-500/15 rounded-2xl border border-amber-500/30 flex items-center gap-2.5 text-xs font-black text-amber-300"
                  >
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Admin Control Center</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
