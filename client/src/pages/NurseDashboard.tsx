import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { mockVisits, mockRooms, mockStages, Visit } from '@/lib/mockData';
import { Camera, LogOut } from 'lucide-react';

export const NurseDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [visitId, setVisitId] = useState('');
  const [lastSearched, setLastSearched] = useState('VT-003');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [selectedStage, setSelectedStage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSearch = () => {
    if (visitId) {
      setLastSearched(visitId);
      setVisitId('');
    }
  };

  const handleStageUpdate = () => {
    console.log('Updating stage to:', selectedStage);
    setSelectedVisit(null);
    setSelectedStage('');
  };

  const getTimeInStage = (createdAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getRoomForVisit = (visit: Visit) => {
    if (visit.current_stage.name === 'In Theatre') {
      const occupied = mockRooms.filter(r => r.status === 'occupied');
      return occupied[Math.floor(Math.random() * occupied.length)]?.name || '-';
    }
    return '-';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Nurse Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">{user.name} | Nurse</span>
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
        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scan Patient Barcode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Scan Patient Barcode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Camera Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50">
                  <Camera className="h-16 w-16 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">Click to activate camera</p>
                </div>

                {/* Manual Entry */}
                <div className="space-y-3">
                  <p className="font-medium text-gray-700">OR Manual Entry:</p>
                  <Input
                    value={visitId}
                    onChange={(e) => setVisitId(e.target.value)}
                    placeholder="Type Visit Tracking ID (e.g., VT-001)"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSearch}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Search
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-green-700 border-green-300 bg-green-50"
                    >
                      Last: {lastSearched}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* OR Room Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">OR Room Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {mockRooms.map((room) => (
                  <div
                    key={room.id}
                    className={`p-4 rounded-lg text-center font-semibold text-white ${
                      room.status === 'available'
                        ? 'bg-green-600'
                        : room.status === 'occupied'
                        ? 'bg-red-600'
                        : room.status === 'cleaning'
                        ? 'bg-orange-500'
                        : 'bg-gray-500'
                    }`}
                  >
                    <div className="text-lg">{room.name}</div>
                    <div className="text-sm capitalize">{room.status}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Patients Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Active Patients</CardTitle>
              <div className="text-sm text-green-600">
                ● Auto-refresh: ON | Last updated: {currentTime.toLocaleTimeString()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Visit ID</TableHead>
                  <TableHead className="font-semibold">Patient</TableHead>
                  <TableHead className="font-semibold">Current Stage</TableHead>
                  <TableHead className="font-semibold">OR Room</TableHead>
                  <TableHead className="font-semibold">Time in Stage</TableHead>
                  <TableHead className="font-semibold">Quick Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockVisits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="font-medium">
                      {visit.visit_tracking_id.replace('VT-20260226-', 'VT-')}
                    </TableCell>
                    <TableCell>
                      {visit.patient.first_name} {visit.patient.last_name.charAt(0)}.
                    </TableCell>
                    <TableCell>
                      <Badge
                        className="w-full justify-center py-1 text-white font-medium"
                        style={{ backgroundColor: visit.current_stage.color }}
                      >
                        {visit.current_stage.name}
                      </Badge>
                    </TableCell>
                    <TableCell>{getRoomForVisit(visit)}</TableCell>
                    <TableCell>{getTimeInStage(visit.created_at)}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => setSelectedVisit(visit)}
                          >
                            Update Stage →
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update Patient Stage</DialogTitle>
                            <DialogDescription>
                              Update the current stage for {visit.patient.first_name}{' '}
                              {visit.patient.last_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Current Stage</label>
                              <div>
                                <Badge
                                  style={{
                                    backgroundColor: visit.current_stage.color,
                                    color: 'white',
                                  }}
                                >
                                  {visit.current_stage.name}
                                </Badge>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">New Stage</label>
                              <Select value={selectedStage} onValueChange={setSelectedStage}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select new stage" />
                                </SelectTrigger>
                                <SelectContent>
                                  {mockStages.map((stage) => (
                                    <SelectItem key={stage.id} value={stage.name}>
                                      {stage.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              onClick={handleStageUpdate}
                              disabled={!selectedStage}
                            >
                              Update Stage
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
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
