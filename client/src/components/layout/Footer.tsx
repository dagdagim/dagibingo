import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Code, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full glass-panel border-t border-arena-border mt-20 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 p-0.5 shadow-arena-glow">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-display font-black text-white text-base">
                  D
                </div>
              </div>
              <span className="font-display font-black text-lg text-arena-text">
                DAGI<span className="gradient-text-primary ml-0.5">BINGO</span>
              </span>
            </Link>
            <p className="text-xs text-arena-muted leading-relaxed">
              The premier real-time multiplayer 75-ball Bingo platform. Real-time audio calling, provably fair RNG, and live multiplayer competition.
            </p>
            
            {/* Developer Credits Badge */}
            <div className="pt-2">
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-arena-text">
                  <Code className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Developed by <strong className="text-indigo-600 dark:text-indigo-400">Tobiya</strong></span>
                </div>
                <div className="text-[11px] text-arena-muted flex items-center gap-1">
                  <span>Developer:</span>
                  <a
                    href="https://dagimbekelebunera.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-0.5 transition-colors"
                  >
                    Dagim Bekele
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-arena-text font-display mb-3">
              Explore Dagi Bingo
            </h4>
            <ul className="space-y-2 text-xs text-arena-muted">
              <li>
                <Link to="/lobby" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Game Lobby
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Hall of Champions
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  How to Play & Rules
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Game Patterns */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-arena-text font-display mb-3">
              Winning Patterns
            </h4>
            <ul className="space-y-2 text-xs text-arena-muted">
              <li>Classic Line & Column</li>
              <li>Full House Blackout</li>
              <li>Four Corners Blitz</li>
              <li>X-Pattern Cross</li>
              <li>Turbo Speed Bingo</li>
            </ul>
          </div>

          {/* Compliance & Responsible Gaming */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-arena-text font-display mb-3">
              Responsible Gaming
            </h4>
            <p className="text-xs text-arena-muted leading-relaxed">
              18+ Only. Practice responsible play. Set daily deposit and session limits in your profile settings.
            </p>
            <div className="flex items-center gap-2 pt-1 text-emerald-500 text-xs font-bold font-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>DEMO MODE ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright & developer attribution */}
        <div className="pt-8 border-t border-arena-border flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-arena-subtle font-medium">
          <p>
            © {new Date().getFullYear()} DAGI BINGO. All rights reserved. Developed by <span className="font-bold text-arena-text">Tobiya</span> • Developer <a href="https://dagimbekelebunera.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Dagim Bekele</a>
          </p>
          <div className="flex items-center gap-4">
            <Link to="/how-it-works" className="hover:text-arena-text transition-colors">
              Rules
            </Link>
            <Link to="/faq" className="hover:text-arena-text transition-colors">
              Support
            </Link>
            <a href="https://dagimbekelebunera.vercel.app/" target="_blank" rel="noopener noreferrer" className="font-mono text-indigo-500 hover:underline font-bold">
              dagimbekelebunera.vercel.app
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
