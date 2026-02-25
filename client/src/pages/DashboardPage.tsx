import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VisitCard } from '@/components/VisitCard';
import { CreateVisitForm } from '@/components/CreateVisitForm';
import { Button } from '@/components/ui/button';
import { visitsAPI, Visit } from '@/api/visits';
import { LogOut, Plus, RefreshCw } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchVisits = async () => {
    try {
      setRefreshing(true);
      const data = await visitsAPI.getAll();
      setVisits(data);
    } catch (error) {
      console.error('Failed to fetch visits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVisits();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchVisits, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleCreateSuccess = () => {
    setShowForm(false);
    fetchVisits();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">OR Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {user.name} <span className="text-xs">({user.role})</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchVisits}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Active Visits</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {visits.length} {visits.length === 1 ? 'patient' : 'patients'} currently tracked
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            {showForm ? 'Hide Form' : 'New Visit'}
          </Button>
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

        {/* Visits Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-muted-foreground">Loading visits...</p>
            </div>
          </div>
        ) : visits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                onClick={() => console.log('Visit clicked:', visit.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Active Visits</h3>
            <p className="text-muted-foreground mb-4">
              Create a new visit to start tracking patients
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Visit
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};
