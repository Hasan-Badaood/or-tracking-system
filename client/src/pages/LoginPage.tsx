import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/api/auth';
import { Loader2, Eye, EyeOff, Stethoscope, HeartPulse, KeyRound, UserCog } from 'lucide-react';

const STATS = [
  { icon: HeartPulse,  label: 'Live OR Monitoring', value: '24 / 7' },
  { icon: UserCog,     label: 'Staff Roles',        value: '3' },
  { icon: Stethoscope, label: 'Stage Transitions',  value: '8' },
  { icon: KeyRound,    label: 'Secure Access',      value: 'OTP' },
];

const Ring: React.FC<{ size: number; delay: string; opacity: number }> = ({ size, delay, opacity }) => (
  <span
    className="absolute rounded-full border border-blue-400 animate-ping"
    style={{
      width: size, height: size, opacity,
      animationDuration: '4s', animationDelay: delay,
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
    }}
  />
);

const CrossIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="9.5" y="3" width="5" height="18" rx="1.2" />
    <rect x="3" y="9.5" width="18" height="5" rx="1.2" />
  </svg>
);

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.login({ username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.user.role === 'reception') navigate('/reception');
      else if (data.user.role === 'nurse') navigate('/nurse');
      else if (data.user.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ════════════════════════════════════════
          Mobile / tablet hero  (hidden on lg+)
          ════════════════════════════════════════ */}
      <div className="lg:hidden relative bg-slate-950 overflow-hidden">
        {/* Blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-blue-600 opacity-10 blur-3xl" />
          <div className="absolute -bottom-10 -right-10 w-56 h-56 rounded-full bg-indigo-600 opacity-10 blur-3xl" />
        </div>

        <div className="relative z-10 px-5 pt-8 pb-14 sm:px-8 sm:pt-10 sm:pb-16 max-w-lg mx-auto w-full">
          {/* Logo row */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/50">
              <CrossIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">OR Tracking System</p>
              <p className="text-slate-400 text-xs mt-0.5">Operating Room Management</p>
            </div>
            <div className="ml-auto flex items-center gap-2 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 text-xs font-mono">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Headline */}
          <div className="mt-7">
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">
              Patient-first{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                surgical tracking
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-sm">
              Real-time visibility across every stage of a patient's surgical journey.
            </p>
          </div>

          {/* Stats — 2 on mobile, 4 on sm+ */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 bg-slate-800/50 border border-slate-700/40 rounded-xl p-3"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-xs">{value}</p>
                  <p className="text-slate-500 text-[10px] leading-tight truncate">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          Desktop left panel  (hidden below lg)
          ════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden bg-slate-950 flex-col justify-between p-12">
        {/* Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600 opacity-10 blur-3xl" />
          <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-cyan-500 opacity-10 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-indigo-700 opacity-10 blur-3xl" />
        </div>

        {/* Pulse rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <Ring size={180} delay="0s"   opacity={0.08} />
          <Ring size={300} delay="1.2s" opacity={0.05} />
          <Ring size={440} delay="2.4s" opacity={0.03} />
        </div>

        {/* Top: logo + clock */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/50">
            <CrossIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">OR Tracking System</p>
            <p className="text-slate-400 text-xs mt-0.5">Operating Room Management</p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-slate-800/60 backdrop-blur px-3 py-1.5 rounded-full border border-slate-700/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 text-xs font-mono">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Centre: headline */}
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-900/60 mb-8">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-white">
              <rect x="9" y="2" width="6" height="20" rx="1.5" />
              <rect x="2" y="9" width="20" height="6" rx="1.5" />
            </svg>
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
            Patient-first<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              surgical tracking
            </span>
          </h1>
          <p className="text-slate-400 mt-4 text-base max-w-sm mx-auto leading-relaxed">
            Real-time visibility across every stage of a patient's surgical journey — from arrival to discharge.
          </p>
        </div>

        {/* Bottom: stats */}
        <div className="relative z-10">
          <div className="grid grid-cols-2 gap-3 mb-8">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-3 bg-slate-800/50 backdrop-blur border border-slate-700/40 rounded-2xl p-4"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{value}</p>
                  <p className="text-slate-500 text-xs leading-tight">{label}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-slate-600 text-xs text-center">
            Secure NHS-grade staff portal — unauthorised access is prohibited
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════
          Form panel  (all breakpoints)
          ════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-start lg:justify-center items-center bg-slate-100 lg:bg-white px-4 sm:px-6 lg:px-8 pb-10 lg:py-12">
        {/* Card wrapper: visible on mobile/tablet, invisible on desktop */}
        <div className="w-full max-w-md -mt-6 lg:mt-0">
          <div className="bg-white rounded-2xl shadow-xl lg:shadow-none p-6 sm:p-8 lg:p-0">

            {/* Heading */}
            <div className="mb-7">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
              <p className="text-gray-500 mt-2 text-sm">Sign in with your staff credentials to continue</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-1.5">
                <label htmlFor="username" className="block text-sm font-semibold text-gray-700">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. nurse1"
                    required
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                ) : (
                  <>
                    Sign in
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-7">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">Access levels</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Role badges */}
            <div className="flex gap-2 justify-center flex-wrap">
              {[
                { label: 'Admin',     color: 'bg-red-50 text-red-600 border-red-100' },
                { label: 'Nurse',     color: 'bg-blue-50 text-blue-600 border-blue-100' },
                { label: 'Reception', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
              ].map((r) => (
                <span key={r.label} className={`text-xs font-medium px-3 py-1.5 rounded-full border ${r.color}`}>
                  {r.label}
                </span>
              ))}
            </div>

            {/* Family portal link */}
            <p className="text-center text-xs text-gray-400 mt-7">
              Family member?{' '}
              <a href="/family" className="text-blue-500 hover:text-blue-600 font-medium underline underline-offset-2">
                Track your loved one here
              </a>
            </p>
          </div>

          {/* Footer — outside card so it sits on the slate-100 bg on mobile */}
          <p className="text-center text-xs text-gray-400 mt-5 lg:text-gray-300">
            © 2026 OR Patient Tracking System
          </p>
        </div>
      </div>

    </div>
  );
};
