import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../services/api';
import {
  User,
  ShieldCheck,
  HeartHandshake,
  FileCheck,
  CheckCircle2,
  Trophy,
  Flame,
  Percent,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, fetchCurrentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'kyc' | 'responsible'>('overview');

  // KYC state
  const [docType, setDocType] = useState('NATIONAL_ID');
  const [docNumber, setDocNumber] = useState('');
  const [kycSuccess, setKycSuccess] = useState<string | null>(null);

  // Responsible gaming state
  const [dailyLimit, setDailyLimit] = useState(user?.responsibleGaming?.dailyDepositLimit || 5000);
  const [sessionLimit, setSessionLimit] = useState(user?.responsibleGaming?.sessionTimeLimitMinutes || 120);
  const [rgSuccess, setRgSuccess] = useState<string | null>(null);

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users/kyc', { documentType: docType, documentNumber: docNumber });
      setKycSuccess('KYC documents submitted successfully and currently pending review!');
      fetchCurrentUser();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleRgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/users/responsible-gaming', {
        dailyDepositLimit: Number(dailyLimit),
        sessionTimeLimitMinutes: Number(sessionLimit),
      });
      setRgSuccess('Responsible gaming limits updated successfully!');
      fetchCurrentUser();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const stats = user?.stats || {
    gamesPlayed: 0,
    gamesWon: 0,
    winRate: 0,
    totalWinnings: 0,
    highestWin: 0,
    currentStreak: 0,
    bestStreak: 0,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-arena-primary-light uppercase tracking-wider">
          Account Settings
        </span>
        <h1 className="text-3xl font-black font-display text-white mt-1">Profile & Verification</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-arena-surface border border-arena-border rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-arena-primary text-white shadow-arena-glow'
              : 'text-arena-muted hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          Overview & Stats
        </button>

        <button
          onClick={() => setActiveTab('kyc')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'kyc'
              ? 'bg-arena-primary text-white shadow-arena-glow'
              : 'text-arena-muted hover:text-white'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          KYC Identity State
        </button>

        <button
          onClick={() => setActiveTab('responsible')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'responsible'
              ? 'bg-arena-primary text-white shadow-arena-glow'
              : 'text-arena-muted hover:text-white'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          Responsible Gaming
        </button>
      </div>

      {/* Tab Content: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card elevated className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-arena-border">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-arena-primary to-purple-800 flex items-center justify-center font-display font-black text-2xl text-white shadow-arena-glow">
                {user?.username.substring(0, 2).toUpperCase()}
              </div>

              <div className="text-center sm:text-left space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl font-bold font-display text-white">{user?.username}</h2>
                  <Badge variant={user?.kycStatus === 'VERIFIED' ? 'accent' : 'warning'}>
                    {user?.kycStatus || 'NOT_STARTED'}
                  </Badge>
                </div>
                <p className="text-xs text-arena-muted">{user?.email}</p>
                <p className="text-xs text-arena-subtle">
                  Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()} • {user?.country}
                </p>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-arena-surface border border-arena-border">
                <span className="text-[10px] font-bold text-arena-muted uppercase block">Games Played</span>
                <span className="text-xl font-black font-display text-white mt-1 block">{stats.gamesPlayed}</span>
              </div>
              <div className="p-4 rounded-xl bg-arena-surface border border-arena-border">
                <span className="text-[10px] font-bold text-arena-muted uppercase block">Games Won</span>
                <span className="text-xl font-black font-display text-arena-accent mt-1 block">{stats.gamesWon}</span>
              </div>
              <div className="p-4 rounded-xl bg-arena-surface border border-arena-border">
                <span className="text-[10px] font-bold text-arena-muted uppercase block">Win Rate</span>
                <span className="text-xl font-black font-display text-white mt-1 block">{stats.winRate}%</span>
              </div>
              <div className="p-4 rounded-xl bg-arena-surface border border-arena-border">
                <span className="text-[10px] font-bold text-arena-muted uppercase block">Best Streak</span>
                <span className="text-xl font-black font-display text-amber-400 mt-1 block">{stats.bestStreak} 🔥</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab Content: KYC */}
      {activeTab === 'kyc' && (
        <Card elevated className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-arena-border">
            <div>
              <h3 className="text-lg font-bold font-display text-white">KYC Verification State</h3>
              <p className="text-xs text-arena-muted mt-0.5">Submit identity verification documents for compliance</p>
            </div>
            <Badge variant={user?.kycStatus === 'VERIFIED' ? 'accent' : 'warning'}>
              {user?.kycStatus || 'NOT_STARTED'}
            </Badge>
          </div>

          <form onSubmit={handleKycSubmit} className="space-y-4 max-w-lg">
            <div>
              <label className="text-xs font-semibold text-arena-muted uppercase tracking-wider block mb-1.5">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-arena-surface border border-arena-border text-arena-text text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-arena-primary"
              >
                <option value="NATIONAL_ID">National ID / Kebele ID</option>
                <option value="PASSPORT">Passport</option>
                <option value="DRIVERS_LICENSE">Driver's License</option>
              </select>
            </div>

            <Input
              label="Document Number"
              placeholder="e.g. ETH-92837190"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              required
            />

            {kycSuccess && (
              <div className="p-3 rounded-xl bg-arena-accent/15 border border-arena-accent text-arena-accent text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {kycSuccess}
              </div>
            )}

            <Button variant="primary" size="md" type="submit">
              Submit Verification Documents
            </Button>
          </form>
        </Card>
      )}

      {/* Tab Content: Responsible Gaming */}
      {activeTab === 'responsible' && (
        <Card elevated className="p-6 md:p-8 space-y-6">
          <div className="pb-4 border-b border-arena-border">
            <h3 className="text-lg font-bold font-display text-white">Responsible Gaming Safety Controls</h3>
            <p className="text-xs text-arena-muted mt-0.5">Set personal boundaries and play limits</p>
          </div>

          <form onSubmit={handleRgSubmit} className="space-y-5 max-w-lg">
            <Input
              label="Daily Demo Deposit Limit (ETB)"
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              helperText="Maximum virtual ETB you can deposit per day"
              required
            />

            <Input
              label="Session Time Limit (Minutes)"
              type="number"
              value={sessionLimit}
              onChange={(e) => setSessionLimit(Number(e.target.value))}
              helperText="Alerts you when your active session reaches this threshold"
              required
            />

            {rgSuccess && (
              <div className="p-3 rounded-xl bg-arena-accent/15 border border-arena-accent text-arena-accent text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {rgSuccess}
              </div>
            )}

            <Button variant="accent" size="md" type="submit">
              Save Responsible Limits
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
