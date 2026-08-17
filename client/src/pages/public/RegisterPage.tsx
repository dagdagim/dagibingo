import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Lock, Mail, User, Phone, Globe, Sparkles, ArrowRight, Gift } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('Ethiopia');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    if (password !== confirmPassword) {
      setClientError('Passwords do not match');
      return;
    }

    if (!acceptTerms) {
      setClientError('Please accept the Terms & Conditions');
      return;
    }

    try {
      await register({
        firstName,
        lastName,
        username,
        email,
        phone: phone || undefined,
        password,
        confirmPassword,
        country,
        dateOfBirth: '2000-01-01',
        acceptTerms: true,
      });
      navigate('/dashboard');
    } catch {
      // Handled in store
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="w-full max-w-lg space-y-6 relative">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group mb-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-arena-glow group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-display font-black text-2xl text-white">
                D
              </div>
            </div>
          </Link>
          <h1 className="text-3xl font-black font-display text-arena-text">Join Dagi Bingo</h1>
          <p className="text-xs text-arena-muted">Create your account and receive instant demo credits</p>
        </div>

        {/* Welcome Bonus Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-400/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider block">
              1,000 ETB Welcome Credits
            </span>
            <span className="text-[11px] text-arena-muted">
              Auto-credited to your virtual wallet upon registration for instant gameplay.
            </span>
          </div>
        </div>

        {/* Form Card */}
        <Card elevated className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="e.g. Alex"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Last Name"
                placeholder="e.g. Tadesse"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <Input
              label="Username"
              placeholder="e.g. arena_champion"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              leftIcon={<User className="w-4 h-4 text-indigo-400" />}
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="alex@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4 text-indigo-400" />}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4 text-indigo-400" />}
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4 text-indigo-400" />}
                required
              />
            </div>

            {(error || clientError) && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {clientError || error}
              </div>
            )}

            <label className="flex items-center gap-2 text-xs text-arena-muted cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-arena-surface border-white/20 focus:ring-indigo-500"
              />
              <span>I confirm I am 18+ and accept the Game Rules & Terms</span>
            </label>

            <Button
              variant="accent"
              size="lg"
              fullWidth
              isLoading={isLoading}
              type="submit"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Create Account & Get 1,000 ETB
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <span className="text-xs text-arena-muted">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-bold">
                Sign In
              </Link>
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
};
