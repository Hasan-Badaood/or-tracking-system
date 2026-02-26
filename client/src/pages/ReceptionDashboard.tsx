import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockVisits, mockPatients } from '@/lib/mockData';
import { UserPlus, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export const ReceptionDashboard: React.FC = () => {
  const [mrn, setMrn] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const todayVisits = mockVisits.slice(0, 5);
  const arrivedVisits = mockVisits.filter(v => v.current_stage.name === 'Arrived');
  const expectedVisits = mockPatients.slice(3, 5);

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Checking in patient:', { mrn, firstName, lastName, phone });
    // Reset form
    setMrn('');
    setFirstName('');
    setLastName('');
    setPhone('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Reception Desk"
        subtitle={`${arrivedVisits.length} patients waiting • ${expectedVisits.length} expected today`}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Visits</p>
                  <p className="text-3xl font-bold mt-1">{todayVisits.length}</p>
                </div>
                <UserPlus className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Checked In</p>
                  <p className="text-3xl font-bold mt-1">{arrivedVisits.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Expected</p>
                  <p className="text-3xl font-bold mt-1">{expectedVisits.length}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Delayed</p>
                  <p className="text-3xl font-bold mt-1">0</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Check-in Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Patient Check-In</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheckIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mrn">MRN</Label>
                  <Input
                    id="mrn"
                    value={mrn}
                    onChange={(e) => setMrn(e.target.value)}
                    placeholder="Medical Record Number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contact number"
                    type="tel"
                  />
                </div>
                <Button type="submit" className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Check In Patient
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lists */}
          <Card className="lg:col-span-2">
            <Tabs defaultValue="arrived">
              <CardHeader>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="arrived">Arrived</TabsTrigger>
                  <TabsTrigger value="expected">Expected</TabsTrigger>
                  <TabsTrigger value="today">Today's Visits</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="arrived" className="mt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>MRN</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {arrivedVisits.map((visit) => (
                        <TableRow key={visit.id}>
                          <TableCell className="font-medium">
                            {visit.patient.first_name} {visit.patient.last_name}
                          </TableCell>
                          <TableCell>{visit.patient.mrn}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(visit.created_at).toLocaleTimeString()}
                          </TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: visit.current_stage.color, color: 'white' }}>
                              {visit.current_stage.name}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="expected" className="mt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>MRN</TableHead>
                        <TableHead>Scheduled Time</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expectedVisits.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium">
                            {patient.first_name} {patient.last_name}
                          </TableCell>
                          <TableCell>{patient.mrn}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(Date.now() + 3600000).toLocaleTimeString()}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              Check In
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="today" className="mt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Visit ID</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayVisits.map((visit) => (
                        <TableRow key={visit.id}>
                          <TableCell className="font-medium">
                            {visit.visit_tracking_id}
                          </TableCell>
                          <TableCell>
                            {visit.patient.first_name} {visit.patient.last_name}
                          </TableCell>
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
