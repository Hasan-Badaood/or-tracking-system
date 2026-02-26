import React, { useState } from 'react';
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
import { mockVisits, mockRooms, mockStages } from '@/lib/mockData';
import { ArrowLeft, Check } from 'lucide-react';

export const UpdateStagePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const visitId = searchParams.get('visitId') || 'VT-20260226-001';

  const visit = mockVisits.find(v => v.visit_tracking_id === visitId) || mockVisits[0];
  const currentStageIndex = mockStages.findIndex(s => s.id === visit.current_stage.id);

  const [selectedStage, setSelectedStage] = useState(visit.current_stage.name);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [notes, setNotes] = useState('');

  const stageHistory = [
    {
      stage: 'Ready for Theatre',
      time: '08:15 AM',
      user: 'Nurse Lisa',
      note: 'Pre-op complete',
    },
    {
      stage: 'Pre-Op Assessment',
      time: '08:00 AM',
      user: 'Nurse Mike',
      note: 'Vitals checked',
    },
    {
      stage: 'Arrived',
      time: '07:30 AM',
      user: 'Reception Jane',
      note: 'Patient checked in',
    },
  ];

  const handleUpdate = () => {
    console.log('Updating stage to:', selectedStage, 'Room:', selectedRoom, 'Notes:', notes);
    navigate(-1);
  };

  const getStageStatus = (stageName: string) => {
    const stageIndex = mockStages.findIndex(s => s.name === stageName);
    if (stageIndex < currentStageIndex) return 'complete';
    if (stageName === visit.current_stage.name) return 'current';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-slate-700 text-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-slate-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Update Patient Stage</h1>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Patient Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-gray-800">
                Patient: {visit.patient.first_name} {visit.patient.last_name}
              </h2>
              <div className="flex items-center gap-8 text-gray-600">
                <span>MRN: {visit.patient.mrn}</span>
                <span>Visit ID: {visit.visit_tracking_id.replace('VT-20260226-', 'VT-')}</span>
                <span>Current Stage: {visit.current_stage.name}</span>
                <span>OR Room: OR 3</span>
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
              {mockStages.map((stage) => {
                const status = getStageStatus(stage.name);
                const isSelected = selectedStage === stage.name;

                return (
                  <button
                    key={stage.id}
                    onClick={() => setSelectedStage(stage.name)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      status === 'current'
                        ? 'border-red-500 bg-red-500 text-white font-semibold'
                        : status === 'complete'
                        ? `border-2 bg-opacity-20 ${
                            stage.name === 'Arrived'
                              ? 'border-blue-400 bg-blue-100'
                              : stage.name === 'Pre-Op'
                              ? 'border-orange-400 bg-orange-100'
                              : 'border-green-400 bg-green-100'
                          }`
                        : isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div
                      className={`font-semibold ${
                        status === 'current'
                          ? 'text-white'
                          : status === 'complete'
                          ? stage.name === 'Arrived'
                            ? 'text-blue-600'
                            : stage.name === 'Pre-Op'
                            ? 'text-orange-600'
                            : 'text-green-600'
                          : isSelected
                          ? 'text-purple-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {stage.name}
                    </div>
                    {status === 'complete' && (
                      <div className="flex items-center justify-center gap-1 mt-1 text-sm text-green-600">
                        <Check className="h-3 w-3" />
                        Complete
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
                Assign OR Room (if moving to In Theatre):
              </h3>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select OR Room... ▼" />
                </SelectTrigger>
                <SelectContent>
                  {mockRooms
                    .filter(r => r.status === 'available')
                    .map((room) => (
                      <SelectItem key={room.id} value={room.name}>
                        {room.name} - {room.status}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Stage History</h3>
            <div className="space-y-6">
              {stageHistory.map((entry, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                      <Check className="h-5 w-5" />
                    </div>
                    {index < stageHistory.length - 1 && (
                      <div className="w-0.5 h-12 bg-blue-300 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="font-semibold text-gray-800">{entry.stage}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {entry.time} • {entry.user}
                    </p>
                    <p className="text-sm text-gray-500 italic mt-1">"{entry.note}"</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(-1)}
            className="px-8 bg-gray-400 hover:bg-gray-500 text-white border-0"
          >
            CANCEL
          </Button>
          <Button
            size="lg"
            onClick={handleUpdate}
            className="px-8 bg-green-600 hover:bg-green-700 text-white"
          >
            UPDATE STAGE
          </Button>
        </div>
      </main>

      <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-md text-sm shadow-lg">
        Using Mock Data
      </div>
    </div>
  );
};
