import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { visitsAPI, Visit } from '@/api/visits';
import { roomsAPI, Room } from '@/api/rooms';
import { authAPI } from '@/api/auth';
import { Camera, Loader2 } from 'lucide-react';

export const NurseDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [visitId, setVisitId] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [updatingRoom, setUpdatingRoom] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchVisits = useCallback(async () => {
    try {
      const data = await visitsAPI.getAll({ active: true, limit: 100 });
      setVisits(data.visits);
    } catch {
      // keep existing data
    } finally {
      setLoadingVisits(false);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await roomsAPI.getAll();
      setRooms(data);
    } catch {
      // keep existing data
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    fetchVisits();
    fetchRooms();
  }, [fetchVisits, fetchRooms]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchVisits();
      fetchRooms();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchVisits, fetchRooms]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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

  const handleSearch = () => {
    if (visitId.trim()) {
      navigate(`/update-stage?visitId=${visitId.trim()}`);
      setVisitId('');
    }
  };

  const handleRoomStatusChange = async (roomId: number, status: Room['status']) => {
    setUpdatingRoom(roomId);
    try {
      await roomsAPI.updateStatus(roomId, status);
      setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, status } : r));
    } catch {
      // keep existing
    } finally {
      setUpdatingRoom(null);
    }
  };

  const handleScan = (result: string) => {
    setShowScanner(false);
    navigate(`/update-stage?visitId=${result.trim()}`);
  };

  const getTimeInStage = (updatedAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getRoomStatusColor = (status: Room['status']) => {
    switch (status) {
      case 'Available': return 'bg-green-600';
      case 'Occupied': return 'bg-red-600';
      case 'Cleaning': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Nurse Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">{user.name || 'Nurse'} | Nurse</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scan Patient Barcode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Scan Patient Barcode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {showScanner ? (
                  <BarcodeScanner
                    onScan={handleScan}
                    onClose={() => setShowScanner(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-colors cursor-pointer"
                  >
                    <Camera className="h-16 w-16 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600 font-medium">Click to activate camera</p>
                    <p className="text-gray-400 text-sm mt-1">Scan CODE128 barcode</p>
                  </button>
                )}

                <div className="space-y-3">
                  <p className="font-medium text-gray-700">Or manual entry:</p>
                  <Input
                    value={visitId}
                    onChange={(e) => setVisitId(e.target.value)}
                    placeholder="Type Visit Tracking ID (e.g., VT-20260305-001)"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button
                    onClick={handleSearch}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Search
                  </Button>
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
              {loadingRooms ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {rooms.map((room) => (
                    <div key={room.id} className="rounded-lg border overflow-hidden">
                      <div className={`p-3 text-center font-semibold text-white ${getRoomStatusColor(room.status)}`}>
                        <div className="text-base">{room.name}</div>
                        <div className="text-xs">{room.status}</div>
                      </div>
                      <div className="p-2 bg-white">
                        <Select
                          value={room.status}
                          onValueChange={(val) => handleRoomStatusChange(room.id, val as Room['status'])}
                          disabled={updatingRoom === room.id}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Available">Available</SelectItem>
                            <SelectItem value="Occupied">Occupied</SelectItem>
                            <SelectItem value="Cleaning">Cleaning</SelectItem>
                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Patients Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Active Patients</CardTitle>
              <div className="text-sm text-green-600">
                Live | Last updated: {currentTime.toLocaleTimeString()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingVisits ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
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
                  {visits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No active patients
                      </TableCell>
                    </TableRow>
                  ) : (
                    visits.map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell className="font-medium">{visit.visit_tracking_id}</TableCell>
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
                        <TableCell>{visit.or_room?.name || '-'}</TableCell>
                        <TableCell>{getTimeInStage(visit.updated_at)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => navigate(`/update-stage?visitId=${visit.visit_tracking_id}`)}
                          >
                            Update Stage
                          </Button>
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
    </div>
  );
};
