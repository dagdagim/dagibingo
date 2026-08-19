import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GameCategory, GameRoomSummary, GamePattern, GameSpeed } from '@bingo/shared';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { PatternRulesModal } from '../../components/bingo/PatternRulesModal';
import {
  Gamepad2,
  Trophy,
  Users,
  Flame,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Zap,
  Sparkles,
  Target,
  HelpCircle,
} from 'lucide-react';

export const LobbyPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [games, setGames] = useState<GameRoomSummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [previewPattern, setPreviewPattern] = useState<GamePattern | null>(null);
  const [previewPrizePool, setPreviewPrizePool] = useState<number | undefined>(undefined);

  // Form for creating private custom room
  const [title, setTitle] = useState('');
  const [pattern, setPattern] = useState<GamePattern>('CLASSIC');
  const [speed, setSpeed] = useState<GameSpeed>('STANDARD');
  const [entryFee, setEntryFee] = useState<number>(50);

  const fetchGames = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<GameRoomSummary[]>(
        selectedCategory === 'ALL' ? '/games' : `/games?category=${selectedCategory}`
      );
      setGames(data);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, [selectedCategory]);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/games', {
        title,
        pattern,
        speed,
        entryFee: Number(entryFee),
        prizePool: Number(entryFee) * 10,
        category: 'CUSTOM',
      });
      setIsCreateModalOpen(false);
      fetchGames();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const filteredGames = games.filter((g) =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories: { id: GameCategory; label: string; icon: string }[] = [
    { id: 'ALL', label: 'All Arenas', icon: '🎰' },
    { id: 'CLASSIC', label: 'Classic 75', icon: '⭐' },
    { id: 'JACKPOT', label: 'Mega Jackpots', icon: '💰' },
    { id: 'QUICK', label: 'Turbo Speed', icon: '⚡' },
    { id: 'TOURNAMENT', label: 'Tournaments', icon: '🏆' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
              MULTIPLAYER LOBBY
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black font-display text-arena-text">
            Live Game Arenas
          </h1>
        </div>

        {isAuthenticated && (
          <Button
            variant="accent"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Custom Arena
          </Button>
        )}
      </div>

      {/* Featured Games Showcase: Derby, Mines, Aviator, Keno 80, & Plinko */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Dagi Derby Horse Race */}
        <Link
          to="/horserace"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600/25 via-yellow-500/15 to-slate-900/40 border border-amber-500/40 p-5 shadow-arena-glow group hover:scale-[1.02] transition-all flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider font-display flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400 animate-spin-slow" />
                HOT RELEASE
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                Live Turf
              </span>
            </div>
            <h3 className="text-xl font-black font-display text-arena-text group-hover:text-amber-400 transition-colors">
              🐎 Dagi Derby
            </h3>
            <p className="text-xs text-arena-muted">
              Live multiplayer horse racing with dynamic lead changes, Win/Place/Exacta bets, and photo finishes!
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">Up to 250× Win</span>
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs group-hover:brightness-110 transition-all shadow-md">
              <span>Bet Derby</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Mines */}
        <Link
          to="/mines"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600/25 via-teal-500/15 to-slate-900/40 border border-emerald-500/40 p-5 shadow-arena-glow group hover:scale-[1.02] transition-all flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider font-display flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400 animate-spin-slow" />
                NEW GAME
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                97% RTP
              </span>
            </div>
            <h3 className="text-xl font-black font-display text-arena-text group-hover:text-emerald-400 transition-colors">
              💣 Dagi Mines
            </h3>
            <p className="text-xs text-arena-muted">
              5×5 grid, choose 1–24 hidden mines, find safe diamonds, and cash out massive multipliers before bombs explode!
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">Up to 5.1M× Win</span>
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-xs group-hover:brightness-110 transition-all shadow-md">
              <span>Play Mines</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Aviator Crash */}
        <Link
          to="/aviator"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600/25 via-red-500/15 to-slate-900/40 border border-rose-500/40 p-5 shadow-arena-glow group hover:scale-[1.02] transition-all flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-wider font-display flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-400 animate-spin-slow" />
                HOT RELEASE
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                Multiplayer Crash
              </span>
            </div>
            <h3 className="text-xl font-black font-display text-arena-text group-hover:text-rose-400 transition-colors">
              🚀 Live Aviator Crash
            </h3>
            <p className="text-xs text-arena-muted">
              Dual bet panels, exponential flight multiplier curve, auto-cashout, and live multiplayer flight arena!
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400">Up to 5,000x Win</span>
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-black text-xs group-hover:brightness-110 transition-all shadow-md">
              <span>Fly Now</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Keno 80 */}
        <Link
          to="/keno"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-slate-900/40 border border-amber-500/40 p-5 shadow-arena-glow group hover:scale-[1.02] transition-all flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-wider font-display flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Live Arena
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                Up to 50,000x Win
              </span>
            </div>
            <h3 className="text-xl font-black font-display text-arena-text group-hover:text-amber-500 transition-colors">
              🎰 Live Keno 80
            </h3>
            <p className="text-xs text-arena-muted">
              Pick 1–10 spots, purchase multiple cards, and watch the 20-ball draw sequence with voice caller.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">Continuous 30s</span>
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-white font-black text-xs group-hover:bg-amber-400 transition-colors shadow-md">
              <span>Play Keno</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Plinko */}
        <Link
          to="/plinko"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-slate-900/40 border border-indigo-500/40 p-5 shadow-arena-glow group hover:scale-[1.02] transition-all flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-wider font-display flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Physics Arena
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                Up to 1,000x Win
              </span>
            </div>
            <h3 className="text-xl font-black font-display text-arena-text group-hover:text-indigo-400 transition-colors">
              🎯 Real-Time Plinko
            </h3>
            <p className="text-xs text-arena-muted">
              Drop physics balls through customizable pin pyramids (8–16 rows), choose risk, and hit massive multipliers!
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400">Volleys</span>
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs group-hover:brightness-110 transition-all shadow-md">
              <span>Play Plinko</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 flex items-center gap-2 flex-shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-arena-glow scale-105 border border-indigo-400/40'
                  : 'glass-panel text-arena-muted hover:text-arena-text hover:border-arena-border'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-arena-muted" />
          <input
            type="text"
            placeholder="Search room name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-arena-surface border border-arena-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-arena-text placeholder:text-arena-subtle focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
          />
        </div>
      </div>

      {/* Live Game Cards Grid */}
      {filteredGames.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl">
          <Gamepad2 className="w-12 h-12 text-arena-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-lg font-bold text-arena-text">No Game Rooms Found</h3>
          <p className="text-xs text-arena-muted mt-1">Try switching categories or create your own room</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
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

                <h3 className="text-xl font-black font-display text-arena-text mb-1.5">{game.title}</h3>

                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPreviewPattern(game.pattern);
                      setPreviewPrizePool(game.prizePool);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30 transition-all cursor-pointer shadow-xs hover:scale-105"
                    title="Click to view winning pattern rules"
                  >
                    <Target className="w-3 h-3 text-indigo-500" />
                    <span>{game.pattern}</span>
                    <HelpCircle className="w-2.5 h-2.5 opacity-70" />
                  </button>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-600 dark:text-pink-300 border border-pink-500/30">
                    {game.speed} SPEED
                  </span>
                </div>

                {/* Prize Pool Spotlight Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-400/30 mb-4">
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest block">
                    TOTAL PRIZE POOL
                  </span>
                  <div className="text-2xl font-black font-mono gradient-text-gold mt-0.5">
                    {game.prizePool.toLocaleString()} ETB
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-arena-border">
                <div className="flex items-center justify-between text-xs font-semibold text-arena-muted">
                  <span>Entry: <strong className="text-arena-text font-mono">{game.entryFee} ETB</strong></span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <strong className="text-emerald-500 font-mono">{game.currentPlayers} / {game.maxPlayers}</strong>
                  </span>
                </div>

                <Link to={`/games/${game.id}`} className="block">
                  <Button variant="primary" size="md" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Enter Arena
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Custom Room Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Custom Dagi Bingo Room"
      >
        <form onSubmit={handleCreateGame} className="space-y-4">
          <Input
            label="Room Title"
            placeholder="e.g. VIP High Rollers Room"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-bold text-arena-muted uppercase tracking-wider block mb-1.5 font-display">
              Winning Pattern Rule
            </label>
            <select
              value={pattern}
              onChange={(e) => setPattern(e.target.value as GamePattern)}
              className="w-full bg-arena-surface border border-arena-border text-arena-text text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="CLASSIC">CLASSIC (Any Line, Row, Diagonal)</option>
              <option value="FULL_HOUSE">FULL HOUSE (Complete Blackout)</option>
              <option value="FOUR_CORNERS">FOUR CORNERS</option>
              <option value="X_PATTERN">X PATTERN (Both Diagonals)</option>
              <option value="SPEED_BINGO">SPEED BINGO</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-arena-muted uppercase tracking-wider block mb-1.5 font-display">
              Draw Calling Speed
            </label>
            <select
              value={speed}
              onChange={(e) => setSpeed(e.target.value as GameSpeed)}
              className="w-full bg-arena-surface border border-arena-border text-arena-text text-xs rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="STANDARD">STANDARD (4 seconds per ball)</option>
              <option value="TURBO">TURBO (2.5 seconds per ball)</option>
              <option value="RELAXED">RELAXED (6 seconds per ball)</option>
            </select>
          </div>

          <Input
            label="Entry Fee (Demo ETB)"
            type="number"
            value={entryFee}
            onChange={(e) => setEntryFee(Number(e.target.value))}
            min={10}
            max={5000}
            required
          />

          <Button variant="accent" size="lg" fullWidth type="submit">
            Launch Arena Room
          </Button>
        </form>
      </Modal>
      {/* Pattern Rules Preview Modal */}
      {previewPattern && (
        <PatternRulesModal
          isOpen={!!previewPattern}
          onClose={() => setPreviewPattern(null)}
          pattern={previewPattern}
          prizePool={previewPrizePool}
        />
      )}
    </div>
  );
};
