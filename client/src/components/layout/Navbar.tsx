import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { useThemeStore } from '../../stores/themeStore';
import { Button } from '../ui/Button';
import { DepositModal } from '../wallet/DepositModal';
import {
  Gamepad2,
  Trophy,
  Wallet,
  User,
  Shield,
  LogOut,
  Plus,
  Flame,
  Sparkles,
  Bomb,
  BookOpen,
  Sun,
  Moon,
  Play,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { balance } = useWalletStore();
  const { theme, toggleTheme } = useThemeStore();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    setIsProfileMenuOpen(false);
    navigate('/');
  };

  const navLinks = [
    { path: '/lobby', label: 'Game Lobby', icon: <Gamepad2 className="w-4 h-4" /> },
    { path: '/horserace', label: '🐎 Derby', icon: <span className="text-sm">🐎</span> },
    { path: '/mines', label: '💣 Mines', icon: <Bomb className="w-4 h-4 text-emerald-400" /> },
    { path: '/aviator', label: '🚀 Aviator', icon: <Play className="w-4 h-4 text-rose-500" /> },
    { path: '/keno', label: '🎰 Keno 80', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
    { path: '/plinko', label: '🎯 Plinko', icon: <Flame className="w-4 h-4 text-orange-500" /> },
    { path: '/leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { path: '/how-it-works', label: 'Rules & Guide', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-arena-border backdrop-blur-2xl transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group select-none">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-arena-glow group-hover:scale-105 transition-transform duration-300">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-display font-black text-2xl text-white">
                    D
                  </div>
                </div>
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-xl md:text-2xl tracking-wider text-arena-text">
                    DAGI<span className="gradient-text-primary ml-1">BINGO</span>
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-500 uppercase block -mt-1">
                  LIVE MULTIPLAYER
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider font-display transition-all duration-200 flex items-center gap-2 ${
                      active
                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                        : 'text-arena-muted hover:text-arena-text hover:bg-indigo-500/10'
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}

              {user?.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider font-display transition-all duration-200 flex items-center gap-2 ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 shadow-gold-glow'
                      : 'text-amber-600 dark:text-amber-400/90 hover:text-amber-500 hover:bg-amber-500/10 border border-amber-500/20'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Admin Suite
                </Link>
              )}
            </nav>

            {/* Right Action Controls */}
            <div className="flex items-center gap-3">
              {/* Cream / Dark Mode Theme Switcher */}
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-2xl bg-arena-surface border border-arena-border hover:border-amber-500/50 flex items-center justify-center text-arena-text transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                title={theme === 'bright' ? 'Switch to Dark Arena Mode' : 'Switch to Warm Cream Mode'}
                aria-label="Toggle Theme"
              >
                {theme === 'bright' ? (
                  <Sun className="w-5 h-5 text-amber-500 fill-amber-500/20 animate-spin-slow" />
                ) : (
                  <Moon className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
                )}
              </button>

              {isAuthenticated ? (
                <>
                  {/* Live Wallet Chip */}
                  <div className="flex items-center bg-arena-surface border border-arena-border rounded-2xl p-1 shadow-sm">
                    <Link
                      to="/wallet"
                      className="flex items-center gap-2 px-3 py-1.5 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                        <Wallet className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] font-bold text-arena-subtle block uppercase leading-none">
                          DEMO ETB
                        </span>
                        <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 leading-none">
                          {balance ? balance.availableBalance.toLocaleString() : '0.00'}
                        </span>
                      </div>
                    </Link>

                    <button
                      onClick={() => setIsDepositOpen(true)}
                      className="w-8 h-8 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-accent-glow cursor-pointer ml-1"
                      title="Quick Deposit Virtual Credits"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>

                  {/* Profile Menu Trigger */}
                  <div className="relative">
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center gap-2 p-1.5 rounded-2xl bg-arena-surface border border-arena-border hover:border-indigo-500/40 transition-all cursor-pointer shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-display font-black text-xs text-white shadow-sm">
                        {user?.username?.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="hidden lg:block text-xs font-bold text-arena-text pr-2">
                        {user?.username}
                      </span>
                    </button>

                    {/* Profile Dropdown Menu */}
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-3 w-56 glass-panel-elevated rounded-2xl p-2 border border-arena-border shadow-2xl animate-pop-in z-50">
                        <div className="px-3 py-2 border-b border-arena-border mb-1">
                          <span className="text-xs font-bold text-arena-text block">{user?.username}</span>
                          <span className="text-[10px] text-arena-muted truncate block">{user?.email}</span>
                        </div>

                        {user?.role === 'ADMIN' ? (
                          <Link
                            to="/admin"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          >
                            <Shield className="w-4 h-4 text-amber-500" />
                            Admin Dashboard
                          </Link>
                        ) : (
                          <Link
                            to="/dashboard"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-arena-muted hover:text-arena-text hover:bg-indigo-500/10 transition-colors"
                          >
                            <Gamepad2 className="w-4 h-4 text-indigo-500" />
                            Player Dashboard
                          </Link>
                        )}

                        <Link
                          to="/profile"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-arena-muted hover:text-arena-text hover:bg-indigo-500/10 transition-colors"
                        >
                          <User className="w-4 h-4 text-emerald-500" />
                          Profile & Verification
                        </Link>

                        <Link
                          to="/wallet"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-arena-muted hover:text-arena-text hover:bg-indigo-500/10 transition-colors"
                        >
                          <Wallet className="w-4 h-4 text-amber-500" />
                          Virtual Ledger & Wallet
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors mt-1 border-t border-arena-border cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="outline" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="accent" size="sm">
                      Join Free
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
    </>
  );
};
