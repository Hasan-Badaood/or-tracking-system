import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const mockDailySummary = {
  date: new Date().toISOString().split('T')[0],
  summary: {
    total_visits: 12,
    completed_visits: 7,
    active_visits: 4,
    cancelled_visits: 1,
    average_duration_minutes: 142,
    or_utilization_rate: 68.5,
  },
  by_stage: [
    { stage_name: 'Arrived', count: 12, average_duration_minutes: 18 },
    { stage_name: 'Pre-Op', count: 11, average_duration_minutes: 34 },
    { stage_name: 'Ready', count: 10, average_duration_minutes: 12 },
    { stage_name: 'In Theatre', count: 9, average_duration_minutes: 95 },
    { stage_name: 'Recovery', count: 8, average_duration_minutes: 52 },
    { stage_name: 'Discharged', count: 7, average_duration_minutes: 0 },
  ],
};

const mockStageDurations = [
  { stage_name: 'Arrived', average_minutes: 18, min_minutes: 5, max_minutes: 42, sample_size: 47 },
  { stage_name: 'Pre-Op', average_minutes: 34, min_minutes: 12, max_minutes: 78, sample_size: 45 },
  { stage_name: 'Ready', average_minutes: 12, min_minutes: 3, max_minutes: 31, sample_size: 44 },
  { stage_name: 'In Theatre', average_minutes: 95, min_minutes: 28, max_minutes: 240, sample_size: 43 },
  { stage_name: 'Recovery', average_minutes: 52, min_minutes: 20, max_minutes: 110, sample_size: 40 },
];

const stageColors: Record<string, string> = {
  Arrived: '#3498db',
  'Pre-Op': '#f39c12',
  Ready: '#27ae60',
  'In Theatre': '#e74c3c',
  Recovery: '#9b59b6',
  Discharged: '#95a5a6',
};

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-700 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin — Reports</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="text-white border-white hover:bg-slate-600"
              onClick={() => navigate('/users')}
            >
              User Management
            </Button>
            <span className="text-sm">{user.name} | Admin</span>
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
        <Tabs defaultValue="daily">
          <TabsList>
            <TabsTrigger value="daily">Daily Summary</TabsTrigger>
            <TabsTrigger value="stage-duration">Stage Duration</TabsTrigger>
          </TabsList>

          {/* Daily Summary Tab */}
          <TabsContent value="daily" className="space-y-6">
            <div className="flex items-end gap-4">
              <div className="space-y-1">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-48"
                />
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">Load</Button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Visits</p>
                  <p className="text-3xl font-bold mt-1">{mockDailySummary.summary.total_visits}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold mt-1 text-green-600">
                    {mockDailySummary.summary.completed_visits}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-3xl font-bold mt-1 text-blue-600">
                    {mockDailySummary.summary.active_visits}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-3xl font-bold mt-1">
                    {formatMinutes(mockDailySummary.summary.average_duration_minutes)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">OR Utilisation</p>
                  <p className="text-3xl font-bold mt-1">
                    {mockDailySummary.summary.or_utilization_rate}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                  <p className="text-3xl font-bold mt-1 text-red-500">
                    {mockDailySummary.summary.cancelled_visits}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* By stage table */}
            <Card>
              <CardHeader>
                <CardTitle>Breakdown by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Patients</TableHead>
                      <TableHead className="text-right">Avg Time in Stage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockDailySummary.by_stage.map((row) => (
                      <TableRow key={row.stage_name}>
                        <TableCell>
                          <Badge
                            style={{ backgroundColor: stageColors[row.stage_name] ?? '#666' }}
                            className="text-white"
                          >
                            {row.stage_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{row.count}</TableCell>
                        <TableCell className="text-right">
                          {row.average_duration_minutes > 0
                            ? formatMinutes(row.average_duration_minutes)
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stage Duration Tab */}
          <TabsContent value="stage-duration" className="space-y-6">
            <div className="flex items-end gap-4">
              <div className="space-y-1">
                <Label htmlFor="start">Start Date</Label>
                <Input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end">End Date</Label>
                <Input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-48"
                />
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">Load</Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Average Time per Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead className="text-right">Average</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                      <TableHead className="text-right">Max</TableHead>
                      <TableHead className="text-right">Sample</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockStageDurations.map((row) => (
                      <TableRow key={row.stage_name}>
                        <TableCell>
                          <Badge
                            style={{ backgroundColor: stageColors[row.stage_name] ?? '#666' }}
                            className="text-white"
                          >
                            {row.stage_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatMinutes(row.average_minutes)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatMinutes(row.min_minutes)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatMinutes(row.max_minutes)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.sample_size}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-4">
                  Chart visualisations are planned for the next sprint.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-md text-sm shadow-lg">
        Using Mock Data
      </div>
    </div>
  );
};
