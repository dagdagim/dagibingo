import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameRoomSummary } from '@bingo/shared';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { BingoBall } from '../../components/bingo/BingoBall';
import {
  Sparkles,
  Gamepad2,
  Trophy,
  ShieldCheck,
  Zap,
  Volume2,
  Users,
  ArrowRight,
  Flame,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [featuredGames, setFeaturedGames] = useState<GameRoomSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const data = await api.get<GameRoomSummary[]>('/games');
        setFeaturedGames(data.slice(0, 3));
      } catch {
        // Handled silently
      } finally {
        setIsLoading(false);
      }
    };
    fetchGames();
  }, []);

  return (
    <div className="space-y-20 pb-20 overflow-hidden">
      {/* Hero Section with 3D Balls Ambient Float */}
      <section className="relative pt-12 md:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Background Glowing Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-pink-500/15 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-emerald-500/15 rounded-full blur-[90px] pointer-events-none" />

        {/* Live Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-indigo-400/30 text-indigo-600 dark:text-indigo-300 text-xs font-bold font-display uppercase tracking-widest mb-6 shadow-arena-glow">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Real-Time Multiplayer 75-Ball Arena</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-display tracking-tight text-arena-text max-w-4xl mx-auto leading-[1.1]">
          YOUR LUCK. <span className="gradient-text-rainbow">YOUR MOMENT.</span> <br />
          YOUR BINGO.
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg text-arena-muted max-w-2xl mx-auto font-normal leading-relaxed">
          Experience ultra-fast real-time multiplayer 75-ball Bingo with authoritative server validation, Web Speech voice number calling, and interactive 5x5 daubing cards.
        </p>

        {/* Floating 3D Spheres Showcase */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 my-10 py-4">
          <div className="animate-float" style={{ animationDelay: '0s' }}>
            <BingoBall ball={{ letter: 'B', number: 7 }} size="lg" />
          </div>
          <div className="animate-float" style={{ animationDelay: '0.6s' }}>
            <BingoBall ball={{ letter: 'I', number: 24 }} size="lg" />
          </div>
          <div className="animate-float scale-110" style={{ animationDelay: '1.2s' }}>
            <BingoBall ball={{ letter: 'N', number: 38 }} size="xl" isNew />
          </div>
          <div className="animate-float" style={{ animationDelay: '1.8s' }}>
            <BingoBall ball={{ letter: 'G', number: 52 }} size="lg" />
          </div>
          <div className="animate-float" style={{ animationDelay: '2.4s' }}>
            <BingoBall ball={{ letter: 'O', number: 71 }} size="lg" />
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <Link to="/lobby" className="w-full sm:w-auto">
            <Button
              variant="accent"
              size="lg"
              fullWidth
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="text-base"
            >
              Enter Game Lobby
            </Button>
          </Link>
          <Link to="/how-it-works" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" fullWidth className="text-base">
              How It Works
            </Button>
          </Link>
        </div>

        {/* Metric Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto">
          <div className="p-4 rounded-2xl glass-panel text-center">
            <span className="text-2xl font-black font-display gradient-text-primary block">75-BALL</span>
            <span className="text-xs text-arena-muted uppercase font-bold">Classic Standard</span>
          </div>
          <div className="p-4 rounded-2xl glass-panel text-center">
            <span className="text-2xl font-black font-display gradient-text-accent block">&lt;10ms</span>
            <span className="text-xs text-arena-muted uppercase font-bold">WebSocket Sync</span>
          </div>
          <div className="p-4 rounded-2xl glass-panel text-center">
            <span className="text-2xl font-black font-display gradient-text-gold block">100%</span>
            <span className="text-xs text-arena-muted uppercase font-bold">Authoritative RNG</span>
          </div>
          <div className="p-4 rounded-2xl glass-panel text-center">
            <span className="text-2xl font-black font-display text-pink-500 block">VOICE</span>
            <span className="text-xs text-arena-muted uppercase font-bold">Speech Caller</span>
          </div>
        </div>
      </section>

      {/* Featured Live Game Rooms */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                LIVE ARENA ACTION
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-display text-arena-text">
              Featured Game Rooms
            </h2>
          </div>

          <Link to="/lobby">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              View All Active Rooms
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredGames.map((game) => (
            <Card
              key={game.id}
              elevated
              interactive
              glow="primary"
              className="p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant={game.status === 'LIVE' ? 'accent' : 'primary'} dot={game.status === 'LIVE'}>
                    {game.status}
                  </Badge>
                  <span className="text-xs font-mono font-bold text-arena-subtle">
                    #{game.code}
                  </span>
                </div>

                <h3 className="text-xl font-black font-display text-arena-text mb-1">{game.title}</h3>
                <p className="text-xs text-arena-muted">
                  Pattern Rule: <strong className="text-indigo-600 dark:text-indigo-300">{game.pattern}</strong> • Speed: <strong className="text-indigo-600 dark:text-indigo-300">{game.speed}</strong>
                </p>

                {/* Prize Pool Spotlight */}
                <div className="my-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-400/30">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                    Total Prize Pool
                  </span>
                  <div className="text-2xl font-black font-mono gradient-text-gold">
                    {game.prizePool.toLocaleString()} ETB
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-arena-border">
                <div className="flex items-center justify-between text-xs font-semibold text-arena-muted">
                  <span>Entry Fee: <strong className="text-arena-text font-mono">{game.entryFee} ETB</strong></span>
                  <span>Players: <strong className="text-emerald-500 font-mono">{game.currentPlayers} / {game.maxPlayers}</strong></span>
                </div>

                <Link to={`/games/${game.id}`} className="block">
                  <Button variant="primary" size="md" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Enter Room
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="accent">Engineered For Champions</Badge>
          <h2 className="text-3xl sm:text-4xl font-black font-display text-arena-text mt-2">
            Why Players Love Dagi Bingo
          </h2>
          <p className="text-xs sm:text-sm text-arena-muted mt-2">
            State-of-the-art gaming engineering delivering the thrill of real Bingo from anywhere.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card elevated glow="cyan" className="p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-cyan-glow">
              <Volume2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black font-display text-arena-text">Voice Number Calling</h3>
            <p className="text-xs text-arena-muted leading-relaxed">
              Integrated Web Speech announcer calls numbers in real time with phonetic clarity like a professional Bingo hall caller.
            </p>
          </Card>

          <Card elevated glow="primary" className="p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-arena-glow">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black font-display text-arena-text">Authoritative RNG</h3>
            <p className="text-xs text-arena-muted leading-relaxed">
              Zero-duplicate 75-ball shuffling and atomic server verification guarantees that every win claim is validated on the backend.
            </p>
          </Card>

          <Card elevated glow="accent" className="p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-accent-glow">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black font-display text-arena-text">Multiplayer Live Chat</h3>
            <p className="text-xs text-arena-muted leading-relaxed">
              Cheer on your rivals, drop emoji reactions, celebrate winning calls, and enjoy the community spirit in every live room.
            </p>
          </Card>
        </div>
      </section>

      {/* Compliance & Sandbox Mode Disclaimer */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-6 rounded-3xl border border-indigo-500/20 flex flex-col md:flex-row items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1 text-center md:text-left flex-1">
            <h4 className="text-sm font-black font-display text-arena-text uppercase tracking-wider">
              Sandbox Demo Gaming Environment
            </h4>
            <p className="text-xs text-arena-muted leading-relaxed">
              Dagi Bingo operates strictly in <strong className="text-indigo-600 dark:text-indigo-300">DEMO MODE</strong> with simulated virtual ETB test credits. No real financial risk is involved. Designed with double-entry ledgers, KYC identity verification, and responsible gaming limits.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
