import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Lock, User, Sparkles, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();
  const [emailOrUsername, setEmailOrUsername] = useState('alex_champion');
  const [password, setPassword] = useState('Player@123456');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ emailOrUsername, password });
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch {
      // Error handled in authStore
    }
  };

  const handleQuickFill = (userType: 'admin' | 'player1' | 'player2') => {
    if (userType === 'admin') {
      setEmailOrUsername('admin@bingoarena.com');
      setPassword('Admin@123456');
    } else if (userType === 'player1') {
      setEmailOrUsername('player1@bingoarena.com');
      setPassword('Player@123456');
    } else if (userType === 'player2') {
      setEmailOrUsername('player2@bingoarena.com');
      setPassword('Player@123456');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group mb-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-arena-glow group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-display font-black text-2xl text-white">
                D
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-black font-display text-arena-text">Welcome Back</h1>
          <p className="text-xs text-arena-muted">Sign in to your Dagi Bingo multiplayer account</p>
        </div>

        {/* Quick Demo Fill Buttons */}
        <Card elevated className="p-4 border-indigo-500/30">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 font-display">
              1-Click Demo Logins
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="px-2.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('player1')}
              className="px-2.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              🎮 Player 1
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('player2')}
              className="px-2.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              🎯 Player 2
            </button>
          </div>
        </Card>

        {/* Form Card */}
        <Card elevated className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email or Username"
              placeholder="e.g. alex_champion or email"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              leftIcon={<User className="w-4 h-4 text-indigo-400" />}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-indigo-400" />}
              required
            />

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            <Button
              variant="accent"
              size="lg"
              fullWidth
              isLoading={isLoading}
              type="submit"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Sign In to Arena
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <span className="text-xs text-arena-muted">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-bold">
                Create Free Account
              </Link>
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};
