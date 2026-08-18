import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Gamepad2, Zap, Wallet, Trophy } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export const MobileNav: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  const links = [
    { label: 'Home', path: '/', icon: <Home className="w-5 h-5" /> },
    { label: 'Bingo', path: '/lobby', icon: <Gamepad2 className="w-5 h-5" /> },
    { label: 'Keno 80', path: '/keno', icon: <Zap className="w-5 h-5 text-amber-500" /> },
    { label: 'Wallet', path: isAuthenticated ? '/wallet' : '/login', icon: <Wallet className="w-5 h-5" /> },
    { label: 'Ranks', path: '/leaderboard', icon: <Trophy className="w-5 h-5" /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-arena-bg/95 backdrop-blur-lg border-t border-arena-border px-3 py-2 flex items-center justify-around shadow-2xl">
      {links.map((link) => (
        <NavLink
          key={link.label}
          to={link.path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              isActive
                ? 'text-arena-primary font-bold'
                : 'text-arena-muted hover:text-arena-text'
            }`
          }
        >
          {link.icon}
          <span className="text-[10px] font-semibold uppercase tracking-wider">{link.label}</span>
        </NavLink>
      ))}
    </div>
  );
};
