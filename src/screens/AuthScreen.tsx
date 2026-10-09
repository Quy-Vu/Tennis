import { useState } from 'react';
import { Fingerprint, Mail, Lock, Eye, EyeOff, ArrowRight, RotateCcw } from 'lucide-react';
import { useApp } from '@/lib/context';
import { createPlayer, authenticatePlayer, clearAllData } from '@/lib/localDb';

export function AuthScreen() {
  const { login, register, signOut } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometric, setBiometric] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');

    try {
      let player;
      if (mode === 'login') {
        player = authenticatePlayer(email, password);
        login(player);
      } else {
        player = createPlayer({ email, password });
        register(player);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setBiometric(true);
    setTimeout(() => {
      setBiometric(false);
      setError('Biometric authentication is a simulation — please use email/password to log in.');
    }, 600);
  };

  const handleReset = () => {
    clearAllData();
    signOut();
    setError('');
    setEmail('');
    setPassword('');
    setMode('login');
  };

  return (
    <div className="mobile-frame bg-ink-900 flex flex-col px-6 pb-10">
      <div className="flex-1 flex flex-col justify-center scroll-area pt-[var(--safe-top)]">
        {/* Logo / Title */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-lime-400/10 border border-lime-400/20 mb-5">
            <span className="text-4xl">🎾</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white leading-tight">
            Welcome to Tennis Record
            <br />
            Ranking App
          </h1>
          <p className="text-sm text-white/40 mt-3 font-medium">
            1-Set · Hard-Court System
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4 animate-slide-up">
          <div>
            <label className="field-label">Username (Email / Phone)</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@tennis.app"
                className="field-input pl-11"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="field-input pl-11 pr-11"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 active:text-white/60"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 animate-fade-in">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary disabled:opacity-50 animate-scale-in"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-ink-900/30 border-t-ink-900 rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <div className="text-center pt-1">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="text-sm text-lime-400/70 font-medium active:text-lime-400"
            >
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
            </button>
          </div>
        </div>
      </div>

      {/* Biometric */}
      <div className="flex flex-col items-center gap-3 pb-[var(--safe-bottom)] pt-6">
        <div className="w-full h-px bg-white/8" />
        <button
          onClick={handleBiometric}
          className="relative flex flex-col items-center gap-2 group"
        >
          {biometric && (
            <span className="absolute -inset-2 rounded-full border-2 border-lime-400/40 animate-pulse-ring" />
          )}
          <div className="w-16 h-16 rounded-full bg-lime-400/10 border-2 border-lime-400/25 flex items-center justify-center transition-all group-active:scale-90 group-active:border-lime-400/50">
            <Fingerprint size={28} className="text-lime-400/80" />
          </div>
          <span className="text-xs text-white/40 font-medium">Biometric Login</span>
        </button>
      </div>

      {/* Reset / Clear all data */}
      <div className="pb-[var(--safe-bottom)] flex justify-center">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-[11px] text-white/20 font-medium active:text-white/40 transition-colors"
        >
          <RotateCcw size={11} />
          Reset all data & start fresh
        </button>
      </div>
    </div>
  );
}
