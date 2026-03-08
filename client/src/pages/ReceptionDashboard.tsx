import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { visitsAPI, Visit } from '@/api/visits';
import { authAPI } from '@/api/auth';
import { CreateVisitForm } from '@/components/CreateVisitForm';
import { printBarcode } from '@/lib/printBarcode';
import { Search, Printer, Eye, Check, X, Loader2 } from 'lucide-react';

export const ReceptionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchVisits = useCallback(async () => {
    try {
      const data = await visitsAPI.getAll({
        active: true,
        limit: 100,
        ...(searchQuery && { search: searchQuery }),
      });
      setVisits(data.visits);
    } catch {
      // failed silently, keep existing data
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Debounce search — covers initial load and subsequent searches
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVisits();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore errors on logout
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    fetchVisits();
  };

  const totalVisits = visits.length;
  const pendingPreOp = visits.filter(v =>
    v.current_stage.name === 'Pre-Op' || v.current_stage.name === 'Arrived'
  ).length;
  const inSurgery = visits.filter(v => v.current_stage.name === 'In Theatre').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Reception Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">{user.name || 'Reception'} | Reception</span>
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
        {/* Stats and New Visit Button */}
        <div className="flex gap-6">
          <div className="flex-1 grid grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <div className="text-5xl font-bold text-blue-500 mb-2">{totalVisits}</div>
                <div className="text-gray-600 font-medium">Active Visits Today</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <div className="text-5xl font-bold text-orange-500 mb-2">{pendingPreOp}</div>
                <div className="text-gray-600 font-medium">Pending Pre-Op</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <div className="text-5xl font-bold text-red-500 mb-2">{inSurgery}</div>
                <div className="text-gray-600 font-medium">In Surgery</div>
              </CardContent>
            </Card>
          </div>

          <div className="w-64">
            <Button
              onClick={() => setShowCreateForm(true)}
              className="w-full h-full bg-green-600 hover:bg-green-700 text-white text-xl font-semibold flex flex-col items-center justify-center gap-2"
            >
              <span className="text-3xl">+</span>
              <span>New Visit</span>
              <span className="text-sm font-normal">Register Patient</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, MRN, or Visit Tracking ID..."
                className="pl-10 h-12 text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Patients Table */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">Visit ID</TableHead>
                    <TableHead className="font-semibold text-gray-700">Patient Name</TableHead>
                    <TableHead className="font-semibold text-gray-700">MRN</TableHead>
                    <TableHead className="font-semibold text-gray-700">Current Stage</TableHead>
                    <TableHead className="font-semibold text-gray-700">OR Room</TableHead>
                    <TableHead className="font-semibold text-gray-700">Family Contact</TableHead>
                    <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No visits found
                      </TableCell>
                    </TableRow>
                  ) : (
                    visits.map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell className="font-medium">{visit.visit_tracking_id}</TableCell>
                        <TableCell>
                          {visit.patient.first_name} {visit.patient.last_name}
                        </TableCell>
                        <TableCell>{visit.patient.mrn}</TableCell>
                        <TableCell>
                          <Badge
                            className="w-full justify-center py-1 text-white font-medium"
                            style={{ backgroundColor: visit.current_stage.color }}
                          >
                            {visit.current_stage.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {visit.or_room?.name || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {visit.family_contacts && visit.family_contacts.length > 0 ? (
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-red-600 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                              onClick={() => printBarcode(visit)}
                            >
                              <Printer className="h-4 w-4 mr-1" />
                              Print
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-300 text-gray-700"
                              onClick={() => navigate(`/update-stage?visitId=${visit.visit_tracking_id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create Visit Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Patient Visit</DialogTitle>
          </DialogHeader>
          <CreateVisitForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
