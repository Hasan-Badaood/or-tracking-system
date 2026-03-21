import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/api/auth';
import { Eye, EyeOff, Loader2, Activity, Users, ClipboardList, CalendarClock, User, Lock } from 'lucide-react';

const features = [
  { icon: Activity,      text: 'Real-time patient status across all surgical stages.' },
  { icon: ClipboardList, text: 'Track pre-op, theatre, recovery and discharge.' },
  { icon: CalendarClock, text: 'Live surgical scheduling and theatre availability.' },
  { icon: Users,         text: 'Role-based access for all OR staff.' },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActiveFeature((prev) => (prev + 1) % features.length);
        setVisible(true);
      }, 600);
    }, 3500);
    return () => clearInterval(interval);
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

  const Feature = features[activeFeature];

  return (
    <div className="min-h-screen flex bg-[#0a1628]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col px-14 py-10">

        {/* Logo */}
        <div>
          <p className="text-white font-semibold text-base tracking-[0.2em] uppercase leading-none" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.18em' }}>OR Tracker</p>
          <p className="text-[10.5px] text-white/30 tracking-[0.22em] uppercase mt-1.5" style={{ fontFamily: "'Inter', sans-serif" }}>Operating Room Management</p>
        </div>

        {/* Heading + animated feature — centred vertically */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#26C6DA]/60 mb-5" style={{ fontFamily: "'Inter', sans-serif" }}>Patient Tracking System</p>
          <h1 className="font-bold text-white leading-[1.1]" style={{ fontSize: '3.4rem', fontFamily: "'DM Sans', sans-serif" }}>
            Operating<br />
            <span className="text-[#26C6DA]">Theatre</span> Tracker
          </h1>

          <div className="mt-10 h-7 flex items-center overflow-hidden">
            <div
              className="flex items-center gap-2.5"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 500ms ease, transform 500ms ease',
              }}
            >
              <Feature.icon className="w-3.5 h-3.5 text-[#26C6DA]/70 shrink-0" />
              <p className="text-[13px] text-white/40 whitespace-nowrap" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>{Feature.text}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-white/15" style={{ fontFamily: "'Inter', sans-serif" }}>
          &copy; {new Date().getFullYear()} OR Tracker. All rights reserved.
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center px-8 py-16 bg-[#f4f6f9] rounded-l-[2.5rem]">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <p className="font-bold text-[#0a1628] text-base tracking-widest uppercase" style={{ fontFamily: "'Inter', sans-serif" }}>OR Tracker</p>
            <p className="text-[11px] text-slate-400 tracking-widest uppercase mt-0.5">Operating Room Management</p>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="font-bold text-[#0a1628]" style={{ fontSize: '1.65rem', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.2 }}>Welcome back</h2>
            <p className="text-[13.5px] text-slate-400 mt-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Sign in with your staff credentials to continue.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-[11.5px] font-semibold text-slate-500 tracking-wide uppercase" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.07em' }}>
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  autoFocus
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-4 py-3 text-[13.5px] text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:border-[#26C6DA] focus:ring-2 focus:ring-[#26C6DA]/20 transition-all placeholder:text-slate-300"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[11.5px] font-semibold text-slate-500 tracking-wide uppercase" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.07em' }}>
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 text-[13.5px] text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:border-[#26C6DA] focus:ring-2 focus:ring-[#26C6DA]/20 transition-all placeholder:text-slate-300"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-0.5">
                <a href="/family" className="text-[12px] text-[#26C6DA] hover:text-[#1A9EAF] transition-colors font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                  Family Portal
                </a>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <p className="text-[12.5px] text-red-500" style={{ fontFamily: "'Inter', sans-serif" }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-[13.5px] font-semibold text-white bg-[#0a1628] hover:bg-[#14243f] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-[#0a1628]/20 mt-2"
              style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          {/* Role chips */}
          <div className="mt-9 pt-6 border-t border-slate-200">
            <p className="text-[10.5px] text-slate-300 mb-3 uppercase tracking-[0.12em]" style={{ fontFamily: "'Inter', sans-serif" }}>Access levels</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Admin',     cls: 'text-red-400 border-red-100 bg-red-50/60' },
                { label: 'Nurse',     cls: 'text-cyan-600 border-cyan-100 bg-cyan-50/60' },
                { label: 'Reception', cls: 'text-blue-400 border-blue-100 bg-blue-50/60' },
              ].map((r) => (
                <span key={r.label} className={`text-[11px] px-3 py-1 rounded-md border font-medium ${r.cls}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                  {r.label}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
