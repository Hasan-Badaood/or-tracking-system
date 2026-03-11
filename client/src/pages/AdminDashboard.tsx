import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportsAPI, DailySummary, StageDurationRow } from '@/api/reports';
import { visitsAPI, Visit } from '@/api/visits';
import { roomsAPI, Room } from '@/api/rooms';
import { authAPI } from '@/api/auth';
import {
  LayoutDashboard,
  Activity,
  BarChart2,
  Users,
  LogOut,
  RefreshCw,
  Clock,
  DoorOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

type Section = 'overview' | 'live' | 'reports' | 'users';

const STAGE_COLORS: Record<string, string> = {
  Arrived: '#3498db',
  'Pre-Op': '#f39c12',
  'Pre-Op Assessment': '#f39c12',
  Ready: '#27ae60',
  'Ready for Theatre': '#27ae60',
  'In Theatre': '#e74c3c',
  Recovery: '#9b59b6',
  Discharged: '#95a5a6',
};

const STAGE_ORDER = ['Arrived', 'Pre-Op', 'Pre-Op Assessment', 'Ready', 'Ready for Theatre', 'In Theatre', 'Recovery', 'Discharged'];

const formatMins = (mins: number) => {
  if (!mins || mins <= 0) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const timeInStage = (updatedAt: string) => {
  const mins = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000);
  return formatMins(mins);
};

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [section, setSection] = useState<Section>('overview');

  // Overview data
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Reports data
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [stageDurations, setStageDurations] = useState<StageDurationRow[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [durationsLoading, setDurationsLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [durationsError, setDurationsError] = useState('');

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [summary, roomData, visitsData] = await Promise.all([
        reportsAPI.getDailySummary(today),
        roomsAPI.getAll(),
        visitsAPI.getAll({ active: true, limit: 100 }),
      ]);
      setTodaySummary(summary);
      setRooms(roomData);
      setActiveVisits(visitsData.visits);
      setLastRefresh(new Date());
    } catch {
      // keep existing
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    const interval = setInterval(loadOverview, 60000);
    return () => clearInterval(interval);
  }, [loadOverview]);

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const loadDailyReport = async () => {
    setReportLoading(true);
    setReportError('');
    try {
      setDailySummary(await reportsAPI.getDailySummary(reportDate));
    } catch (err: any) {
      setReportError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  const loadDurations = async () => {
    setDurationsLoading(true);
    setDurationsError('');
    try {
      setStageDurations(await reportsAPI.getStageDurations(startDate, endDate));
    } catch (err: any) {
      setDurationsError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setDurationsLoading(false);
    }
  };

  // Compute stage distribution from active visits
  const stageDistribution = React.useMemo(() => {
    const counts: Record<string, number> = {};
    activeVisits.forEach((v) => {
      const name = v.current_stage.name;
      counts[name] = (counts[name] ?? 0) + 1;
    });
    return counts;
  }, [activeVisits]);

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'live', label: 'Live Patients', icon: <Activity className="h-4 w-4" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart2 className="h-4 w-4" /> },
    { id: 'users', label: 'User Management', icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 flex flex-col">
        <div className="px-5 py-6 border-b border-slate-700">
          <p className="text-white font-bold text-base leading-tight">OR Tracking</p>
          <p className="text-slate-400 text-xs mt-0.5">Admin Console</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.id === 'users' ? navigate('/users') : setSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                section === item.id && item.id !== 'users'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-700">
          <div className="px-3 py-2 mb-2">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <p className="text-slate-400 text-xs capitalize">{user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {section === 'overview' && 'Overview'}
              {section === 'live' && 'Live Patients'}
              {section === 'reports' && 'Reports'}
            </h1>
            <p className="text-sm text-gray-500">
              {section === 'overview' && `Today — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`}
              {section === 'live' && `${activeVisits.length} active patients`}
              {section === 'reports' && 'Analytics and utilisation data'}
            </p>
          </div>
          {section === 'overview' && (
            <Button variant="outline" size="sm" onClick={loadOverview} disabled={overviewLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${overviewLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-6">

          {/* ── OVERVIEW ── */}
          {section === 'overview' && (
            <div className="space-y-6">
              {overviewLoading && !todaySummary ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-5 pb-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Today</p>
                            <p className="text-4xl font-bold text-gray-900 mt-1">
                              {todaySummary?.summary.total_visits ?? 0}
                            </p>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">Patient visits registered today</p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-5 pb-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Now</p>
                            <p className="text-4xl font-bold text-blue-600 mt-1">
                              {activeVisits.length}
                            </p>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                            <Activity className="h-5 w-5 text-red-500" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">Currently in the system</p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-5 pb-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Discharged</p>
                            <p className="text-4xl font-bold text-green-600 mt-1">
                              {todaySummary?.summary.completed_visits ?? 0}
                            </p>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">Completed visits today</p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardContent className="pt-5 pb-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Duration</p>
                            <p className="text-4xl font-bold text-purple-600 mt-1">
                              {formatMins(todaySummary?.summary.average_duration_minutes ?? 0)}
                            </p>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">Average visit duration today</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Patient pipeline */}
                    <Card className="xl:col-span-2 border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-700">Patient Pipeline — Right Now</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {activeVisits.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 text-sm">No active patients</div>
                        ) : (
                          <div className="space-y-3">
                            {STAGE_ORDER.filter((s) => stageDistribution[s] > 0).map((stageName) => {
                              const count = stageDistribution[stageName] ?? 0;
                              const pct = Math.round((count / activeVisits.length) * 100);
                              const color = STAGE_COLORS[stageName] ?? '#666';
                              return (
                                <div key={stageName}>
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700">{stageName}</span>
                                    <span className="text-gray-500">{count} patient{count !== 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                                    <div
                                      className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                                      style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: color }}
                                    >
                                      <span className="text-white text-xs font-bold">{pct}%</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* OR Room status */}
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-700">OR Room Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {rooms.map((room) => (
                            <div key={room.id} className="flex items-center justify-between py-2 border-b last:border-0">
                              <div className="flex items-center gap-2">
                                <DoorOpen className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700">{room.name}</span>
                              </div>
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                  room.status === 'Available' ? 'bg-green-100 text-green-700' :
                                  room.status === 'Occupied'  ? 'bg-red-100 text-red-700' :
                                  room.status === 'Cleaning'  ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {room.status}
                              </span>
                            </div>
                          ))}
                          <div className="pt-2 flex gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                              {rooms.filter((r) => r.status === 'Available').length} free
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                              {rooms.filter((r) => r.status === 'Occupied').length} occupied
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                              {rooms.filter((r) => r.status === 'Cleaning').length} cleaning
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Today's stage breakdown */}
                  {todaySummary && todaySummary.by_stage.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-700">Today's Stage Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                          {todaySummary.by_stage.map((row) => (
                            <div
                              key={row.stage_name}
                              className="rounded-xl p-4 text-center"
                              style={{ backgroundColor: (STAGE_COLORS[row.stage_name] ?? '#666') + '18', borderLeft: `3px solid ${STAGE_COLORS[row.stage_name] ?? '#666'}` }}
                            >
                              <p className="text-2xl font-bold text-gray-900">{row.count}</p>
                              <p className="text-xs font-medium text-gray-600 mt-1 leading-tight">{row.stage_name}</p>
                              {row.average_duration_minutes > 0 && (
                                <p className="text-xs text-gray-400 mt-1">avg {formatMins(row.average_duration_minutes)}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <p className="text-xs text-gray-400 text-right">
                    Last refreshed {lastRefresh.toLocaleTimeString()} — auto-updates every minute
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── LIVE PATIENTS ── */}
          {section === 'live' && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Visit ID</TableHead>
                      <TableHead className="font-semibold">Patient</TableHead>
                      <TableHead className="font-semibold">MRN</TableHead>
                      <TableHead className="font-semibold">Stage</TableHead>
                      <TableHead className="font-semibold">OR Room</TableHead>
                      <TableHead className="font-semibold">Time in Stage</TableHead>
                      <TableHead className="font-semibold">Arrived</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeVisits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                          No active patients right now
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeVisits.map((visit) => (
                        <TableRow key={visit.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-xs text-gray-600">{visit.visit_tracking_id}</TableCell>
                          <TableCell className="font-medium">{visit.patient.first_name} {visit.patient.last_name}</TableCell>
                          <TableCell className="text-gray-500 text-sm">{visit.patient.mrn}</TableCell>
                          <TableCell>
                            <Badge
                              className="text-white text-xs font-medium"
                              style={{ backgroundColor: STAGE_COLORS[visit.current_stage.name] ?? '#666' }}
                            >
                              {visit.current_stage.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{visit.or_room?.name ?? '—'}</TableCell>
                          <TableCell className="text-sm text-gray-600">{timeInStage(visit.updated_at)}</TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(visit.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => navigate(`/update-stage?visitId=${visit.visit_tracking_id}`)}
                            >
                              Update
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ── REPORTS ── */}
          {section === 'reports' && (
            <div className="space-y-6">
              {/* Daily Summary */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Daily Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-3 mb-5">
                    <div className="space-y-1">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="w-44"
                      />
                    </div>
                    <Button onClick={loadDailyReport} disabled={reportLoading} className="bg-blue-600 hover:bg-blue-700">
                      {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load'}
                    </Button>
                  </div>

                  {reportError && (
                    <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg mb-4">
                      <AlertCircle className="h-4 w-4" />
                      {reportError}
                    </div>
                  )}

                  {dailySummary && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                        {[
                          { label: 'Total Visits', value: dailySummary.summary.total_visits, color: 'text-gray-900' },
                          { label: 'Active', value: dailySummary.summary.active_visits, color: 'text-blue-600' },
                          { label: 'Completed', value: dailySummary.summary.completed_visits, color: 'text-green-600' },
                          { label: 'Cancelled', value: dailySummary.summary.cancelled_visits, color: 'text-red-500' },
                          { label: 'Avg Duration', value: formatMins(dailySummary.summary.average_duration_minutes), color: 'text-purple-600' },
                          { label: 'OR Utilisation', value: `${dailySummary.summary.or_utilization_rate}%`, color: 'text-orange-500' },
                        ].map((s) => (
                          <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead>Stage</TableHead>
                            <TableHead className="text-right">Patients</TableHead>
                            <TableHead className="text-right">Avg Time in Stage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailySummary.by_stage.map((row) => (
                            <TableRow key={row.stage_name}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-3 h-3 rounded-full inline-block"
                                    style={{ backgroundColor: STAGE_COLORS[row.stage_name] ?? '#666' }}
                                  />
                                  {row.stage_name}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold">{row.count}</TableCell>
                              <TableCell className="text-right text-gray-500">
                                {formatMins(row.average_duration_minutes)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}

                  {!dailySummary && !reportLoading && !reportError && (
                    <p className="text-sm text-gray-400 text-center py-6">Select a date and click Load</p>
                  )}
                </CardContent>
              </Card>

              {/* Stage Duration */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Average Time per Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-3 mb-5">
                    <div className="space-y-1">
                      <Label>Start</Label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-44" />
                    </div>
                    <div className="space-y-1">
                      <Label>End</Label>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-44" />
                    </div>
                    <Button onClick={loadDurations} disabled={durationsLoading} className="bg-blue-600 hover:bg-blue-700">
                      {durationsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load'}
                    </Button>
                  </div>

                  {durationsError && (
                    <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg mb-4">
                      <AlertCircle className="h-4 w-4" />
                      {durationsError}
                    </div>
                  )}

                  {stageDurations.length > 0 && (
                    <div className="space-y-3">
                      {stageDurations.map((row) => {
                        const maxMins = Math.max(...stageDurations.map((r) => r.average_minutes));
                        const pct = maxMins > 0 ? Math.round((row.average_minutes / maxMins) * 100) : 0;
                        const color = STAGE_COLORS[row.stage_name] ?? '#666';
                        return (
                          <div key={row.stage_name} className="flex items-center gap-4">
                            <div className="w-36 text-sm font-medium text-gray-700 shrink-0">{row.stage_name}</div>
                            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}
                              />
                            </div>
                            <div className="w-24 text-right">
                              <span className="text-sm font-bold text-gray-800">{formatMins(row.average_minutes)}</span>
                              <span className="text-xs text-gray-400 ml-1">avg</span>
                            </div>
                            <div className="w-28 text-xs text-gray-400 text-right">
                              {formatMins(row.min_minutes)} – {formatMins(row.max_minutes)}
                            </div>
                            <div className="w-16 text-xs text-gray-400 text-right">
                              n={row.sample_size}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {stageDurations.length === 0 && !durationsLoading && !durationsError && (
                    <p className="text-sm text-gray-400 text-center py-6">Select a date range and click Load</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};
