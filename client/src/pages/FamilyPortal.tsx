import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { familyAPI, FamilyVisitStatus } from '@/api/family';
import { Search, Clock, CheckCircle, Loader2 } from 'lucide-react';

type PortalStep = 'search' | 'otp' | 'status';

const STAGE_ORDER = ['Arrived', 'Pre-Op Assessment', 'Ready for Theatre', 'In Theatre', 'Recovery', 'Discharged'];

export const FamilyPortal: React.FC = () => {
  const [step, setStep] = useState<PortalStep>('search');
  const [visitTrackingId, setVisitTrackingId] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [visitStatus, setVisitStatus] = useState<FamilyVisitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await familyAPI.getVisitStatus(accessToken);
      setVisitStatus(data);
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
      await familyAPI.requestOtp({
        visit_tracking_id: visitTrackingId,
        ...(email && { email }),
      });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please check the Visit ID.');
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
      setStep('status');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800">Family Portal</h1>
          <p className="text-gray-500 mt-2">Track your loved one's surgical journey</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Request OTP */}
        {step === 'search' && (
          <>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Track Patient Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="visitId">Visit Tracking ID</Label>
                    <Input
                      id="visitId"
                      value={visitTrackingId}
                      onChange={(e) => setVisitTrackingId(e.target.value)}
                      placeholder="e.g., VT-20260305-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address (registered with the visit)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                    <p className="text-xs text-gray-500">
                      Enter the email registered as a family contact for this visit
                    </p>
                  </div>
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
                  )}
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending OTP...</>
                    ) : (
                      <><Search className="h-4 w-4 mr-2" /> Send OTP</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center py-8">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">How to use this portal</h3>
                <div className="text-gray-500 space-y-2 max-w-md mx-auto text-sm">
                  <p>1. Enter the Visit Tracking ID provided at registration</p>
                  <p>2. Provide the email registered with the patient's visit</p>
                  <p>3. Enter the OTP sent to your email</p>
                  <p>4. View real-time updates on your loved one's progress</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Step 2: Enter OTP */}
        {step === 'otp' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Enter Verification Code</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                A 6-digit code has been sent to your email. It expires in 15 minutes.
              </p>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required
                    className="text-center text-xl tracking-widest"
                  />
                </div>
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
                )}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setStep('search'); setError(''); }}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Patient Status */}
        {step === 'status' && visitStatus && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Patient: {visitStatus.patient_first_name}</CardTitle>
                  <Badge
                    className="text-base px-3 py-1 text-white"
                    style={{ backgroundColor: visitStatus.current_stage.color }}
                  >
                    {visitStatus.current_stage.name}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Visit ID</p>
                  <p className="font-medium">{visitStatus.visit_tracking_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="font-medium">
                    {new Date(visitStatus.updated_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Surgical Journey Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{visitStatus.stage_progress_percent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${visitStatus.stage_progress_percent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {STAGE_ORDER.map((stageName) => {
                    const currentIdx = STAGE_ORDER.indexOf(visitStatus.current_stage.name);
                    const stageIdx = STAGE_ORDER.indexOf(stageName);
                    const isCompleted = stageIdx < currentIdx;
                    const isCurrent = stageName === visitStatus.current_stage.name;

                    return (
                      <div
                        key={stageName}
                        className={`flex items-center gap-4 p-3 rounded-lg ${
                          isCurrent
                            ? 'bg-blue-50 border border-blue-200'
                            : isCompleted
                            ? 'bg-green-50'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : isCompleted
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${isCurrent ? 'text-blue-900' : ''}`}>
                            {stageName}
                          </p>
                        </div>
                        {isCurrent && <Badge>Current</Badge>}
                        {isCompleted && <CheckCircle className="h-5 w-5 text-green-600" />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6 flex gap-3 items-start">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-blue-900">Updates every minute</p>
                  <p className="text-sm text-blue-700 mt-1">
                    This page refreshes automatically every 60 seconds.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};
