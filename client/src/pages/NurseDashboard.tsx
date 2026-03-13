import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { visitsAPI, Visit } from '@/api/visits';
import { roomsAPI, Room } from '@/api/rooms';
import { Navbar } from '@/components/layout/Navbar';
import { Camera, Loader2 } from 'lucide-react';

const ROOM_STATUS_STYLES: Record<string, { dot: string; label: string; badge: string }> = {
  Available:   { dot: 'bg-emerald-500', label: 'text-emerald-700', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  Occupied:    { dot: 'bg-red-500',     label: 'text-red-700',     badge: 'bg-red-50 border-red-200 text-red-700' },
  Cleaning:    { dot: 'bg-amber-500',   label: 'text-amber-700',   badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  Maintenance: { dot: 'bg-slate-400',   label: 'text-slate-600',   badge: 'bg-slate-50 border-slate-200 text-slate-600' },
};

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

  const fetchVisits = useCallback(async () => {
    try {
      const data = await visitsAPI.getAll({ active: true, limit: 100 });
      setVisits(data.visits);
    } catch { /* keep existing */ }
    finally { setLoadingVisits(false); }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await roomsAPI.getAll();
      setRooms(data);
    } catch { /* keep existing */ }
    finally { setLoadingRooms(false); }
  }, []);

  useEffect(() => {
    fetchVisits();
    fetchRooms();
  }, [fetchVisits, fetchRooms]);

  useEffect(() => {
    const interval = setInterval(() => { fetchVisits(); fetchRooms(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchVisits, fetchRooms]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    } catch { /* keep existing */ }
    finally { setUpdatingRoom(null); }
  };

  const handleScan = (result: string) => {
    setShowScanner(false);
    navigate(`/update-stage?visitId=${result.trim()}`);
  };

  const getTimeInStage = (updatedAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000);
    if (!isFinite(minutes) || minutes < 0) return '—';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const inTheatre  = visits.filter((v) => v.current_stage.name === 'In Theatre').length;
  const inRecovery = visits.filter((v) => v.current_stage.name === 'Recovery').length;
  const preOp      = visits.filter((v) => ['Arrived', 'Pre-Op', 'Ready'].includes(v.current_stage.name)).length;
  const availableRooms = rooms.filter((r) => r.status === 'Available').length;

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar title="Nurse Station" />

      <main className="p-3 sm:p-5 space-y-4 max-w-7xl mx-auto">

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Active patients', value: visits.length,  color: 'text-blue-600' },
            { label: 'In theatre',      value: inTheatre,      color: 'text-red-600' },
            { label: 'In recovery',     value: inRecovery,     color: 'text-purple-600' },
            { label: 'Rooms free',      value: availableRooms, color: 'text-emerald-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 shadow-sm">
              <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{loadingVisits && label !== 'Rooms free' ? '—' : value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Scan + Rooms row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Scan card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Scan patient barcode</h2>
              <p className="text-xs text-slate-400 mt-0.5">Use camera or type the Visit ID manually</p>
            </div>
            <div className="p-5 space-y-4">
              {showScanner ? (
                <BarcodeScanner
                  onScan={handleScan}
                  onClose={() => setShowScanner(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="w-full h-44 sm:h-52 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-blue-400 transition-colors flex flex-col items-center justify-center gap-3 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                    <Camera className="h-7 w-7 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-slate-600 font-medium text-sm">Activate camera</p>
                    <p className="text-slate-400 text-xs mt-0.5">Scan CODE128 barcode</p>
                  </div>
                </button>
              )}

              {/* Manual entry */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={visitId}
                  onChange={(e) => setVisitId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="VT-20260305-001"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                />
                <button
                  onClick={handleSearch}
                  disabled={!visitId.trim()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  Go
                </button>
              </div>
            </div>
          </div>

          {/* OR rooms card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">OR room status</h2>
                <p className="text-xs text-slate-400 mt-0.5">{availableRooms} of {rooms.length} available</p>
              </div>
              {loadingRooms && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>
            <div className="p-5">
              {loadingRooms && rooms.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rooms.map((room) => {
                    const style = ROOM_STATUS_STYLES[room.status] ?? ROOM_STATUS_STYLES.Maintenance;
                    return (
                      <div key={room.id} className="rounded-xl border border-slate-200 p-3 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                          <span className="font-semibold text-slate-800 text-sm truncate">{room.name}</span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${style.badge}`}>
                          {room.status}
                        </span>
                        <Select
                          value={room.status}
                          onValueChange={(val) => handleRoomStatusChange(room.id, val as Room['status'])}
                          disabled={updatingRoom === room.id}
                        >
                          <SelectTrigger className="h-7 text-xs border-slate-200">
                            {updatingRoom === room.id
                              ? <span className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>
                              : <SelectValue />
                            }
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Available">Available</SelectItem>
                            <SelectItem value="Occupied">Occupied</SelectItem>
                            <SelectItem value="Cleaning">Cleaning</SelectItem>
                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Active patients table ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">Active patients</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {visits.length} patient{visits.length !== 1 ? 's' : ''} · last updated {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          {loadingVisits ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
          ) : visits.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-400 text-sm">No active patients right now</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="hidden sm:table-cell text-left px-4 sm:px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Visit ID</th>
                    <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Patient</th>
                    <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Stage</th>
                    <th className="hidden md:table-cell text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Room</th>
                    <th className="hidden md:table-cell text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Time</th>
                    <th className="px-4 sm:px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                      <td className="hidden sm:table-cell px-4 sm:px-5 py-3 font-mono text-xs text-slate-500">{visit.visit_tracking_id}</td>
                      <td className="px-4 sm:px-5 py-3 font-medium text-slate-800 text-sm">
                        {visit.patient.first_name} {visit.patient.last_name.charAt(0)}.
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <Badge
                          className="text-white text-xs font-medium px-2 py-0.5 whitespace-nowrap"
                          style={{ backgroundColor: visit.current_stage.color }}
                        >
                          {visit.current_stage.name}
                        </Badge>
                      </td>
                      <td className="hidden md:table-cell px-5 py-3 text-slate-500 text-sm">{visit.or_room?.name || <span className="text-slate-300">—</span>}</td>
                      <td className="hidden md:table-cell px-5 py-3 text-slate-500 tabular-nums text-sm">{getTimeInStage(visit.updated_at)}</td>
                      <td className="px-4 sm:px-5 py-3 text-right">
                        <button
                          onClick={() => navigate(`/update-stage?visitId=${visit.visit_tracking_id}`)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};
