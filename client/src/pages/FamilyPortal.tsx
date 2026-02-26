import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { mockVisits, Visit } from '@/lib/mockData';
import { Search, Clock, MapPin, CheckCircle } from 'lucide-react';

export const FamilyPortal: React.FC = () => {
  const [visitId, setVisitId] = useState('');
  const [foundVisit, setFoundVisit] = useState<Visit | null>(null);
  const [searchError, setSearchError] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');

    const visit = mockVisits.find(v => v.visit_tracking_id === visitId.toUpperCase());

    if (visit) {
      setFoundVisit(visit);
    } else {
      setSearchError('Visit not found. Please check the ID and try again.');
      setFoundVisit(null);
    }
  };

  const getStageProgress = (currentStage: string) => {
    const stages = ['Arrived', 'Pre-Op', 'Ready', 'In Theatre', 'Recovery', 'Discharged'];
    const currentIndex = stages.indexOf(currentStage);
    return ((currentIndex + 1) / stages.length) * 100;
  };

  const timeline = [
    { stage: 'Arrived', icon: CheckCircle, time: '08:30 AM' },
    { stage: 'Pre-Op', icon: Clock, time: '09:15 AM' },
    { stage: 'Ready', icon: CheckCircle, time: '10:00 AM' },
    { stage: 'In Theatre', icon: MapPin, time: 'In Progress' },
    { stage: 'Recovery', icon: Clock, time: 'Pending' },
    { stage: 'Discharged', icon: Clock, time: 'Pending' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary">Family Portal</h1>
            <p className="text-muted-foreground mt-2">
              Track your loved one's surgical journey
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Track Patient Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="visitId">Visit Tracking ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="visitId"
                    value={visitId}
                    onChange={(e) => setVisitId(e.target.value)}
                    placeholder="Enter Visit ID (e.g., VT-20260226-001)"
                    className="flex-1"
                  />
                  <Button type="submit">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The Visit ID was provided to you at registration
                </p>
              </div>
              {searchError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {searchError}
                </div>
              )}
            </form>

            {/* Sample IDs */}
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm font-medium text-blue-900 mb-2">Demo Visit IDs:</p>
              <div className="flex flex-wrap gap-2">
                {mockVisits.slice(0, 3).map((visit) => (
                  <Button
                    key={visit.id}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setVisitId(visit.visit_tracking_id);
                      setFoundVisit(visit);
                      setSearchError('');
                    }}
                  >
                    {visit.visit_tracking_id}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {foundVisit && (
          <div className="space-y-6">
            {/* Patient Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Patient Information</CardTitle>
                  <Badge
                    className="text-base px-3 py-1"
                    style={{
                      backgroundColor: foundVisit.current_stage.color,
                      color: 'white'
                    }}
                  >
                    {foundVisit.current_stage.name}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Patient Name</p>
                  <p className="text-lg font-semibold">
                    {foundVisit.patient.first_name} {foundVisit.patient.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Visit ID</p>
                  <p className="font-medium">{foundVisit.visit_tracking_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Checked In</p>
                  <p className="font-medium">
                    {new Date(foundVisit.created_at).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Progress Bar */}
            <Card>
              <CardHeader>
                <CardTitle>Surgical Journey Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-500"
                      style={{ width: `${getStageProgress(foundVisit.current_stage.name)}%` }}
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  {timeline.map((item, index) => {
                    const stages = ['Arrived', 'Pre-Op', 'Ready', 'In Theatre', 'Recovery', 'Discharged'];
                    const currentIndex = stages.indexOf(foundVisit.current_stage.name);
                    const isCompleted = stages.indexOf(item.stage) < currentIndex;
                    const isCurrent = item.stage === foundVisit.current_stage.name;
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.stage}
                        className={`flex items-center gap-4 p-3 rounded-lg ${
                          isCurrent
                            ? 'bg-blue-50 border border-blue-200'
                            : isCompleted
                            ? 'bg-green-50'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : isCompleted
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${isCurrent ? 'text-blue-900' : ''}`}>
                            {item.stage}
                          </p>
                          <p className="text-sm text-muted-foreground">{item.time}</p>
                        </div>
                        {isCurrent && (
                          <Badge variant="default">Current</Badge>
                        )}
                        {isCompleted && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Information */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Updates every 5 minutes</p>
                    <p className="text-sm text-blue-700 mt-1">
                      This page refreshes automatically. You will be notified of any status changes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Card */}
        {!foundVisit && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">How to use this portal</h3>
                <div className="text-muted-foreground space-y-2 max-w-md mx-auto">
                  <p>1. Enter the Visit Tracking ID provided at registration</p>
                  <p>2. View real-time updates on your loved one's progress</p>
                  <p>3. Track each stage of the surgical journey</p>
                  <p className="text-sm mt-4">
                    For demo purposes, try one of the sample Visit IDs above
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-md text-sm shadow-lg">
        Using Mock Data
      </div>
    </div>
  );
};
