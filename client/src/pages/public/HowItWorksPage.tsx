import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import {
  Gamepad2,
  Trophy,
  Volume2,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const HowItWorksPage: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Pick Your Arena & Buy Cards',
      desc: 'Browse live multiplayer rooms in the Lobby. Select how many 5x5 certified cards (1 to 4) you want to play with.',
      badge: 'Step 1',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      num: '02',
      title: 'Listen to the Voice Caller',
      desc: 'Our real-time Web Speech announcer calls out numbers (B 12, I 24, N 38...) synchronized live via WebSockets.',
      badge: 'Step 2',
      color: 'from-indigo-500 to-purple-600',
    },
    {
      num: '03',
      title: 'Daub Your Numbers',
      desc: 'Click the called numbers on your 5x5 card or enable ⚡ Auto-Daub to mark matching numbers instantly.',
      badge: 'Step 3',
      color: 'from-pink-500 to-rose-600',
    },
    {
      num: '04',
      title: 'Hit BINGO & Win the Prize',
      desc: 'Complete the winning pattern (Classic line, Full House, Four Corners, X-Pattern) and smash the BINGO button to claim the prize pool.',
      badge: 'Step 4',
      color: 'from-amber-400 to-yellow-500',
    },
  ];

  const patterns = [
    { name: 'CLASSIC', desc: 'Any single completed horizontal row, vertical column, or diagonal line.' },
    { name: 'FULL HOUSE', desc: 'Cover all 24 numbered squares plus the center FREE star space (Blackout).' },
    { name: 'FOUR CORNERS', desc: 'Daub all 4 outer corner tiles (Top-Left, Top-Right, Bottom-Left, Bottom-Right).' },
    { name: 'X-PATTERN', desc: 'Complete both intersecting diagonal lines creating a large golden X.' },
    { name: 'SPEED BINGO', desc: 'Turbo-charged ball draws every 2.5 seconds for adrenaline-fueled action.' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <Badge variant="accent">Master The Game</Badge>
        <h1 className="text-4xl md:text-5xl font-black font-display text-arena-text tracking-tight">
          How to Play & Win
        </h1>
        <p className="text-xs sm:text-sm text-arena-muted">
          Your complete guide to real-time multiplayer 75-ball Dagi Bingo rules and winning patterns.
        </p>
      </div>

      {/* 4 Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step) => (
          <Card key={step.num} elevated glow="primary" className="p-6 relative overflow-hidden">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${step.color} flex items-center justify-center font-black font-mono text-slate-950 text-xl shadow-lg mb-4`}>
              {step.num}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-display block mb-1">
              {step.badge}
            </span>
            <h3 className="text-lg font-black font-display text-arena-text mb-2">{step.title}</h3>
            <p className="text-xs text-arena-muted leading-relaxed">{step.desc}</p>
          </Card>
        ))}
      </div>

      {/* Winning Patterns Section */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <Badge variant="gold">Rules of Victory</Badge>
          <h2 className="text-3xl font-black font-display text-arena-text mt-2">
            Winning Pattern Variations
          </h2>
          <p className="text-xs text-arena-muted mt-1">
            Different game rooms feature distinct winning criteria.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {patterns.map((pat) => (
            <Card key={pat.name} elevated className="p-5 border-arena-border space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-black font-display text-arena-text">{pat.name}</h4>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xs text-arena-muted leading-relaxed">{pat.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Footer Card */}
      <Card elevated glow="accent" className="p-8 md:p-12 text-center max-w-3xl mx-auto border-emerald-500/30">
        <h3 className="text-2xl md:text-3xl font-black font-display text-arena-text mb-2">
          Ready to Test Your Luck in the Arena?
        </h3>
        <p className="text-xs sm:text-sm text-arena-muted max-w-md mx-auto mb-6">
          Join thousands of players live right now. Free 1,000 ETB starting demo credits included!
        </p>
        <Link to="/lobby">
          <Button variant="accent" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
            Enter Game Lobby Now
          </Button>
        </Link>
      </Card>
    </div>
  );
};
