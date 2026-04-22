import React, { useState, useEffect, useCallback } from 'react';
import { familyAPI, FamilyVisitStatus } from '@/api/family';
import { Loader2, Eye, EyeOff, RefreshCw, X } from 'lucide-react';

type PortalStep = 'search' | 'otp' | 'status';

const STAGE_ORDER = [
  'Arrived',
  'Pre-Op',
  'Ready',
  'In Theatre',
  'Recovery',
  'Discharged',
];

const SurgicalCross: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="9.5" y="3" width="5" height="18" rx="1.2" />
    <rect x="3" y="9.5" width="18" height="5" rx="1.2" />
  </svg>
);

const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
    {message}
  </div>
);

export const FamilyPortal: React.FC = () => {
  const [step, setStep] = useState<PortalStep>('search');
  const [visitTrackingId, setVisitTrackingId] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [visitStatus, setVisitStatus] = useState<FamilyVisitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await familyAPI.getVisitStatus(accessToken);
      setVisitStatus(data);
      setLastRefreshed(new Date());
    } catch {
      // silently fail on refresh
    }
  }, [accessToken]);

  useEffect(() => {
    if (step !== 'status') return;
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [step, fetchStatus]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await familyAPI.requestOtp({
        visit_tracking_id: visitTrackingId,
        ...(email && { email }),
      });
      if (result.discharged && result.visit) {
        setVisitStatus(result.visit);
        setLastRefreshed(new Date());
        setStep('status');
      } else {
        setStep('otp');
      }
    } catch (err: any) {
      const msg: string = err.response?.data?.error ?? '';
      if (msg.includes('No family contact')) {
        setError('No family contact was registered for this visit. Please ask reception to add your details when the patient was admitted.');
      } else if (msg.includes('consent')) {
        setError('The patient has not consented to family tracking for this visit.');
      } else {
        setError(msg || 'Could not find a visit with those details. Please check the Visit ID and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await familyAPI.verifyOtp({ visit_tracking_id: visitTrackingId, otp });
      setAccessToken(data.access_token);
      setVisitStatus(data.visit);
      setLastRefreshed(new Date());
      setStep('status');
    } catch (err: any) {
      setError(err.response?.data?.error || 'That code did not match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  };

  const handleClose = () => {
    setStep('search');
    setVisitTrackingId('');
    setEmail('');
    setOtp('');
    setAccessToken('');
    setVisitStatus(null);
    setLastRefreshed(null);
    setError('');
  };

  const currentStageIdx = visitStatus
    ? STAGE_ORDER.indexOf(visitStatus.current_stage.name)
    : -1;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      {/* ── Search step ── */}
      {step === 'search' && (
        <>
          {/* Dark hero */}
          <div className="relative bg-slate-950 overflow-hidden">
            {/* Blobs */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-blue-600 opacity-10 blur-3xl" />
              <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full bg-indigo-600 opacity-10 blur-3xl" />
            </div>

            <div className="relative z-10 max-w-md mx-auto px-6 pt-10 pb-16">
              {/* Logo row */}
              <div className="flex items-center gap-2.5 mb-10">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <SurgicalCross className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold text-sm">OR Tracking</span>
                <span className="ml-auto text-xs text-slate-500 font-medium tracking-widest uppercase">Family</span>
              </div>

              <p className="text-blue-400 text-xs font-semibold tracking-widest uppercase mb-2">Patient tracker</p>
              <h1 className="text-3xl font-bold text-white leading-tight">
                Stay informed<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  every step of the way
                </span>
              </h1>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                Enter the Visit ID from your registration slip and your email to receive a secure access code.
              </p>
            </div>
          </div>

          {/* Form card — overlaps hero with negative top margin */}
          <div className="flex-1 flex flex-col">
            <div className="max-w-md mx-auto w-full px-4 -mt-6">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
                <form onSubmit={handleRequestOtp} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="visitId" className="block text-sm font-semibold text-slate-700">
                      Visit Tracking ID
                    </label>
                    <input
                      id="visitId"
                      type="text"
                      value={visitTrackingId}
                      onChange={(e) => setVisitTrackingId(e.target.value.toUpperCase())}
                      placeholder="VT-20260305-001"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    />
                    <p className="text-xs text-slate-400">Printed on the registration slip from reception</p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                      Email address
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        type={showEmail ? 'text' : 'email'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmail((v) => !v)}
                        tabIndex={-1}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showEmail ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">The email registered as a family contact</p>
                  </div>

                  {error && <ErrorBox message={error} />}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 mt-1"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending code...</>
                    ) : (
                      <>
                        Send verification code
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-7 pt-6 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">How it works</p>
                  <ol className="space-y-3">
                    {[
                      'Enter the Visit ID from your registration slip',
                      'We send a one-time code to your registered email',
                      'Enter the code to view live stage updates',
                    ].map((text, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-500">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">
                          {i + 1}
                        </span>
                        {text}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <p className="text-center text-xs text-slate-400 mt-6 pb-8">
                Clinical staff?{' '}
                <a href="/login" className="text-blue-500 hover:text-blue-600 font-medium">Sign in here</a>
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── OTP step ── */}
      {step === 'otp' && (
        <>
          {/* Dark hero */}
          <div className="relative bg-slate-950 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-blue-600 opacity-10 blur-3xl" />
            </div>
            <div className="relative z-10 max-w-md mx-auto px-6 pt-10 pb-16">
              <div className="flex items-center gap-2.5 mb-10">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <SurgicalCross className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold text-sm">OR Tracking</span>
              </div>

              <button
                type="button"
                onClick={() => { setStep('search'); setError(''); }}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>

              <h1 className="text-3xl font-bold text-white">Check your email</h1>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                A 6-digit code was sent to{' '}
                <span className="text-slate-200 font-medium">{email || 'your email'}</span>.
                It expires in 15 minutes.
              </p>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="max-w-md mx-auto w-full px-4 -mt-6">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="otp" className="block text-sm font-semibold text-slate-700">
                      Verification code
                    </label>
                    <input
                      id="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      required
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-300 text-3xl font-mono tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    />
                  </div>

                  {error && <ErrorBox message={error} />}

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                    ) : (
                      'Confirm code'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="w-full py-2.5 text-sm text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    Resend code
                  </button>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Status step ── */}
      {step === 'status' && visitStatus && (
        <>
          {/* Dark hero — patient info */}
          <div className="relative bg-slate-950 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-600 opacity-10 blur-3xl" />
            </div>
            <div className="relative z-10 max-w-md mx-auto px-6 pt-10 pb-16">
              <div className="flex items-center gap-2.5 mb-10">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <SurgicalCross className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold text-sm">OR Tracking</span>
                <span className="ml-auto text-xs text-slate-500 font-medium tracking-widest uppercase">Live</span>
                <div className="flex items-center gap-1 ml-3">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    title="Refresh status"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    title="Close"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-1">Patient</p>
              <h1 className="text-3xl font-bold text-white">{visitStatus.patient_first_name}</h1>
              <p className="text-slate-500 font-mono text-xs mt-1">{visitStatus.visit_tracking_id}</p>

              <div className="mt-5 flex items-center justify-between">
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: visitStatus.current_stage.color }}
                >
                  {visitStatus.current_stage.name}
                </span>
                <span className="text-slate-400 text-xs">{visitStatus.stage_progress_percent}% complete</span>
              </div>

              {/* Thin progress bar */}
              <div className="mt-3 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${visitStatus.stage_progress_percent}%`,
                    backgroundColor: visitStatus.current_stage.color,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Timeline card */}
          <div className="flex-1 flex flex-col">
            <div className="max-w-md mx-auto w-full px-4 -mt-6 pb-8">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-4">
                <p className="text-sm font-semibold text-slate-700 mb-5">Surgical journey</p>
                <div className="relative">
                  <div className="absolute left-[18px] top-3 bottom-3 w-px bg-slate-200" />
                  <div className="space-y-0">
                    {STAGE_ORDER.map((stageName, idx) => {
                      const isDischarged = visitStatus?.current_stage.name === 'Discharged';
                      const isCompleted = isDischarged ? idx <= currentStageIdx : idx < currentStageIdx;
                      const isCurrent = !isDischarged && idx === currentStageIdx;
                      const isPending = idx > currentStageIdx;

                      return (
                        <div key={stageName} className="flex items-start gap-4 relative py-3">
                          <div className="relative z-10 shrink-0">
                            {isCompleted && (
                              <div className="w-9 h-9 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center">
                                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              </div>
                            )}
                            {isCurrent && (
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center"
                                style={{
                                  backgroundColor: `${visitStatus.current_stage.color}18`,
                                  border: `2px solid ${visitStatus.current_stage.color}`,
                                }}
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                                  style={{ backgroundColor: visitStatus.current_stage.color }}
                                />
                              </div>
                            )}
                            {isPending && (
                              <div className="w-9 h-9 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center">
                                <span className="w-2 h-2 rounded-full bg-slate-300" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 pt-1.5">
                            <p className={`text-sm font-medium leading-tight ${
                              isCurrent
                                ? 'text-slate-900'
                                : isCompleted
                                ? 'text-emerald-700'
                                : 'text-slate-400'
                            }`}>
                              {stageName}
                            </p>
                            {isCurrent && (
                              <p className="text-xs mt-0.5" style={{ color: visitStatus.current_stage.color }}>
                                In progress
                              </p>
                            )}
                            {isCompleted && (
                              <p className="text-xs text-emerald-500 mt-0.5">Completed</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {visitStatus.current_stage.name === 'Discharged' && visitStatus.discharge_note && (
                <div className="mt-2 mb-4 flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-0.5">Discharge information</p>
                    <p className="text-sm text-emerald-800">{visitStatus.discharge_note}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  {lastRefreshed
                    ? `Updated ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Live'}
                </span>
                {visitStatus?.current_stage.name !== 'Discharged' && (
                  <span>Auto-refreshes every 60 s</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
