import React, { useState, useRef, useEffect } from 'react';
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
  ChevronDown,
  History,
  Layers,
  Zap,
  Rocket,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { balance } = useWalletStore();
  const { theme, toggleTheme } = useThemeStore();

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isGamesDropdownOpen, setIsGamesDropdownOpen] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const gamesDropdownRef = useRef<HTMLDivElement | null>(null);

  const isActive = (path: string) => location.pathname === path;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (gamesDropdownRef.current && !gamesDropdownRef.current.contains(event.target as Node)) {
        setIsGamesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsProfileMenuOpen(false);
    navigate('/');
  };

  const gameCategories = [
    {
      category: '⚡ Instant Arcade',
      games: [
        {
          path: '/chicken',
          label: 'Dagi Chicken Run',
          badge: 'NEW 97%',
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          icon: <span className="text-lg">🐔</span>,
          desc: 'Cross highway lanes, avoid barbecue grills & win golden eggs',
          multiplier: 'Up to 995×',
        },
        {
          path: '/towers',
          label: 'Dagi Towers',
          badge: '97% RTP',
          badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          icon: <span className="text-lg">🏰</span>,
          desc: 'Climb 9 floors, avoid skulls and cash out anytime',
          multiplier: 'Up to 258k×',
        },
        {
          path: '/limbo',
          label: 'Dagi Limbo',
          badge: '98% RTP',
          badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
          icon: <Rocket className="w-5 h-5 text-rose-500" />,
          desc: 'Instant multiplier target game with auto bot',
          multiplier: 'Up to 1.0M×',
        },
        {
          path: '/mines',
          label: 'Dagi Mines',
          badge: '97% RTP',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          icon: <Bomb className="w-5 h-5 text-emerald-400" />,
          desc: '5×5 Provably Fair grid, safe diamonds & cashouts',
          multiplier: 'Up to 5.1M×',
        },
        {
          path: '/plinko',
          label: 'Plinko Arcade',
          badge: 'PHYSICS',
          badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
          icon: <Flame className="w-5 h-5 text-orange-400" />,
          desc: 'Drop physics balls down the pegboard pyramid',
          multiplier: 'Up to 1000×',
        },
      ],
    },
    {
      category: '🏁 Virtual Racing & Multiplayer',
      games: [
        {
          path: '/greyhound',
          label: 'Dagi Hounds',
          badge: 'SAND TURF',
          badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
          icon: <span className="text-lg">🐕</span>,
          desc: 'Greyhound racing & mechanical lure chasing',
          multiplier: 'Up to 250×',
        },
        {
          path: '/horserace',
          label: 'Dagi Derby',
          badge: 'LIVE TURF',
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          icon: <span className="text-lg">🐎</span>,
          desc: 'Multiplayer thoroughbred horse racing simulation',
          multiplier: 'Up to 250×',
        },
        {
          path: '/aviator',
          label: 'Aviator Crash',
          badge: 'MULTIPLAYER',
          badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
          icon: <Play className="w-5 h-5 text-rose-500 fill-rose-500/20" />,
          desc: 'Cash out before the rocket plane flies away',
          multiplier: 'Up to 1000×',
        },
        {
          path: '/keno',
          label: 'Keno 80',
          badge: 'LOTTERY',
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          icon: <Sparkles className="w-5 h-5 text-amber-400" />,
          desc: 'Pick your lucky numbers in rapid 80-ball draws',
          multiplier: 'Up to 10,000×',
        },
      ],
    },
  ];

  const quickChips = [
    { path: '/chicken', label: 'Chicken', icon: <span>🐔</span>, activeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    { path: '/towers', label: 'Towers', icon: <span>🏰</span>, activeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
    { path: '/limbo', label: 'Limbo', icon: <Rocket className="w-3.5 h-3.5 text-rose-500" />, activeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
    { path: '/greyhound', label: 'Hounds', icon: <span>🐕</span>, activeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
    { path: '/horserace', label: 'Derby', icon: <span>🐎</span>, activeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    { path: '/mines', label: 'Mines', icon: <Bomb className="w-3.5 h-3.5 text-emerald-400" />, activeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-arena-border backdrop-blur-2xl transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* 1. BRAND LOGO */}
            <Link to="/" className="flex items-center gap-3 group select-none flex-shrink-0">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-500 to-rose-500 p-0.5 shadow-arena-glow group-hover:scale-105 transition-transform duration-300">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-display font-black text-2xl text-white">
                    D
                  </div>
                </div>
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-xl md:text-2xl tracking-wider text-arena-text">
                    DAGI<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-rose-500 ml-1">ARENA</span>
                  </span>
                </div>
                <span className="text-[9px] font-mono font-black tracking-widest text-emerald-400 uppercase block -mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                  PROVABLY FAIR CASINO
                </span>
              </div>
            </Link>

            {/* 2. DESKTOP NAVIGATION */}
            <nav className="hidden lg:flex items-center gap-1.5">
              {/* Lobby */}
              <Link
                to="/lobby"
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider font-display transition-all duration-200 flex items-center gap-1.5 ${
                  isActive('/lobby')
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-arena-muted hover:text-arena-text hover:bg-arena-surface'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
                Lobby
              </Link>

              {/* Games Categorized Mega Dropdown */}
              <div className="relative" ref={gamesDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsGamesDropdownOpen(!isGamesDropdownOpen)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider font-display transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    ['/towers', '/limbo', '/greyhound', '/horserace', '/mines', '/aviator', '/keno', '/plinko'].includes(location.pathname)
                      ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-arena-muted hover:text-arena-text hover:bg-arena-surface'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>All Games (8)</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      isGamesDropdownOpen ? 'rotate-180 text-amber-400' : 'text-arena-muted'
                    }`}
                  />
                </button>

                {/* Categorized Mega Menu Popover */}
                {isGamesDropdownOpen && (
                  <div className="absolute left-0 mt-3 w-[650px] glass-panel-elevated rounded-3xl p-4 border border-arena-border shadow-2xl animate-pop-in z-50 space-y-3">
                    <div className="px-2 py-1 border-b border-arena-border/60 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-arena-muted font-display">
                        OFFICIAL PROVABLY FAIR CATALOG
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">8 LIVE GAMES</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {gameCategories.map((cat) => (
                        <div key={cat.category} className="space-y-1.5">
                          <span className="text-[11px] font-black uppercase font-display text-arena-text block px-2">
                            {cat.category}
                          </span>
                          <div className="space-y-1">
                            {cat.games.map((game) => (
                              <Link
                                key={game.path}
                                to={game.path}
                                onClick={() => setIsGamesDropdownOpen(false)}
                                className={`flex items-center justify-between p-2 rounded-2xl transition-all duration-200 group ${
                                  isActive(game.path)
                                    ? 'bg-amber-500/15 border border-amber-500/30'
                                    : 'hover:bg-arena-surface border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-arena-surface border border-arena-border flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                                    {game.icon}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-black font-display text-arena-text group-hover:text-amber-400 transition-colors">
                                        {game.label}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded-md text-[8.5px] font-black font-mono border ${game.badgeColor}`}
                                      >
                                        {game.badge}
                                      </span>
                                    </div>
                                    <span className="text-[9.5px] text-arena-muted line-clamp-1 block">
                                      {game.desc}
                                    </span>
                                  </div>
                                </div>

                                <span className="text-[9.5px] font-mono font-black text-amber-400">
                                  {game.multiplier}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-arena-border/60">
                      <Link
                        to="/lobby"
                        onClick={() => setIsGamesDropdownOpen(false)}
                        className="w-full py-2 bg-arena-surface hover:bg-arena-highlight text-center block rounded-xl text-[11px] font-black uppercase text-arena-muted hover:text-arena-text transition-colors font-display"
                      >
                        Explore All Arenas & Custom Rooms →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Quick-Access Chips */}
              <div className="hidden xl:flex items-center gap-1">
                {quickChips.map((chip) => (
                  <Link
                    key={chip.path}
                    to={chip.path}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider font-display transition-all duration-200 flex items-center gap-1.5 ${
                      isActive(chip.path)
                        ? `${chip.activeColor} shadow-sm`
                        : 'text-arena-muted hover:text-arena-text hover:bg-arena-surface'
                    }`}
                  >
                    {chip.icon}
                    <span>{chip.label}</span>
                  </Link>
                ))}
              </div>

              {/* Leaderboard */}
              <Link
                to="/leaderboard"
                className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider font-display transition-all duration-200 flex items-center gap-1.5 ${
                  isActive('/leaderboard')
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-arena-muted hover:text-arena-text hover:bg-arena-surface'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                Rankings
              </Link>

              {/* Guide */}
              <Link
                to="/how-it-works"
                className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider font-display transition-all duration-200 flex items-center gap-1.5 ${
                  isActive('/how-it-works')
                    ? 'bg-arena-surface text-arena-text border border-arena-border'
                    : 'text-arena-muted hover:text-arena-text hover:bg-arena-surface'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Guide
              </Link>

              {/* Admin Hub */}
              {user?.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider font-display transition-all duration-200 flex items-center gap-1.5 ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-gold-glow'
                      : 'text-amber-400 hover:bg-amber-500/10 border border-amber-500/20'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  Admin
                </Link>
              )}
            </nav>

            {/* 3. RIGHT ACTION CONTROLS */}
            <div className="flex items-center gap-2.5">
              {/* Theme Switcher */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-10 h-10 rounded-2xl bg-arena-surface border border-arena-border hover:border-amber-500/50 flex items-center justify-center text-arena-text transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
                title={theme === 'bright' ? 'Switch to Dark Arena Mode' : 'Switch to Warm Cream Mode'}
                aria-label="Toggle Theme"
              >
                {theme === 'bright' ? (
                  <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20 animate-spin-slow" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
                )}
              </button>

              {isAuthenticated ? (
                <>
                  {/* Live Wallet Balance Chip */}
                  <div className="flex items-center bg-arena-surface border border-arena-border rounded-2xl p-1 shadow-sm">
                    <Link
                      to="/wallet"
                      className="flex items-center gap-2 px-3 py-1 hover:opacity-85 transition-opacity"
                    >
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                        <Wallet className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] font-black text-arena-muted block uppercase leading-none font-mono">
                          ETB BALANCE
                        </span>
                        <span className="font-mono font-black text-sm text-emerald-400 leading-none">
                          {balance ? balance.availableBalance.toLocaleString() : '0.00'}
                        </span>
                      </div>
                    </Link>

                    {/* Quick Deposit Plus Button */}
                    <button
                      type="button"
                      onClick={() => setIsDepositOpen(true)}
                      className="w-8 h-8 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 font-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-accent-glow cursor-pointer ml-1"
                      title="Quick Deposit Virtual Credits"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>

                  {/* Profile Menu Trigger */}
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center gap-2 p-1.5 rounded-2xl bg-arena-surface border border-arena-border hover:border-amber-500/40 transition-all cursor-pointer shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-purple-600 to-rose-500 flex items-center justify-center font-display font-black text-xs text-white shadow-md">
                        {user?.username?.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="hidden xl:block text-xs font-black text-arena-text pr-1 font-display">
                        {user?.username}
                      </span>
                    </button>

                    {/* Profile Dropdown Menu */}
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-3 w-60 glass-panel-elevated rounded-3xl p-2.5 border border-arena-border shadow-2xl animate-pop-in z-50 space-y-1">
                        <div className="px-3 py-2.5 border-b border-arena-border mb-1 bg-arena-surface/60 rounded-2xl">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-arena-text block font-display">
                              {user?.username}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-black font-mono ${
                                user?.role === 'ADMIN'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {user?.role === 'ADMIN' ? 'ADMIN' : 'PRO PLAYER'}
                            </span>
                          </div>
                          <span className="text-[10px] text-arena-muted truncate block font-mono">
                            {user?.email}
                          </span>
                        </div>

                        {user?.role === 'ADMIN' && (
                          <Link
                            to="/admin"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-amber-400 hover:bg-amber-500/10 transition-colors"
                          >
                            <Shield className="w-4 h-4 text-amber-400" />
                            Admin Control Hub
                          </Link>
                        )}

                        <Link
                          to="/dashboard"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-arena-muted hover:text-arena-text hover:bg-arena-surface transition-colors"
                        >
                          <Gamepad2 className="w-4 h-4 text-indigo-400" />
                          Player Dashboard
                        </Link>

                        <Link
                          to="/wallet"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-arena-muted hover:text-arena-text hover:bg-arena-surface transition-colors"
                        >
                          <Wallet className="w-4 h-4 text-emerald-400" />
                          Ledger & Transactions
                        </Link>

                        <Link
                          to="/history"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-arena-muted hover:text-arena-text hover:bg-arena-surface transition-colors"
                        >
                          <History className="w-4 h-4 text-amber-400" />
                          Bingo Round History
                        </Link>

                        <Link
                          to="/profile"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-arena-muted hover:text-arena-text hover:bg-arena-surface transition-colors"
                        >
                          <User className="w-4 h-4 text-rose-400" />
                          Profile & Security
                        </Link>

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-black text-rose-400 hover:bg-rose-500/10 transition-colors mt-1 border-t border-arena-border cursor-pointer"
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
