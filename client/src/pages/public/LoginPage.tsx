import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Lock, User, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');

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
