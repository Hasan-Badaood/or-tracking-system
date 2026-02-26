import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { mockVisits, mockStages, Visit } from '@/lib/mockData';
import { ArrowRight, Clock, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const NurseDashboard: React.FC = () => {
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [selectedStage, setSelectedStage] = useState('');

  const myPatients = mockVisits.filter(v =>
    ['Pre-Op', 'Ready', 'Recovery'].includes(v.current_stage.name)
  );

  const urgentTasks = [
    { id: 1, patient: 'John Smith', task: 'Pre-op medication due', priority: 'high' },
    { id: 2, patient: 'Sarah Johnson', task: 'Vital signs check', priority: 'medium' },
    { id: 3, patient: 'Michael Williams', task: 'Recovery assessment', priority: 'high' },
  ];

  const handleStageUpdate = () => {
    console.log('Updating stage for', selectedVisit?.patient.first_name, 'to', selectedStage);
    setSelectedVisit(null);
    setSelectedStage('');
  };

  const getPatientsByStage = (stageName: string) => {
    return mockVisits.filter(v => v.current_stage.name === stageName);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Nurse Station"
        subtitle={`${myPatients.length} patients under your care • ${urgentTasks.filter(t => t.priority === 'high').length} urgent tasks`}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">My Patients</p>
                  <p className="text-3xl font-bold mt-1">{myPatients.length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Pre-Op</p>
                  <p className="text-3xl font-bold mt-1">{getPatientsByStage('Pre-Op').length}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Recovery</p>
                  <p className="text-3xl font-bold mt-1">{getPatientsByStage('Recovery').length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Urgent Tasks</p>
                  <p className="text-3xl font-bold mt-1">
                    {urgentTasks.filter(t => t.priority === 'high').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Urgent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Urgent Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgentTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${
                    task.priority === 'high'
                      ? 'border-red-200 bg-red-50'
                      : 'border-yellow-200 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{task.patient}</p>
                      <p className="text-sm text-muted-foreground mt-1">{task.task}</p>
                    </div>
                    <Badge
                      variant={task.priority === 'high' ? 'destructive' : 'default'}
                      className="ml-2"
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  <Button size="sm" className="w-full mt-2" variant="outline">
                    Mark Complete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Patient List */}
          <Card className="lg:col-span-2">
            <Tabs defaultValue="preop">
              <CardHeader>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="preop">Pre-Op</TabsTrigger>
                  <TabsTrigger value="recovery">Recovery</TabsTrigger>
                  <TabsTrigger value="all">All Patients</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="preop" className="mt-0 space-y-3">
                  {getPatientsByStage('Pre-Op').map((visit) => (
                    <Card key={visit.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">
                              {visit.patient.first_name} {visit.patient.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              MRN: {visit.patient.mrn} • {visit.visit_tracking_id}
                            </p>
                            <div className="mt-2">
                              <Badge style={{ backgroundColor: visit.current_stage.color, color: 'white' }}>
                                {visit.current_stage.name}
                              </Badge>
                            </div>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => setSelectedVisit(visit)}
                              >
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Update Stage
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Patient Stage</DialogTitle>
                                <DialogDescription>
                                  Update the current stage for {visit.patient.first_name} {visit.patient.last_name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Current Stage</label>
                                  <Badge style={{ backgroundColor: visit.current_stage.color, color: 'white' }}>
                                    {visit.current_stage.name}
                                  </Badge>
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
                                  className="w-full"
                                  onClick={handleStageUpdate}
                                  disabled={!selectedStage}
                                >
                                  Update Stage
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="recovery" className="mt-0 space-y-3">
                  {getPatientsByStage('Recovery').map((visit) => (
                    <Card key={visit.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">
                              {visit.patient.first_name} {visit.patient.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              MRN: {visit.patient.mrn} • {visit.visit_tracking_id}
                            </p>
                            <div className="mt-2">
                              <Badge style={{ backgroundColor: visit.current_stage.color, color: 'white' }}>
                                {visit.current_stage.name}
                              </Badge>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="all" className="mt-0 space-y-3">
                  {myPatients.map((visit) => (
                    <Card key={visit.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">
                              {visit.patient.first_name} {visit.patient.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              MRN: {visit.patient.mrn} • {visit.visit_tracking_id}
                            </p>
                            <div className="mt-2">
                              <Badge style={{ backgroundColor: visit.current_stage.color, color: 'white' }}>
                                {visit.current_stage.name}
                              </Badge>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </main>

      <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-md text-sm shadow-lg">
        Using Mock Data
      </div>
    </div>
  );
};
