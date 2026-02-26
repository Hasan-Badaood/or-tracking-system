import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { VisitCard } from '@/components/VisitCard';
import { CreateVisitForm } from '@/components/CreateVisitForm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockVisits, mockRooms, Visit, Room } from '@/lib/mockData';
import { Plus, RefreshCw, Grid3x3, List, Activity, Users, Clock, AlertCircle } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setVisits(mockVisits);
      setRooms(mockRooms);
      setLoading(false);
      setRefreshing(false);
    }, 500);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchData();
  };

  const getStageCount = (stageName: string) => {
    return visits.filter(v => v.current_stage.name === stageName).length;
  };

  const stats = [
    { label: 'Total Patients', value: visits.length, icon: Users, color: 'text-blue-600' },
    { label: 'In Theatre', value: getStageCount('In Theatre'), icon: Activity, color: 'text-red-600' },
    { label: 'In Recovery', value: getStageCount('Recovery'), icon: Clock, color: 'text-purple-600' },
    { label: 'Waiting', value: getStageCount('Pre-Op'), icon: AlertCircle, color: 'text-yellow-600' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="OR Dashboard"
        subtitle={`${visits.length} active patients • ${rooms.filter(r => r.status === 'available').length} rooms available`}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Patient Tracking</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              {showForm ? 'Hide Form' : 'New Visit'}
            </Button>
          </div>
        </div>

        {/* Create Visit Form */}
        {showForm && (
          <div className="mb-6">
            <CreateVisitForm
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="grid" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grid">
              <Grid3x3 className="h-4 w-4 mr-2" />
              Grid View
            </TabsTrigger>
            <TabsTrigger value="table">
              <List className="h-4 w-4 mr-2" />
              Table View
            </TabsTrigger>
            <TabsTrigger value="rooms">
              <Activity className="h-4 w-4 mr-2" />
              Operating Rooms
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : visits.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visits.map((visit: Visit) => (
                  <VisitCard key={visit.id} visit={visit} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No active visits</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="table">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visit ID</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Current Stage</TableHead>
                    <TableHead>Arrival Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell className="font-medium">
                        {visit.visit_tracking_id}
                      </TableCell>
                      <TableCell>
                        {visit.patient.first_name} {visit.patient.last_name}
                      </TableCell>
                      <TableCell>{visit.patient.mrn}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: visit.current_stage.color, color: 'white' }}>
                          {visit.current_stage.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(visit.created_at).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="rooms">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <Card key={room.id} className={
                  room.status === 'available' ? 'border-green-500' :
                  room.status === 'occupied' ? 'border-red-500' :
                  room.status === 'cleaning' ? 'border-yellow-500' :
                  'border-gray-500'
                }>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{room.name}</CardTitle>
                      <Badge variant={
                        room.status === 'available' ? 'default' :
                        room.status === 'occupied' ? 'destructive' :
                        'secondary'
                      }>
                        {room.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  {room.status === 'occupied' && (
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Patient:</span>
                        <p className="font-medium">{room.currentPatient}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Surgeon:</span>
                        <p className="font-medium">{room.surgeon}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Procedure:</span>
                        <p className="font-medium">{room.procedure}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Start Time:</span>
                        <p className="font-medium">{room.startTime}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mock Data Badge */}
      <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-md text-sm shadow-lg">
        Using Mock Data
      </div>
    </div>
  );
};
