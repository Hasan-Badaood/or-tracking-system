import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockVisits, mockRooms } from '@/lib/mockData';
import { Search, Printer, Eye, Check, X } from 'lucide-react';

export const ReceptionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const totalVisits = mockVisits.length * 4;
  const pendingPreOp = mockVisits.filter(v => v.current_stage.name === 'Pre-Op').length + 3;
  const inSurgery = mockVisits.filter(v => v.current_stage.name === 'In Theatre').length;

  const getRoomForVisit = (visit: any) => {
    if (visit.current_stage.name === 'In Theatre') {
      const occupied = mockRooms.filter(r => r.status === 'occupied');
      return occupied[Math.floor(Math.random() * occupied.length)]?.name || 'OR 3';
    }
    return '-';
  };

  const hasFamilyContact = (visit: any) => {
    return Math.random() > 0.3;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Reception Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">{user.name || 'Jane Smith'} | Reception</span>
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
            {/* Total Visits Today */}
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <div className="text-5xl font-bold text-blue-500 mb-2">{totalVisits}</div>
                <div className="text-gray-600 font-medium">Total Visits Today</div>
              </CardContent>
            </Card>

            {/* Pending Pre-Op */}
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <div className="text-5xl font-bold text-orange-500 mb-2">{pendingPreOp}</div>
                <div className="text-gray-600 font-medium">Pending Pre-Op</div>
              </CardContent>
            </Card>

            {/* In Surgery */}
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <div className="text-5xl font-bold text-red-500 mb-2">{inSurgery}</div>
                <div className="text-gray-600 font-medium">In Surgery</div>
              </CardContent>
            </Card>
          </div>

          {/* New Visit Button */}
          <div className="w-64">
            <Button className="w-full h-full bg-green-600 hover:bg-green-700 text-white text-xl font-semibold flex flex-col items-center justify-center gap-2">
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
                placeholder="Search by MRN or Visit Tracking ID..."
                className="pl-10 h-12 text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Patients Table */}
        <Card>
          <CardContent className="pt-6">
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
                {mockVisits.map((visit) => {
                  const hasContact = hasFamilyContact(visit);
                  return (
                    <TableRow key={visit.id}>
                      <TableCell className="font-medium">
                        {visit.visit_tracking_id.replace('VT-20260226-', 'VT-')}
                      </TableCell>
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
                      <TableCell className="text-center">{getRoomForVisit(visit)}</TableCell>
                      <TableCell className="text-center">
                        {hasContact ? (
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
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-md text-sm shadow-lg">
        Using Mock Data
      </div>
    </div>
  );
};
