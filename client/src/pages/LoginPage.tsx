import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/api/auth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const Illustration: React.FC = () => (
  <svg viewBox="0 0 520 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">

    {/* ── Background blobs ── */}
    <path d="M70 195 Q95 65 235 88 Q368 108 415 212 Q458 312 322 362 Q188 410 112 322 Q46 258 70 195Z" fill="#C8EAF5" opacity="0.7"/>
    <path d="M100 210 Q120 108 232 128 Q336 150 366 232 Q396 310 292 344 Q190 376 128 306 Q78 262 100 210Z" fill="#B2DFF0" opacity="0.45"/>

    {/* ── Monitor body ── */}
    <rect x="158" y="158" width="204" height="145" rx="12" fill="#2EC4D6"/>
    <rect x="170" y="169" width="180" height="112" rx="7" fill="#1AABBC"/>
    {/* Monitor stand + base */}
    <rect x="234" y="303" width="52" height="16" rx="4" fill="#2EC4D6"/>
    <rect x="212" y="317" width="96" height="10" rx="5" fill="#1AABBC"/>

    {/* Screen content — bar chart left */}
    <rect x="179" y="232" width="11" height="20" rx="3" fill="#5DE0EE" opacity="0.75"/>
    <rect x="195" y="224" width="11" height="28" rx="3" fill="#5DE0EE" opacity="0.9"/>
    <rect x="211" y="234" width="11" height="18" rx="3" fill="#5DE0EE" opacity="0.65"/>
    <rect x="227" y="218" width="11" height="34" rx="3" fill="#7AEAF5" opacity="0.95"/>
    <rect x="243" y="228" width="11" height="24" rx="3" fill="#5DE0EE" opacity="0.75"/>
    {/* Screen content — ECG line right */}
    <polyline points="262,232 270,232 275,218 281,248 288,224 295,224 302,232 340,232" stroke="#D0F8FC" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Screen top UI bars */}
    <rect x="179" y="177" width="68" height="6" rx="3" fill="#7AE8F4" opacity="0.5"/>
    <rect x="179" y="188" width="48" height="4" rx="2" fill="#7AE8F4" opacity="0.3"/>

    {/* ── Chat bubble (top-right of monitor) ── */}
    <rect x="294" y="102" width="84" height="48" rx="12" fill="#45CFE0"/>
    <rect x="306" y="115" width="58" height="5" rx="2.5" fill="white" opacity="0.85"/>
    <rect x="306" y="126" width="44" height="5" rx="2.5" fill="white" opacity="0.6"/>
    <rect x="306" y="137" width="52" height="5" rx="2.5" fill="white" opacity="0.45"/>
    <path d="M308 150 L322 150 L315 163Z" fill="#45CFE0"/>

    {/* ── Doctor — drawn back-to-front ── */}
    {/* Shadow */}
    <ellipse cx="263" cy="335" rx="40" ry="11" fill="#8EC8DC" opacity="0.4"/>
    {/* Trousers */}
    <rect x="250" y="282" width="16" height="46" rx="7" fill="#1565C0"/>
    <rect x="270" y="282" width="16" height="46" rx="7" fill="#1565C0"/>
    {/* Shoes */}
    <ellipse cx="258" cy="326" rx="12" ry="6" fill="#0D1B6E"/>
    <ellipse cx="278" cy="326" rx="12" ry="6" fill="#0D1B6E"/>
    {/* White coat */}
    <rect x="232" y="196" width="62" height="90" rx="12" fill="white"/>
    {/* Lapels */}
    <path d="M263 203 L254 220 L263 224 L272 220Z" fill="#E8F4FB"/>
    {/* Teal shirt/tie */}
    <rect x="259" y="202" width="8" height="26" rx="3" fill="#2EC4D6"/>
    {/* Coat buttons */}
    <circle cx="263" cy="258" r="2.5" fill="#CFD8DC"/>
    <circle cx="263" cy="270" r="2.5" fill="#CFD8DC"/>
    {/* Left arm (our left) hanging */}
    <path d="M232 214 Q214 226 208 244" stroke="white" strokeWidth="18" strokeLinecap="round"/>
    <path d="M232 214 Q214 226 208 244" stroke="#F0F0F0" strokeWidth="16" strokeLinecap="round"/>
    {/* Left hand */}
    <circle cx="206" cy="247" r="9" fill="#FFD0AC"/>
    {/* Right arm extended outward */}
    <path d="M294 214 Q314 218 328 212" stroke="white" strokeWidth="18" strokeLinecap="round"/>
    <path d="M294 214 Q314 218 328 212" stroke="#F0F0F0" strokeWidth="16" strokeLinecap="round"/>
    {/* Right hand */}
    <circle cx="331" cy="211" r="9" fill="#FFD0AC"/>
    {/* Stethoscope */}
    <path d="M246 224 Q237 242 241 257 Q246 268 256 264" stroke="#455A64" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
    <circle cx="256" cy="264" r="5.5" fill="#607D8B"/>
    {/* Neck */}
    <rect x="257" y="184" width="12" height="16" rx="5" fill="#FFD0AC"/>
    {/* Head */}
    <circle cx="263" cy="171" r="27" fill="#FFD0AC"/>
    {/* Hair */}
    <ellipse cx="263" cy="148" rx="23" ry="10" fill="#5D4037"/>
    <path d="M236 166 Q238 143 263 141 Q288 143 290 166 Q284 153 263 152 Q242 153 236 166Z" fill="#5D4037"/>
    {/* Ears */}
    <ellipse cx="236" cy="171" rx="5" ry="6.5" fill="#FFC09A"/>
    <ellipse cx="290" cy="171" rx="5" ry="6.5" fill="#FFC09A"/>
    {/* Eyes */}
    <circle cx="254" cy="168" r="3.2" fill="#2C1A0E"/>
    <circle cx="272" cy="168" r="3.2" fill="#2C1A0E"/>
    <circle cx="255" cy="167" r="1.3" fill="white"/>
    <circle cx="273" cy="167" r="1.3" fill="white"/>
    {/* Eyebrows */}
    <path d="M250 161 Q254 158 258 161" stroke="#5D4037" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    <path d="M268 161 Q272 158 276 161" stroke="#5D4037" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    {/* Smile */}
    <path d="M254 178 Q263 185 272 178" stroke="#C07878" strokeWidth="2" fill="none" strokeLinecap="round"/>

    {/* ── Staff figure (left) ── */}
    {/* Shadow */}
    <ellipse cx="110" cy="308" rx="27" ry="8" fill="#8EC8DC" opacity="0.35"/>
    {/* Trousers */}
    <rect x="101" y="268" width="13" height="36" rx="6" fill="#455A64"/>
    <rect x="117" y="268" width="13" height="36" rx="6" fill="#455A64"/>
    {/* Shoes */}
    <ellipse cx="107" cy="302" rx="10" ry="5.5" fill="#212121"/>
    <ellipse cx="123" cy="302" rx="10" ry="5.5" fill="#212121"/>
    {/* Scrubs */}
    <rect x="90" y="200" width="51" height="72" rx="9" fill="#E1F5FE"/>
    {/* Collar */}
    <path d="M115 205 L107 218 L115 222 L123 218Z" fill="#B3E5FC"/>
    {/* Left arm / clipboard hold */}
    <path d="M90 214 Q77 222 75 236" stroke="#D2EEF9" strokeWidth="15" strokeLinecap="round"/>
    <path d="M90 214 Q77 222 75 236" stroke="#C2E8F5" strokeWidth="13" strokeLinecap="round"/>
    {/* Right arm */}
    <path d="M141 214 Q150 224 148 238" stroke="#D2EEF9" strokeWidth="15" strokeLinecap="round"/>
    <path d="M141 214 Q150 224 148 238" stroke="#C2E8F5" strokeWidth="13" strokeLinecap="round"/>
    {/* Clipboard */}
    <rect x="62" y="212" width="30" height="40" rx="5" fill="#90A4AE"/>
    <rect x="64" y="214" width="26" height="36" rx="4" fill="white"/>
    <rect x="74" y="210" width="8" height="7" rx="2" fill="#78909C"/>
    <rect x="68" y="221" width="16" height="3" rx="1.5" fill="#90A4AE"/>
    <rect x="68" y="228" width="14" height="3" rx="1.5" fill="#90A4AE"/>
    <rect x="68" y="235" width="15" height="3" rx="1.5" fill="#90A4AE"/>
    <rect x="68" y="242" width="10" height="3" rx="1.5" fill="#26C6DA" opacity="0.8"/>
    {/* Neck */}
    <rect x="109" y="185" width="11" height="18" rx="5" fill="#FFD0AC"/>
    {/* Head */}
    <circle cx="114" cy="172" r="22" fill="#FFD0AC"/>
    {/* Hair */}
    <ellipse cx="114" cy="153" rx="19" ry="9" fill="#4E342E"/>
    <path d="M92 167 Q94 149 114 147 Q134 149 136 167 Q130 155 114 154 Q98 155 92 167Z" fill="#4E342E"/>
    {/* Ears */}
    <ellipse cx="92" cy="172" rx="4.5" ry="5.5" fill="#FFC09A"/>
    <ellipse cx="136" cy="172" rx="4.5" ry="5.5" fill="#FFC09A"/>
    {/* Eyes */}
    <circle cx="108" cy="170" r="2.8" fill="#2C1A0E"/>
    <circle cx="120" cy="170" r="2.8" fill="#2C1A0E"/>
    <circle cx="109" cy="169" r="1.1" fill="white"/>
    <circle cx="121" cy="169" r="1.1" fill="white"/>
    {/* Smile */}
    <path d="M109 178 Q114 183 119 178" stroke="#C07878" strokeWidth="1.8" fill="none" strokeLinecap="round"/>

    {/* ── Floating icons ── */}

    {/* Calendar (top-left) */}
    <g transform="translate(50, 88)">
      <rect width="52" height="50" rx="8" fill="white" opacity="0.97"/>
      <rect width="52" height="16" rx="8" fill="#EF5350"/>
      <rect y="9" width="52" height="7" fill="#EF5350"/>
      <circle cx="16" cy="9" r="5" fill="#B71C1C"/>
      <circle cx="36" cy="9" r="5" fill="#B71C1C"/>
      <rect x="7" y="22" width="9" height="8" rx="2" fill="#FFCDD2"/>
      <rect x="21" y="22" width="9" height="8" rx="2" fill="#FFCDD2"/>
      <rect x="35" y="22" width="9" height="8" rx="2" fill="#FFCDD2"/>
      <rect x="7" y="34" width="9" height="8" rx="2" fill="#FFCDD2"/>
      <rect x="21" y="34" width="9" height="8" rx="2" fill="#EF5350"/>
      <rect x="35" y="34" width="9" height="8" rx="2" fill="#FFCDD2"/>
    </g>

    {/* ECG card (top-right) */}
    <g transform="translate(358, 84)">
      <rect width="66" height="44" rx="9" fill="white" opacity="0.97"/>
      <polyline points="6,26 14,26 20,12 27,40 34,20 40,20 46,26 60,26" stroke="#EF5350" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </g>

    {/* Medicine bottle (right) */}
    <g transform="translate(402, 162)">
      <rect x="5" y="11" width="26" height="42" rx="7" fill="#81D4FA"/>
      <rect x="8" y="5" width="20" height="10" rx="4" fill="#4FC3F7"/>
      <rect x="11" y="0" width="14" height="7" rx="3" fill="#29B6F6"/>
      <rect x="15" y="22" width="6" height="18" rx="2" fill="white" opacity="0.6"/>
      <rect x="11" y="28" width="14" height="6" rx="2" fill="white" opacity="0.6"/>
    </g>

    {/* Syringe (right-lower) */}
    <g transform="translate(396, 236) rotate(-22, 17, 22)">
      <rect x="8" y="4" width="14" height="38" rx="5" fill="#B0BEC5"/>
      <rect x="10" y="6" width="10" height="34" rx="3" fill="white"/>
      <rect x="10" y="24" width="10" height="12" rx="2" fill="#4DD0E1" opacity="0.7"/>
      <rect x="4" y="10" width="22" height="7" rx="3" fill="#90A4AE"/>
      <path d="M15 42 L15 54" stroke="#90A4AE" strokeWidth="3.5" strokeLinecap="round"/>
    </g>

    {/* Red cross (left-lower) */}
    <g transform="translate(36, 202)">
      <circle cx="19" cy="19" r="19" fill="#EF5350" opacity="0.13"/>
      <rect x="12" y="15" width="14" height="7" rx="2.5" fill="#EF5350" opacity="0.8"/>
      <rect x="15" y="12" width="7" height="14" rx="2.5" fill="#EF5350" opacity="0.8"/>
    </g>

    {/* Pill capsule (top-right area) */}
    <g transform="translate(422, 122) rotate(38, 19, 10)">
      <rect width="38" height="20" rx="10" fill="#F48FB1"/>
      <rect x="19" y="0" width="19" height="20" rx="10" fill="white"/>
      <line x1="19" y1="2" x2="19" y2="18" stroke="#F48FB1" strokeWidth="1.5"/>
    </g>

  </svg>
);

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex bg-white">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[58%] bg-[#F0F9FD] flex-col relative overflow-hidden">

        {/* Logo */}
        <div className="px-12 pt-10 flex items-center gap-3">
          <svg viewBox="0 0 36 36" className="w-10 h-10" fill="none">
            <circle cx="18" cy="18" r="18" fill="#C62828"/>
            <rect x="14" y="6" width="8" height="24" rx="2" fill="white"/>
            <rect x="6" y="14" width="24" height="8" rx="2" fill="white"/>
            <path d="M28 5 Q33 3 35 8" stroke="#C62828" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          </svg>
          <div className="leading-none">
            <p className="font-bold text-[#C62828] text-base tracking-widest uppercase leading-tight">OR Tracking</p>
            <p className="text-[11px] text-[#C62828] tracking-widest uppercase opacity-60 mt-0.5">System</p>
          </div>
        </div>

        {/* Illustration */}
        <div className="flex-1 flex items-center justify-center px-10 py-4">
          <Illustration />
        </div>

        {/* Tagline */}
        <div className="px-12 pb-12">
          <div className="border-l-[4px] border-[#26C6DA] pl-4">
            <p className="text-[13px] text-slate-500 leading-relaxed max-w-xs">
              Real-time patient tracking across every stage of the surgical journey — from arrival to discharge.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center px-10 py-16">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <svg viewBox="0 0 36 36" className="w-9 h-9" fill="none">
              <circle cx="18" cy="18" r="18" fill="#C62828"/>
              <rect x="14" y="6" width="8" height="24" rx="2" fill="white"/>
              <rect x="6" y="14" width="24" height="8" rx="2" fill="white"/>
            </svg>
            <span className="font-bold text-[#C62828] text-sm tracking-wider uppercase">OR Tracking System</span>
          </div>

          {/* Heading */}
          <div className="mb-10">
            <h1 className="text-4xl font-semibold text-slate-800 tracking-tight">Sign In</h1>
            <p className="text-[13px] text-slate-400 mt-3 leading-relaxed">
              Enter your staff credentials to access the<br />operating room management portal.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">

            <div className="relative group">
              <label htmlFor="username" className="block text-xs text-slate-400 mb-2 tracking-wide">
                User Name
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                autoFocus
                className="w-full pb-2.5 text-sm text-slate-700 bg-transparent border-b border-slate-200 focus:outline-none focus:border-[#26C6DA] transition-colors placeholder-transparent"
              />
            </div>

            <div className="relative">
              <label htmlFor="password" className="block text-xs text-slate-400 mb-2 tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pb-2.5 pr-8 text-sm text-slate-700 bg-transparent border-b border-slate-200 focus:outline-none focus:border-[#26C6DA] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-0 bottom-2.5 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <a href="/family" className="text-xs text-[#26C6DA] hover:text-[#1A9EAF] transition-colors">
                  Forgot Password?
                </a>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 -mt-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white tracking-widest uppercase bg-[#26C6DA] hover:bg-[#1AAFC2] disabled:opacity-50 disabled:cursor-not-allowed rounded-sm transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : 'Sign In'}
            </button>
          </form>

          {/* Role chips */}
          <div className="mt-12 flex gap-2 flex-wrap">
            {[
              { label: 'Admin', cls: 'text-red-400 border-red-100 bg-red-50' },
              { label: 'Nurse', cls: 'text-cyan-600 border-cyan-100 bg-cyan-50' },
              { label: 'Reception', cls: 'text-blue-400 border-blue-100 bg-blue-50' },
            ].map((r) => (
              <span key={r.label} className={`text-[11px] px-3 py-1 rounded border ${r.cls}`}>
                {r.label}
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
