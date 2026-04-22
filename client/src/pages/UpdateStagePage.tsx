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
import { Check, Loader2, Bell } from 'lucide-react';

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
  const [dischargeNote, setDischargeNote] = useState('');
  const [notifying, setNotifying] = useState(false);
  const [notifyResult, setNotifyResult] = useState<{ email: number; sms: number } | null>(null);
  const [notifyError, setNotifyError] = useState('');

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

          // Pre-select the next stage in sequence
          const currentIdx = stagesData.findIndex((s) => s.id === visitData.current_stage.id);
          const nextStage = stagesData[currentIdx + 1];
          setSelectedStageId(nextStage ? nextStage.id : null);

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

    if (needsRoom && !selectedRoomId) {
      setError('An OR room must be assigned before moving the patient to In Theatre.');
      return;
    }

    if (isDischarging && !dischargeNote.trim()) {
      setError('A discharge note is required (e.g. "Discharged to home" or "Discharged to Ward 3").');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await visitsAPI.updateStage(
        visit.id,
        selectedStageId,
        selectedRoomId ? parseInt(selectedRoomId) : undefined,
        notes || undefined,
        dischargeNote.trim() || undefined
      );
      navigate(-1);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to update stage');
      setSaving(false);
    }
  };

  const handleNotify = async () => {
    if (!visit) return;
    setNotifying(true);
    setNotifyResult(null);
    setNotifyError('');
    try {
      const result = await visitsAPI.notifyFamily(visit.id);
      setNotifyResult(result.sent);
    } catch (err: any) {
      setNotifyError(err.response?.data?.error || 'Failed to send notifications');
    } finally {
      setNotifying(false);
    }
  };

  const currentStageIndex = visit
    ? stages.findIndex((s) => s.id === visit.current_stage.id)
    : -1;

  const nextStageIndex = currentStageIndex + 1;

  const getStageStatus = (stage: Stage) => {
    if (!visit) return 'upcoming';
    const idx = stages.findIndex((s) => s.id === stage.id);
    if (idx < currentStageIndex) return 'complete';
    if (stage.id === visit.current_stage.id) return 'current';
    return 'upcoming';
  };

  const isStageSelectable = (stage: Stage) => {
    const idx = stages.findIndex((s) => s.id === stage.id);
    return idx === nextStageIndex;
  };

  const availableRooms = rooms.filter((r) => r.status === 'Available');
  const selectedStageName = selectedStageId
    ? stages.find((s) => s.id === selectedStageId)?.name.trim().toLowerCase()
    : '';
  const needsRoom = selectedStageName === 'in theatre';
  const isDischarging = selectedStageName === 'discharged';

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!trackingId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar title="Update Stage" onBack={() => navigate(-1)} />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-3">
            <p className="text-gray-500 text-lg">No visit selected</p>
            <p className="text-gray-400 text-sm">Scan a patient barcode or navigate from the dashboard.</p>
            <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar title="Update Stage" onBack={() => navigate(-1)} />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-3">
            <p className="text-gray-500 text-lg">Visit not found</p>
            <p className="text-gray-400 text-sm">Tracking ID: {trackingId}</p>
            <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          </div>
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
              {visit.notes && (
                <p className="text-sm text-gray-500 italic mt-1">"{visit.notes}"</p>
              )}
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
                const selectable = isStageSelectable(stage);
                const isSelected = selectedStageId === stage.id;

                return (
                  <button
                    key={stage.id}
                    onClick={() => {
                      if (!selectable) return;
                      setSelectedStageId(stage.id);
                      // Clear room selection if the new stage does not require one
                      const stageName = stage.name.trim().toLowerCase();
                      if (stageName !== 'in theatre') setSelectedRoomId('');
                    }}
                    disabled={!selectable && status !== 'current'}
                    title={
                      status === 'complete'
                        ? 'Already completed'
                        : !selectable && status !== 'current'
                        ? 'Complete the previous stage first'
                        : undefined
                    }
                    className={`p-4 rounded-lg border-2 transition-all ${
                      status === 'current'
                        ? 'border-red-500 bg-red-500 text-white font-semibold cursor-default'
                        : status === 'complete'
                        ? 'border-green-400 bg-green-50 opacity-60 cursor-not-allowed'
                        : selectable && isSelected
                        ? 'border-blue-500 bg-blue-50 cursor-pointer'
                        : selectable
                        ? 'border-gray-300 bg-white hover:border-blue-400 cursor-pointer'
                        : 'border-gray-200 bg-gray-50 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`font-semibold text-sm ${
                        status === 'current'
                          ? 'text-white'
                          : status === 'complete'
                          ? 'text-green-600'
                          : selectable && isSelected
                          ? 'text-blue-600'
                          : selectable
                          ? 'text-gray-600'
                          : 'text-gray-400'
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
                    {selectable && (
                      <div className="text-xs mt-1 text-blue-500">NEXT</div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* OR Room and Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assign OR Room — only shown when moving to In Theatre */}
          {needsRoom && (
            <Card className={!selectedRoomId ? 'border-red-400' : ''}>
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  Assign OR Room
                  <span className="ml-2 text-sm font-semibold text-red-600">* required</span>
                </h3>
                {!selectedRoomId && (
                  <p className="text-xs text-red-500 mb-3">Select an available room to continue.</p>
                )}
                {selectedRoomId && <div className="mb-3" />}
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger className={`w-full ${!selectedRoomId ? 'border-red-400 focus:ring-red-300' : ''}`}>
                    <SelectValue placeholder="Select OR Room..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRooms.map((room) => (
                      <SelectItem key={room.id} value={String(room.id)}>
                        {room.name} — Available
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableRooms.length === 0 && (
                  <p className="text-sm text-red-600 font-medium mt-2">
                    No rooms are currently available — all rooms are occupied or being cleaned.
                    Stage cannot be changed to In Theatre until a room is free.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Discharge note — required when moving to Discharged */}
          {isDischarging && (
            <Card className={!dischargeNote.trim() ? 'border-red-400' : ''}>
              <CardContent className="pt-6">
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  Discharge note
                  <span className="ml-2 text-sm font-semibold text-red-600">* required</span>
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Visible to the family. Describe where the patient is going (e.g. "Discharged to home" or "Transferred to Ward 3").
                </p>
                <Textarea
                  value={dischargeNote}
                  onChange={(e) => setDischargeNote(e.target.value)}
                  placeholder="Discharged to home"
                  className={`min-h-[80px] resize-none ${!dischargeNote.trim() ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                />
              </CardContent>
            </Card>
          )}

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Notify family */}
          <div className="flex items-center gap-3">
            {visit.family_contacts && visit.family_contacts.length > 0 && (
              <Button
                variant="outline"
                onClick={handleNotify}
                disabled={notifying}
                className="flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                {notifying
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Bell className="h-4 w-4" />
                }
                Notify family
              </Button>
            )}
            {notifyResult && (
              <span className="text-sm text-emerald-600 font-medium">
                Sent — {notifyResult.email} email{notifyResult.email !== 1 ? 's' : ''}, {notifyResult.sms} SMS
              </span>
            )}
            {notifyError && (
              <span className="text-sm text-red-500">{notifyError}</span>
            )}
          </div>

          <div className="flex gap-4">
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
              disabled={saving || !selectedStageId || selectedStageId === visit.current_stage.id || (needsRoom && !selectedRoomId) || (isDischarging && !dischargeNote.trim())}
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
        </div>
      </main>
    </div>
  );
};
