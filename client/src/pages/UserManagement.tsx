import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usersAPI, StaffUser } from '@/api/users';
import { authAPI } from '@/api/auth';
import { Loader2 } from 'lucide-react';

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  nurse: 'bg-blue-100 text-blue-800',
  reception: 'bg-green-100 text-green-800',
};

const emptyForm = { username: '', name: '', email: '', role: '', password: '' };

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    usersAPI.getAll()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const toggleActive = async (u: StaffUser) => {
    try {
      const updated = await usersAPI.update(u.id, { active: !u.active });
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch {
      // failed silently
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

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">User Management</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="text-white border-white hover:bg-slate-600"
              onClick={() => navigate('/admin')}
            >
              Reports
            </Button>
            <span className="text-sm">{user.name} | Admin</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Staff</p>
              <p className="text-3xl font-bold mt-1">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-3xl font-bold mt-1 text-green-600">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-3xl font-bold mt-1 text-gray-400">{users.length - activeCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Users table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Staff Accounts</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">Add User</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Staff Account</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4 mt-2">
                    <div className="space-y-1">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Nurse Patel"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        placeholder="e.g. nurse.patel"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="email">Email (optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="name@hospital.nhs.uk"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Role</Label>
                      <Select
                        value={form.role}
                        onValueChange={(val) => setForm({ ...form, role: val })}
                      >
                        <SelectTrigger>
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
                      <Label htmlFor="password">Initial Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                    </div>
                    {formError && (
                      <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{formError}</p>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setForm(emptyForm);
                          setFormError('');
                          setDialogOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className={!u.active ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.username}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${roleColors[u.role]}`}
                        >
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(u.last_login)}</TableCell>
                      <TableCell>
                        <Badge variant={u.active ? 'default' : 'secondary'}>
                          {u.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActive(u)}
                          className={
                            u.active
                              ? 'text-red-600 border-red-200 hover:bg-red-50'
                              : 'text-green-600 border-green-200 hover:bg-green-50'
                          }
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
