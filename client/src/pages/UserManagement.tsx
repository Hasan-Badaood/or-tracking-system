import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Badge } from '@/components/ui/badge';
import { usersAPI, StaffUser } from '@/api/users';
import { Navbar } from '@/components/layout/Navbar';
import { Loader2, UserPlus, KeyRound } from 'lucide-react';

const ROLE_PILL: Record<string, string> = {
  admin:     'bg-rose-100 text-rose-700 border-rose-200',
  nurse:     'bg-blue-100 text-blue-700 border-blue-200',
  reception: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const emptyForm = { username: '', name: '', email: '', role: '', password: '' };

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    usersAPI.getAll()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (u: StaffUser) => {
    if (u.active && !window.confirm(`Deactivate ${u.name}? They will no longer be able to log in.`)) return;
    setTogglingId(u.id);
    try {
      const updated = await usersAPI.update(u.id, { active: !u.active });
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch {
      // failed silently
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.username || !form.name || !form.role || !form.password) {
      setFormError('Username, name, role, and password are required.');
      return;
    }

    setSaving(true);
    try {
      const newUser = await usersAPI.create({
        username: form.username,
        name: form.name,
        role: form.role,
        password: form.password,
        ...(form.email && { email: form.email }),
      });
      setUsers((prev) => [newUser, ...prev]);
      setForm(emptyForm);
      setDialogOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (newPassword.length < 6) { setResetError('Password must be at least 6 characters.'); return; }
    setResetting(true);
    try {
      await usersAPI.resetPassword(resetTarget!.id, newPassword);
      setResetTarget(null);
      setNewPassword('');
    } catch (err: any) {
      setResetError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const activeCount   = users.filter((u) => u.active).length;
  const inactiveCount = users.length - activeCount;

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar title="User Management" onBack={() => navigate('/admin')} />

      <main className="p-3 sm:p-5 space-y-4 max-w-6xl mx-auto">

        {/* Stats + Add button row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 grid grid-cols-3 gap-3">
            {[
              { label: 'Total staff',  value: users.length,  color: 'text-slate-800' },
              { label: 'Active',       value: activeCount,   color: 'text-emerald-600' },
              { label: 'Inactive',     value: inactiveCount, color: 'text-slate-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 shadow-sm">
                <p className={`text-2xl sm:text-3xl font-bold ${color}`}>
                  {loading ? '—' : value}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setDialogOpen(true)}
            className="sm:w-44 flex sm:flex-col items-center justify-center gap-2 sm:gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl px-5 py-3.5 sm:py-0 font-semibold transition-all shadow-sm"
          >
            <UserPlus className="w-5 h-5 shrink-0" />
            <span className="text-sm leading-tight text-center">Add<br className="hidden sm:block" /> staff</span>
          </button>
        </div>

        {/* Users table card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Staff accounts</h2>
            <p className="text-xs text-slate-400 mt-0.5">{users.length} account{users.length !== 1 ? 's' : ''} registered</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-400 text-sm">No staff accounts yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Name</th>
                    <th className="hidden sm:table-cell text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Username</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</th>
                    <th className="hidden md:table-cell text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</th>
                    <th className="hidden md:table-cell text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Last login</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.active ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{u.name}</td>
                      <td className="hidden sm:table-cell px-5 py-3.5 text-slate-500 font-mono text-xs">{u.username}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${ROLE_PILL[u.role] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-5 py-3.5 text-slate-500 text-xs">{u.email ?? '—'}</td>
                      <td className="hidden md:table-cell px-5 py-3.5 text-slate-500 text-xs">{formatDate(u.last_login)}</td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={u.active ? 'default' : 'secondary'}
                          className={u.active ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : ''}
                        >
                          {u.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setResetTarget(u); setNewPassword(''); setResetError(''); }}
                            title="Reset password"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={togglingId === u.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                              u.active
                                ? 'text-red-600 border border-red-200 hover:bg-red-50'
                                : 'text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
                            }`}
                          >
                            {togglingId === u.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : u.active ? 'Deactivate' : 'Activate'
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
      </main>

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password — {resetTarget?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            {resetError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">{resetError}</p>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetting}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {resetting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Reset
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setForm(emptyForm); setFormError(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create staff account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Full name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Sarah Patel"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Username</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="e.g. sarah.patel"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Email (optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@hospital.nhs.uk"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Role</label>
              <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
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
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">{formError}</p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setDialogOpen(false); setForm(emptyForm); setFormError(''); }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
