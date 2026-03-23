import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { reportsAPI, DailySummary, StageDurationRow, DateRangeRow, AuditLogRow } from '@/api/reports';
import { settingsAPI, SmtpConfig } from '@/api/settings';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts';
import { visitsAPI, Visit } from '@/api/visits';
import { roomsAPI, Room } from '@/api/rooms';
import { stagesAPI, Stage as StageConfig } from '@/api/stages';
import { usersAPI, StaffUser } from '@/api/users';
import { Navbar } from '@/components/layout/Navbar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LayoutDashboard,
  Activity,
  BarChart2,
  Users,
  RefreshCw,
  Clock,
  DoorOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Settings,
  Pencil,
  Trash2,
  Plus,
  UserPlus,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

type Section = 'overview' | 'live' | 'reports' | 'audit' | 'users' | 'settings';

const STAGE_COLORS: Record<string, string> = {
  Arrived:    '#3498db',
  'Pre-Op':   '#f39c12',
  Ready:      '#27ae60',
  'In Theatre': '#e74c3c',
  Recovery:   '#9b59b6',
  Discharged: '#95a5a6',
};

const STAGE_ORDER = ['Arrived', 'Pre-Op', 'Ready', 'In Theatre', 'Recovery', 'Discharged'];

const formatMins = (mins: number) => {
  if (mins == null || !isFinite(mins) || mins < 0) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const timeInStage = (updatedAt: string) => {
  const ms = Date.now() - new Date(updatedAt).getTime();
  const mins = Math.floor(ms / 60000);
  if (!isFinite(mins) || mins < 0) return '—';
  return formatMins(mins);
};

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>('overview');

  // Overview data
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Settings: OR rooms management
  const [settingsRooms, setSettingsRooms] = useState<Room[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [roomDialog, setRoomDialog] = useState<'add' | 'edit' | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState({ name: '', room_number: '', room_type: 'General' });
  const [roomFormError, setRoomFormError] = useState('');
  const [savingRoom, setSavingRoom] = useState(false);
  const [togglingRoomId, setTogglingRoomId] = useState<number | null>(null);

  // Settings: notification config
  const [notifConfig, setNotifConfig] = useState<{ emailConfigured: boolean; smsConfigured: boolean } | null>(null);

  // Settings: SMTP form
  const emptySmtpForm: SmtpConfig = { smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '', smtp_secure: 'false' };
  const [smtpForm, setSmtpForm] = useState<SmtpConfig>(emptySmtpForm);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpSaveError, setSmtpSaveError] = useState('');
  const [smtpSaveSuccess, setSmtpSaveSuccess] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<'ok' | 'fail' | null>(null);
  const [smtpTestError, setSmtpTestError] = useState('');

  // Settings: stages management
  const [settingsStages, setSettingsStages] = useState<StageConfig[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [stageDialog, setStageDialog] = useState<'add' | 'edit' | null>(null);
  const [editingStage, setEditingStage] = useState<StageConfig | null>(null);
  const [stageForm, setStageForm] = useState({ name: '', color: '#3498db', description: '' });
  const [stageFormError, setStageFormError] = useState('');
  const [savingStage, setSavingStage] = useState(false);
  const [togglingStageId, setTogglingStageId] = useState<number | null>(null);

  // Users management
  const emptyUserForm = { username: '', name: '', email: '', role: '', password: '' };
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userDialog, setUserDialog] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [userFormError, setUserFormError] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);

  // Audit log
  const [auditRows, setAuditRows] = useState<AuditLogRow[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditOffset, setAuditOffset] = useState(0);
  const AUDIT_PAGE = 50;

  // Reports data
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [reportMode, setReportMode] = useState<'day' | 'range'>('day');
  const [reportDate, setReportDate] = useState(today);
  const [rangeStart, setRangeStart] = useState(sevenDaysAgo);
  const [rangeEnd, setRangeEnd] = useState(today);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [stageDurations, setStageDurations] = useState<StageDurationRow[]>([]);
  const [dateRangeRows, setDateRangeRows] = useState<DateRangeRow[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

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

  const loadSettingsRooms = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const data = await roomsAPI.getAllIncludingInactive();
      setSettingsRooms(data);
    } catch {
      // keep existing
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'settings') loadSettingsRooms();
  }, [section, loadSettingsRooms]);

  const loadSettingsStages = useCallback(async () => {
    setStagesLoading(true);
    try {
      setSettingsStages(await stagesAPI.getAll(true));
    } catch {
      // keep existing
    } finally {
      setStagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'settings') loadSettingsStages();
  }, [section, loadSettingsStages]);

  useEffect(() => {
    if (section !== 'settings') return;
    reportsAPI.getNotificationConfig().then(setNotifConfig).catch(() => {});
    setSmtpLoading(true);
    settingsAPI.getSmtp()
      .then((cfg) => setSmtpForm(cfg))
      .catch(() => {})
      .finally(() => setSmtpLoading(false));
  }, [section]);

  const openAddStage = () => {
    setStageForm({ name: '', color: '#3498db', description: '' });
    setStageFormError('');
    setEditingStage(null);
    setStageDialog('add');
  };

  const openEditStage = (stage: StageConfig) => {
    setStageForm({ name: stage.name, color: stage.color, description: stage.description ?? '' });
    setStageFormError('');
    setEditingStage(stage);
    setStageDialog('edit');
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setStageFormError('');
    if (!stageForm.name.trim() || !stageForm.color.trim()) {
      setStageFormError('Name and colour are required.');
      return;
    }
    setSavingStage(true);
    try {
      if (stageDialog === 'add') {
        const created = await stagesAPI.create({
          name: stageForm.name.trim(),
          color: stageForm.color.trim(),
          description: stageForm.description.trim() || undefined,
        });
        setSettingsStages((prev) => [...prev, created]);
      } else if (editingStage) {
        const updated = await stagesAPI.update(editingStage.id, {
          name: stageForm.name.trim(),
          color: stageForm.color.trim(),
          description: stageForm.description.trim() || undefined,
        });
        setSettingsStages((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      }
      setStageDialog(null);
    } catch (err: any) {
      setStageFormError(err.response?.data?.error || 'Failed to save stage');
    } finally {
      setSavingStage(false);
    }
  };

  const handleToggleStage = async (stage: StageConfig) => {
    setTogglingStageId(stage.id);
    try {
      const updated = await stagesAPI.update(stage.id, { active: !stage.active });
      setSettingsStages((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch {
      // failed silently
    } finally {
      setTogglingStageId(null);
    }
  };

  const moveStage = async (stage: StageConfig, direction: 'up' | 'down') => {
    const sorted = [...settingsStages].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((s) => s.id === stage.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const other = sorted[swapIdx];
    const newOrderThis = other.display_order;
    const newOrderOther = stage.display_order;

    // Optimistically update UI
    setSettingsStages((prev) => prev.map((s) => {
      if (s.id === stage.id) return { ...s, display_order: newOrderThis };
      if (s.id === other.id) return { ...s, display_order: newOrderOther };
      return s;
    }));

    try {
      await Promise.all([
        stagesAPI.update(stage.id, { display_order: newOrderThis }),
        stagesAPI.update(other.id, { display_order: newOrderOther }),
      ]);
    } catch {
      // Revert on failure
      loadSettingsStages();
    }
  };

  const loadStaffUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      setStaffUsers(await usersAPI.getAll());
    } catch {
      // keep existing
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'users') loadStaffUsers();
  }, [section, loadStaffUsers]);

  const loadAuditLog = useCallback(async (offset: number) => {
    setAuditLoading(true);
    try {
      const data = await reportsAPI.getAuditLog(AUDIT_PAGE, offset);
      setAuditRows(data.rows);
      setAuditTotal(data.total);
    } catch { /* keep existing */ }
    finally { setAuditLoading(false); }
  }, []);

  useEffect(() => {
    if (section === 'audit') loadAuditLog(auditOffset);
  }, [section, auditOffset, loadAuditLog]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');
    if (!userForm.username || !userForm.name || !userForm.role || !userForm.password) {
      setUserFormError('Username, name, role, and password are required.');
      return;
    }
    setSavingUser(true);
    try {
      const newUser = await usersAPI.create({
        username: userForm.username,
        name: userForm.name,
        role: userForm.role,
        password: userForm.password,
        ...(userForm.email && { email: userForm.email }),
      });
      setStaffUsers((prev) => [newUser, ...prev]);
      setUserForm(emptyUserForm);
      setUserDialog(false);
    } catch (err: any) {
      setUserFormError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleUser = async (u: StaffUser) => {
    setTogglingUserId(u.id);
    try {
      const updated = await usersAPI.update(u.id, { active: !u.active });
      setStaffUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch {
      // failed silently
    } finally {
      setTogglingUserId(null);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const exportCSV = (filename: string, rows: string[][], headers: string[]) => {
    const lines = [headers, ...rows].map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDayReport = () => {
    if (!dailySummary) return;
    exportCSV(
      `report-${dailySummary.date}.csv`,
      dailySummary.by_stage.map((r) => [r.stage_name, String(r.count), String(r.average_duration_minutes)]),
      ['Stage', 'Count', 'Avg Duration (mins)'],
    );
  };

  const exportRangeReport = () => {
    if (!dateRangeRows.length) return;
    exportCSV(
      `report-range.csv`,
      dateRangeRows.map((r) => [r.date, String(r.total), String(r.completed), String(r.active)]),
      ['Date', 'Total', 'Completed', 'Active'],
    );
  };

  const openAddRoom = () => {
    setRoomForm({ name: '', room_number: '', room_type: 'General' });
    setRoomFormError('');
    setEditingRoom(null);
    setRoomDialog('add');
  };

  const openEditRoom = (room: Room) => {
    setRoomForm({ name: room.name, room_number: room.room_number ?? '', room_type: room.room_type ?? 'General' });
    setRoomFormError('');
    setEditingRoom(room);
    setRoomDialog('edit');
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomFormError('');
    if (!roomForm.name.trim() || !roomForm.room_number.trim()) {
      setRoomFormError('Room name and number are required.');
      return;
    }
    setSavingRoom(true);
    try {
      if (roomDialog === 'add') {
        const created = await roomsAPI.create({ name: roomForm.name.trim(), room_number: roomForm.room_number.trim(), room_type: roomForm.room_type });
        setSettingsRooms((prev) => [...prev, created]);
      } else if (editingRoom) {
        const updated = await roomsAPI.update(editingRoom.id, { name: roomForm.name.trim(), room_number: roomForm.room_number.trim(), room_type: roomForm.room_type });
        setSettingsRooms((prev) => prev.map((r) => r.id === updated.id ? updated : r));
      }
      setRoomDialog(null);
    } catch (err: any) {
      setRoomFormError(err.response?.data?.error || 'Failed to save room');
    } finally {
      setSavingRoom(false);
    }
  };

  const handleToggleRoom = async (room: Room) => {
    if (room.active) {
      const ok = window.confirm(`Deactivate room "${room.name}"? It will no longer appear for staff.`);
      if (!ok) return;
    }
    setTogglingRoomId(room.id);
    try {
      const updated = await roomsAPI.update(room.id, { active: !room.active });
      setSettingsRooms((prev) => prev.map((r) => r.id === updated.id ? updated : r));
    } catch {
      // failed silently
    } finally {
      setTogglingRoomId(null);
    }
  };

  const loadDayReport = useCallback(async (date: string) => {
    setReportLoading(true);
    try {
      const [summary, durations] = await Promise.all([
        reportsAPI.getDailySummary(date),
        reportsAPI.getStageDurations(date, date),
      ]);
      setDailySummary(summary);
      setStageDurations(durations);
    } catch {
      // keep existing
    } finally {
      setReportLoading(false);
    }
  }, []);

  const loadRangeReport = useCallback(async (start: string, end: string) => {
    setReportLoading(true);
    try {
      const [rows, durations] = await Promise.all([
        reportsAPI.getDateRange(start, end),
        reportsAPI.getStageDurations(start, end),
      ]);
      setDateRangeRows(rows);
      setStageDurations(durations);
    } catch {
      // keep existing
    } finally {
      setReportLoading(false);
    }
  }, []);

  // Auto-load when reports section opens or mode changes
  useEffect(() => {
    if (section !== 'reports') return;
    if (reportMode === 'day') loadDayReport(reportDate);
    else loadRangeReport(rangeStart, rangeEnd);
  }, [section, reportMode]); // eslint-disable-line react-hooks/exhaustive-deps

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
    { id: 'overview',  label: 'Overview',      icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'live',      label: 'Live Patients', icon: <Activity className="h-4 w-4" /> },
    { id: 'reports',   label: 'Reports',       icon: <BarChart2 className="h-4 w-4" /> },
    { id: 'audit',     label: 'Audit Log',     icon: <Clock className="h-4 w-4" /> },
    { id: 'users',     label: 'Users',         icon: <Users className="h-4 w-4" /> },
    { id: 'settings',  label: 'Settings',      icon: <Settings className="h-4 w-4" /> },
  ];

  const sectionTitle =
    section === 'overview' ? 'Overview' :
    section === 'live'     ? 'Live Patients' :
    section === 'reports'  ? 'Reports' :
    section === 'audit'    ? 'Audit Log' :
    section === 'settings' ? 'Settings' : 'Admin';

  const refreshAction = section === 'overview' ? (
    <button
      onClick={loadOverview}
      disabled={overviewLoading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${overviewLoading ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">Refresh</span>
    </button>
  ) : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar title={`Admin — ${sectionTitle}`} actions={refreshAction} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-48 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id as Section)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  section === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

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
            <div className="space-y-5">

              {/* Mode toggle + date controls */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Mode pills */}
                  <div className="flex rounded-lg border border-slate-200 p-0.5 w-fit shrink-0">
                    {(['day', 'range'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setReportMode(m)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          reportMode === m
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {m === 'day' ? 'Single day' : 'Date range'}
                      </button>
                    ))}
                  </div>

                  {/* Date inputs */}
                  {reportMode === 'day' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                      <button
                        onClick={() => loadDayReport(reportDate)}
                        disabled={reportLoading}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
                      >
                        {reportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Load
                      </button>
                      {dailySummary && (
                        <button
                          onClick={exportDayReport}
                          className="px-4 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          Export CSV
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="date"
                        value={rangeStart}
                        onChange={(e) => setRangeStart(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                      <span className="text-slate-400 text-sm">to</span>
                      <input
                        type="date"
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                      <button
                        onClick={() => {
                          if (rangeStart > rangeEnd) { setReportError('Start date must be before end date.'); return; }
                          setReportError('');
                          loadRangeReport(rangeStart, rangeEnd);
                        }}
                        disabled={reportLoading}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-1.5"
                      >
                        {reportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Load
                      </button>
                      {dateRangeRows.length > 0 && (
                        <button
                          onClick={exportRangeReport}
                          className="px-4 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          Export CSV
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {reportError && (
                <p className="text-sm text-red-500 px-1">{reportError}</p>
              )}

              {reportLoading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
              )}

              {/* ── Single day view ── */}
              {!reportLoading && reportMode === 'day' && dailySummary && (
                <>
                  <p className="text-sm font-medium text-slate-500">
                    Showing data for{' '}
                    <span className="text-slate-800 font-semibold">
                      {new Date(reportDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </p>
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    {[
                      { label: 'Total visits',   value: dailySummary.summary.total_visits,              color: 'text-slate-800' },
                      { label: 'Active',          value: dailySummary.summary.active_visits,             color: 'text-blue-600' },
                      { label: 'Completed',       value: dailySummary.summary.completed_visits,          color: 'text-emerald-600' },
                      { label: 'Avg duration',    value: formatMins(dailySummary.summary.average_duration_minutes), color: 'text-purple-600' },
                      { label: 'OR utilisation',  value: dailySummary.summary.or_utilization_rate != null ? `${dailySummary.summary.or_utilization_rate}%` : '—', color: 'text-orange-500' },
                      { label: 'Stage groups',    value: dailySummary.by_stage.length,                  color: 'text-slate-500' },
                    ].map((s) => (
                      <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 shadow-sm text-center">
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Charts row */}
                  {dailySummary.by_stage.length > 0 && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                      {/* Pie — stage distribution */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="font-semibold text-slate-800 mb-4 text-sm">Patient distribution by stage</h3>
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie
                              data={dailySummary.by_stage}
                              dataKey="count"
                              nameKey="stage_name"
                              cx="50%"
                              cy="50%"
                              outerRadius={90}
                              label={({ name, percent }: any) =>
                                (percent ?? 0) > 0.05 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ''
                              }
                              labelLine={false}
                            >
                              {dailySummary.by_stage.map((row) => (
                                <Cell key={row.stage_name} fill={STAGE_COLORS[row.stage_name] ?? '#94a3b8'} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(val: any, name: any) => [val, name]}
                              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Bar — avg time per stage */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="font-semibold text-slate-800 mb-4 text-sm">Avg time per stage (minutes)</h3>
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={dailySummary.by_stage} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="stage_name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(val: any) => [`${val} min`, 'Avg duration']}
                              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                            />
                            <Bar dataKey="average_duration_minutes" radius={[4, 4, 0, 0]}>
                              {dailySummary.by_stage.map((row) => (
                                <Cell key={row.stage_name} fill={STAGE_COLORS[row.stage_name] ?? '#94a3b8'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {dailySummary.by_stage.length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-14 text-center">
                      <p className="text-slate-400 text-sm">No visit data for this date.</p>
                    </div>
                  )}
                </>
              )}

              {/* ── Date range view ── */}
              {!reportLoading && reportMode === 'range' && (
                <>
                  <p className="text-sm font-medium text-slate-500">
                    Showing data from{' '}
                    <span className="text-slate-800 font-semibold">
                      {new Date(rangeStart + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {' '}to{' '}
                    <span className="text-slate-800 font-semibold">
                      {new Date(rangeEnd + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </p>
                  {/* Line chart — daily visits */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h3 className="font-semibold text-slate-800 mb-4 text-sm">Daily visit volume</h3>
                    {dateRangeRows.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={dateRangeRows} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip
                            labelFormatter={(d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                          />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="total"     name="Total"     stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="completed" name="Discharged" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="active"    name="Active"    stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-slate-400 text-sm text-center py-10">No data for this range.</p>
                    )}
                  </div>

                  {/* Bar chart — stage durations over range */}
                  {stageDurations.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                      <h3 className="font-semibold text-slate-800 mb-1 text-sm">Avg time per stage over period</h3>
                      <p className="text-xs text-slate-400 mb-4">Bars show average · whiskers show min–max</p>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={stageDurations} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="stage_name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} unit=" min" />
                          <Tooltip
                            formatter={(val: any, key: any) => [
                              `${val} min`,
                              key === 'average_minutes' ? 'Average' : key === 'min_minutes' ? 'Min' : 'Max',
                            ]}
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                          />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="average_minutes" name="Average" radius={[4, 4, 0, 0]}>
                            {stageDurations.map((row) => (
                              <Cell key={row.stage_name} fill={STAGE_COLORS[row.stage_name] ?? '#94a3b8'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      {/* Sample size note */}
                      <div className="mt-3 flex flex-wrap gap-3">
                        {stageDurations.map((row) => (
                          <span key={row.stage_name} className="text-xs text-slate-400">
                            {row.stage_name}: n={row.sample_size}, {formatMins(row.min_minutes)}–{formatMins(row.max_minutes)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          )}

          {/* ── AUDIT LOG ── */}
          {section === 'audit' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-800">Stage transition log</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{auditTotal} events total</p>
                  </div>
                  <button
                    onClick={() => loadAuditLog(auditOffset)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                </div>

                {auditLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
                  </div>
                ) : auditRows.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-sm">No events recorded yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Time</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Visit</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Patient</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Transition</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">By</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditRows.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap tabular-nums">
                              {new Date(row.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-5 py-3 font-mono text-xs text-slate-500">{row.visit_tracking_id ?? '—'}</td>
                            <td className="px-5 py-3 text-slate-700 text-xs">{row.patient_name ?? '—'}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {row.from_stage ? (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: row.from_stage.color }}>
                                    {row.from_stage.name}
                                  </span>
                                ) : <span className="text-slate-300 text-xs">—</span>}
                                <span className="text-slate-400 text-xs">→</span>
                                {row.to_stage && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: row.to_stage.color }}>
                                    {row.to_stage.name}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-500">
                              {row.updated_by ? (
                                <span>{row.updated_by.name} <span className="text-slate-400">({row.updated_by.role})</span></span>
                              ) : '—'}
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-400 max-w-xs truncate">{row.notes ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {auditTotal > AUDIT_PAGE && (
                  <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Showing {auditOffset + 1}–{Math.min(auditOffset + AUDIT_PAGE, auditTotal)} of {auditTotal}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAuditOffset(Math.max(0, auditOffset - AUDIT_PAGE))}
                        disabled={auditOffset === 0}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setAuditOffset(auditOffset + AUDIT_PAGE)}
                        disabled={auditOffset + AUDIT_PAGE >= auditTotal}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {section === 'users' && (
            <div className="space-y-4">
              {/* Stats + add button */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total staff',  value: staffUsers.length,                              color: 'text-slate-800' },
                    { label: 'Active',       value: staffUsers.filter((u) => u.active).length,      color: 'text-emerald-600' },
                    { label: 'Inactive',     value: staffUsers.filter((u) => !u.active).length,     color: 'text-slate-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 shadow-sm">
                      <p className={`text-2xl font-bold ${color}`}>{usersLoading ? '—' : value}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setUserForm(emptyUserForm); setUserFormError(''); setUserDialog(true); }}
                  className="sm:w-40 flex sm:flex-col items-center justify-center gap-2 sm:gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-3.5 sm:py-0 font-semibold transition-all shadow-sm text-sm"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span className="leading-tight text-center">Add<br className="hidden sm:block" /> staff</span>
                </button>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-800">Staff accounts</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{staffUsers.length} account{staffUsers.length !== 1 ? 's' : ''} registered</p>
                </div>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Name</th>
                          <th className="hidden sm:table-cell text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Username</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</th>
                          <th className="hidden md:table-cell text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Last login</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                          <th className="px-5 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staffUsers.map((u) => (
                          <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.active ? 'opacity-50' : ''}`}>
                            <td className="px-5 py-3.5 font-medium text-slate-800">{u.name}</td>
                            <td className="hidden sm:table-cell px-5 py-3.5 text-slate-500 font-mono text-xs">{u.username}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${
                                u.role === 'admin'     ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                u.role === 'nurse'     ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="hidden md:table-cell px-5 py-3.5 text-slate-500 text-xs">{formatDate(u.last_login)}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                {u.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => handleToggleUser(u)}
                                disabled={togglingUserId === u.id}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 border ${
                                  u.active
                                    ? 'text-red-600 border-red-200 hover:bg-red-50'
                                    : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                                }`}
                              >
                                {togglingUserId === u.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : u.active ? 'Deactivate' : 'Activate'
                                }
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {section === 'settings' && (
            <div className="space-y-6">

              {/* OR Rooms management */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-800">OR rooms</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {settingsRooms.length} room{settingsRooms.length !== 1 ? 's' : ''} configured
                    </p>
                  </div>
                  <button
                    onClick={openAddRoom}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add room
                  </button>
                </div>

                {settingsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  </div>
                ) : settingsRooms.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-slate-400 text-sm">No rooms configured yet.</p>
                    <button
                      onClick={openAddRoom}
                      className="mt-2 text-sm text-blue-500 hover:text-blue-600 font-medium underline underline-offset-2"
                    >
                      Add the first room
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Room name</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Number</th>
                          <th className="hidden sm:table-cell text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Type</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Active</th>
                          <th className="px-5 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {settingsRooms.map((room) => (
                          <tr key={room.id} className={`hover:bg-slate-50 transition-colors ${room.active === false ? 'opacity-50' : ''}`}>
                            <td className="px-5 py-3.5 font-medium text-slate-800">{room.name}</td>
                            <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{room.room_number ?? '—'}</td>
                            <td className="hidden sm:table-cell px-5 py-3.5 text-slate-500 text-xs">{room.room_type ?? 'General'}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                room.status === 'Available'   ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                room.status === 'Occupied'    ? 'bg-red-50 border-red-200 text-red-700' :
                                room.status === 'Cleaning'    ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                'bg-slate-50 border-slate-200 text-slate-600'
                              }`}>
                                {room.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium ${room.active !== false ? 'text-emerald-600' : 'text-slate-400'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${room.active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                {room.active !== false ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditRoom(room)}
                                  title="Edit room"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleToggleRoom(room)}
                                  disabled={togglingRoomId === room.id}
                                  title={room.active !== false ? 'Deactivate' : 'Activate'}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
                                    room.active !== false
                                      ? 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                                      : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                                  }`}
                                >
                                  {togglingRoomId === room.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Trash2 className="w-3.5 h-3.5" />
                                  }
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Surgical stages */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-800">Surgical stages</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {settingsStages.filter((s) => s.active).length} active · ordered by display position
                    </p>
                  </div>
                  <button
                    onClick={openAddStage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add stage
                  </button>
                </div>

                {stagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Order</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Stage name</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Colour</th>
                          <th className="hidden md:table-cell text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Description</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Active</th>
                          <th className="px-5 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...settingsStages].sort((a, b) => a.display_order - b.display_order).map((stage, idx, arr) => (
                          <tr key={stage.id} className={`hover:bg-slate-50 transition-colors ${!stage.active ? 'opacity-50' : ''}`}>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => moveStage(stage, 'up')}
                                  disabled={idx === 0}
                                  className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveStage(stage, 'down')}
                                  disabled={idx === arr.length - 1}
                                  className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-slate-400 font-mono text-xs ml-1">{stage.display_order}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 font-medium text-slate-800">{stage.name}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full border border-white shadow-sm shrink-0" style={{ backgroundColor: stage.color }} />
                                <span className="font-mono text-xs text-slate-400">{stage.color}</span>
                              </div>
                            </td>
                            <td className="hidden md:table-cell px-5 py-3.5 text-slate-500 text-xs">{stage.description || '—'}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium ${stage.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${stage.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                {stage.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditStage(stage)}
                                  title="Edit stage"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleToggleStage(stage)}
                                  disabled={togglingStageId === stage.id}
                                  title={stage.active ? 'Deactivate' : 'Activate'}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
                                    stage.active
                                      ? 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                                      : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                                  }`}
                                >
                                  {togglingStageId === stage.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Trash2 className="w-3.5 h-3.5" />
                                  }
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-800">Notifications</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Email (SMTP) settings for family notifications</p>
                  </div>
                  {notifConfig !== null && (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${notifConfig.emailConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {notifConfig.emailConfigured
                        ? <CheckCircle2 className="h-3.5 w-3.5" />
                        : <AlertCircle className="h-3.5 w-3.5" />
                      }
                      {notifConfig.emailConfigured ? 'Email active' : 'Email not configured'}
                    </span>
                  )}
                </div>
                <div className="px-5 py-5">
                  {smtpLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSmtpSaving(true);
                        setSmtpSaveError('');
                        setSmtpSaveSuccess(false);
                        setSmtpTestResult(null);
                        try {
                          await settingsAPI.updateSmtp(smtpForm);
                          setSmtpSaveSuccess(true);
                          // refresh notification status
                          reportsAPI.getNotificationConfig().then(setNotifConfig).catch(() => {});
                          setTimeout(() => setSmtpSaveSuccess(false), 3000);
                        } catch (err: any) {
                          setSmtpSaveError(err?.response?.data?.error ?? 'Failed to save');
                        } finally {
                          setSmtpSaving(false);
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700">SMTP host</label>
                          <input
                            value={smtpForm.smtp_host}
                            onChange={(e) => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                            placeholder="smtp.example.com"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700">Port</label>
                          <input
                            value={smtpForm.smtp_port}
                            onChange={(e) => setSmtpForm({ ...smtpForm, smtp_port: e.target.value })}
                            placeholder="587"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700">Username</label>
                          <input
                            value={smtpForm.smtp_user}
                            onChange={(e) => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })}
                            placeholder="notifications@example.com"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700">Password</label>
                          <input
                            type="password"
                            value={smtpForm.smtp_pass}
                            onChange={(e) => setSmtpForm({ ...smtpForm, smtp_pass: e.target.value })}
                            placeholder={notifConfig?.emailConfigured ? 'Leave blank to keep existing' : 'SMTP password'}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700">From address</label>
                          <input
                            value={smtpForm.smtp_from}
                            onChange={(e) => setSmtpForm({ ...smtpForm, smtp_from: e.target.value })}
                            placeholder="noreply@hospital.nhs.uk"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-700">Encryption</label>
                          <select
                            value={smtpForm.smtp_secure}
                            onChange={(e) => setSmtpForm({ ...smtpForm, smtp_secure: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                          >
                            <option value="false">STARTTLS (port 587)</option>
                            <option value="true">SSL/TLS (port 465)</option>
                          </select>
                        </div>
                      </div>

                      {smtpSaveError && (
                        <p className="text-xs text-red-600">{smtpSaveError}</p>
                      )}
                      {smtpSaveSuccess && (
                        <p className="text-xs text-emerald-600">Settings saved.</p>
                      )}
                      {smtpTestResult === 'ok' && (
                        <p className="text-xs text-emerald-600">Connection successful.</p>
                      )}
                      {smtpTestResult === 'fail' && (
                        <p className="text-xs text-red-600">Connection failed: {smtpTestError}</p>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="submit"
                          disabled={smtpSaving}
                          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        >
                          {smtpSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          disabled={smtpTesting}
                          onClick={async () => {
                            setSmtpTesting(true);
                            setSmtpTestResult(null);
                            setSmtpTestError('');
                            try {
                              await settingsAPI.testSmtp();
                              setSmtpTestResult('ok');
                            } catch (err: any) {
                              setSmtpTestResult('fail');
                              setSmtpTestError(err?.response?.data?.error ?? 'Unknown error');
                            } finally {
                              setSmtpTesting(false);
                            }
                          }}
                          className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                          {smtpTesting ? 'Testing…' : 'Test connection'}
                        </button>
                      </div>
                    </form>
                  )}

                  {notifConfig !== null && notifConfig.smsConfigured !== undefined && (
                    <div className={`mt-6 rounded-xl border p-4 ${notifConfig.smsConfigured ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex items-center gap-2">
                        {notifConfig.smsConfigured
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          : <AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />
                        }
                        <span className={`text-sm font-semibold ${notifConfig.smsConfigured ? 'text-emerald-700' : 'text-slate-500'}`}>
                          SMS — {notifConfig.smsConfigured ? 'configured via Twilio env vars' : 'not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>
      </div>

      {/* Create user dialog */}
      <Dialog open={userDialog} onOpenChange={(open) => { setUserDialog(open); if (!open) { setUserForm(emptyUserForm); setUserFormError(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create staff account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Full name</label>
              <input
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="e.g. Sarah Patel"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Username</label>
              <input
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                placeholder="e.g. sarah.patel"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Email (optional)</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="name@hospital.nhs.uk"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Role</label>
              <Select value={userForm.role} onValueChange={(val) => setUserForm({ ...userForm, role: val })}>
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="reception">Reception</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Initial password</label>
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            {userFormError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">{userFormError}</p>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setUserDialog(false); setUserForm(emptyUserForm); setUserFormError(''); }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingUser}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingUser && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stage add/edit dialog */}
      <Dialog open={stageDialog !== null} onOpenChange={(open) => { if (!open) setStageDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{stageDialog === 'add' ? 'Add surgical stage' : 'Edit stage'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStage} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Stage name</label>
              <input
                value={stageForm.name}
                onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                placeholder="e.g. Pre-Op"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={stageForm.color}
                  onChange={(e) => setStageForm({ ...stageForm, color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                />
                <input
                  value={stageForm.color}
                  onChange={(e) => setStageForm({ ...stageForm, color: e.target.value })}
                  placeholder="#3498db"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Description (optional)</label>
              <input
                value={stageForm.description}
                onChange={(e) => setStageForm({ ...stageForm, description: e.target.value })}
                placeholder="Short description of this stage"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            {stageFormError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">{stageFormError}</p>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStageDialog(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingStage}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingStage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {stageDialog === 'add' ? 'Add stage' : 'Save'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Room add/edit dialog */}
      <Dialog open={roomDialog !== null} onOpenChange={(open) => { if (!open) setRoomDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{roomDialog === 'add' ? 'Add OR room' : 'Edit room'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveRoom} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Room name</label>
              <input
                value={roomForm.name}
                onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                placeholder="e.g. Operating Room 1"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Room number / code</label>
              <input
                value={roomForm.room_number}
                onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                placeholder="e.g. OR-1"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Room type</label>
              <Select value={roomForm.room_type} onValueChange={(val) => setRoomForm({ ...roomForm, room_type: val })}>
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Recovery">Recovery</SelectItem>
                  <SelectItem value="Prep">Prep</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {roomFormError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">{roomFormError}</p>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setRoomDialog(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingRoom}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingRoom && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {roomDialog === 'add' ? 'Add room' : 'Save'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
