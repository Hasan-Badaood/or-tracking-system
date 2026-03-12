import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { visitsAPI, Visit, TimelineEvent } from '@/api/visits';
import { stagesAPI, Stage } from '@/api/stages';
import { roomsAPI, Room } from '@/api/rooms';
import { Navbar } from '@/components/layout/Navbar';
import { Check, Loader2 } from 'lucide-react';

export const UpdateStagePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const trackingId = searchParams.get('visitId') || '';

  const [visit, setVisit] = useState<Visit | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [stagesData, roomsData] = await Promise.all([
          stagesAPI.getAll(),
          roomsAPI.getAll(),
        ]);
        setStages(stagesData);
        setRooms(roomsData);

        if (trackingId) {
          const visitData = await visitsAPI.getByTrackingId(trackingId);
          setVisit(visitData);
          setSelectedStageId(visitData.current_stage.id);

          const timelineData = await visitsAPI.getTimeline(visitData.id);
          setTimeline(timelineData);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load visit data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [trackingId]);

  const handleUpdate = async () => {
    if (!visit || !selectedStageId) return;
    setSaving(true);
    setError('');

    try {
      await visitsAPI.updateStage(
        visit.id,
        selectedStageId,
        selectedRoomId ? parseInt(selectedRoomId) : undefined,
        notes || undefined
      );
      navigate(-1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update stage');
      setSaving(false);
    }
  };

  const currentStageIndex = visit
    ? stages.findIndex((s) => s.id === visit.current_stage.id)
    : -1;

  const getStageStatus = (stage: Stage) => {
    if (!visit) return 'upcoming';
    const idx = stages.findIndex((s) => s.id === stage.id);
    if (idx < currentStageIndex) return 'complete';
    if (stage.id === visit.current_stage.id) return 'current';
    return 'upcoming';
  };

  const availableRooms = rooms.filter((r) => r.status === 'Available');
  const needsRoom = selectedStageId
    ? stages.find((s) => s.id === selectedStageId)?.name === 'In Theatre'
    : false;

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Visit not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Update Stage" onBack={() => navigate(-1)} />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* Patient Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-gray-800">
                Patient: {visit.patient.first_name} {visit.patient.last_name}
              </h2>
              <div className="flex items-center gap-8 text-gray-600">
                <span>MRN: {visit.patient.mrn}</span>
                <span>Visit ID: {visit.visit_tracking_id}</span>
                <span>Current Stage: {visit.current_stage.name}</span>
                {visit.or_room && <span>OR Room: {visit.or_room.name}</span>}
              </div>
              <div>
                <Badge
                  className="text-white font-semibold px-4 py-1"
                  style={{ backgroundColor: visit.current_stage.color }}
                >
                  {visit.current_stage.name.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Select New Stage */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Select New Stage:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {stages.map((stage) => {
                const status = getStageStatus(stage);
                const isSelected = selectedStageId === stage.id;

                return (
                  <button
                    key={stage.id}
                    onClick={() => setSelectedStageId(stage.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      status === 'current'
                        ? 'border-red-500 bg-red-500 text-white font-semibold'
                        : status === 'complete'
                        ? 'border-green-400 bg-green-50'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div
                      className={`font-semibold text-sm ${
                        status === 'current'
                          ? 'text-white'
                          : status === 'complete'
                          ? 'text-green-600'
                          : isSelected
                          ? 'text-blue-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {stage.name}
                    </div>
                    {status === 'complete' && (
                      <div className="flex items-center justify-center gap-1 mt-1 text-xs text-green-600">
                        <Check className="h-3 w-3" />
                        Done
                      </div>
                    )}
                    {status === 'current' && (
                      <div className="text-xs mt-1 text-white">CURRENT</div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* OR Room and Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assign OR Room */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Assign OR Room {needsRoom ? '(required for In Theatre)' : '(optional)'}:
              </h3>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select OR Room..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map((room) => (
                    <SelectItem key={room.id} value={String(room.id)}>
                      {room.name} - Available
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableRooms.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">No rooms currently available</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Notes (optional):</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this stage change..."
                className="min-h-[100px] resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Stage History */}
        {timeline.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Stage History</h3>
              <div className="space-y-6">
                {timeline.map((entry, index) => (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                        <Check className="h-5 w-5" />
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="w-0.5 h-12 bg-blue-300 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="font-semibold text-gray-800">
                        {entry.from_stage
                          ? `${entry.from_stage.name} → ${entry.to_stage.name}`
                          : entry.to_stage.name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatTime(entry.created_at)}
                        {entry.updated_by_user && ` • ${entry.updated_by_user.name}`}
                        {entry.duration_minutes != null && ` • ${entry.duration_minutes}m`}
                      </p>
                      {entry.notes && (
                        <p className="text-sm text-gray-500 italic mt-1">"{entry.notes}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(-1)}
            className="px-8 bg-gray-400 hover:bg-gray-500 text-white border-0"
            disabled={saving}
          >
            CANCEL
          </Button>
          <Button
            size="lg"
            onClick={handleUpdate}
            disabled={saving || !selectedStageId || selectedStageId === visit.current_stage.id}
            className="px-8 bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'UPDATE STAGE'
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};
