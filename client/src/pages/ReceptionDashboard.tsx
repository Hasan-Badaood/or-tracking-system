import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { visitsAPI, Visit } from '@/api/visits';
import { CreateVisitForm } from '@/components/CreateVisitForm';
import { printBarcode } from '@/lib/printBarcode';
import { Navbar } from '@/components/layout/Navbar';
import { Loader2 } from 'lucide-react';

export const ReceptionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [visits, setVisits]           = useState<Visit[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchVisits = useCallback(async () => {
    try {
      const data = await visitsAPI.getAll({
        active: true,
        limit: 100,
        ...(searchQuery && { search: searchQuery }),
      });
      setVisits(data.visits);
    } catch {
      if (loading) setFetchError('Failed to load visits. Check your connection and refresh.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(fetchVisits, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    fetchVisits();
  };

  const totalVisits  = visits.length;
  const arrived      = visits.filter((v) => ['Arrived', 'Pre-Op', 'Ready'].includes(v.current_stage.name)).length;
  const inSurgery    = visits.filter((v) => v.current_stage.name === 'In Theatre').length;
  const withFamily   = visits.filter((v) => v.family_contacts && v.family_contacts.length > 0).length;

  const filtered = visits; // server-side search already applied

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar title="Reception" />

      <main className="p-3 sm:p-5 space-y-4 max-w-7xl mx-auto">

        {fetchError && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{fetchError}</div>
        )}

        {/* ── Top row: stats + register button ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Stats */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Active visits',   value: totalVisits, color: 'text-blue-600' },
              { label: 'Pre-op / waiting', value: arrived,    color: 'text-amber-600' },
              { label: 'In theatre',      value: inSurgery,   color: 'text-red-600' },
              { label: 'Family notified', value: withFamily,  color: 'text-emerald-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 shadow-sm">
                <p className={`text-2xl sm:text-3xl font-bold ${color}`}>{loading ? '—' : value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Register button */}
          <button
            onClick={() => setShowCreateForm(true)}
            className="sm:w-44 flex sm:flex-col items-center justify-center gap-2 sm:gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl px-5 py-3.5 sm:py-0 font-semibold transition-all shadow-sm shadow-emerald-700/20"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-sm leading-tight text-center">Register<br className="hidden sm:block" /> patient</span>
          </button>
        </div>

        {/* ── Visits table card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Card header with inline search */}
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">Today's visits</h2>
              <p className="text-xs text-slate-400 mt-0.5">{totalVisits} active patient{totalVisits !== 1 ? 's' : ''}</p>
            </div>
            <div className="sm:ml-auto relative w-full sm:w-72">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, MRN or Visit ID…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-400 text-sm">
                {searchQuery ? 'No visits match that search.' : 'No active visits registered today.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-3 text-sm text-blue-500 hover:text-blue-600 font-medium underline underline-offset-2"
                >
                  Register the first patient
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Visit ID</th>
                    <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Patient</th>
                    <th className="hidden sm:table-cell text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">MRN</th>
                    <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Stage</th>
                    <th className="hidden md:table-cell text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Room</th>
                    <th className="hidden md:table-cell text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Family</th>
                    <th className="px-4 sm:px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((visit) => (
                    <tr key={visit.id} className="hover:bg-slate-50 transition-colors group">

                      {/* Visit ID */}
                      <td className="px-4 sm:px-5 py-3.5 font-mono text-xs text-slate-500">
                        {visit.visit_tracking_id}
                      </td>

                      {/* Patient name */}
                      <td className="px-4 sm:px-5 py-3.5">
                        <span className="font-medium text-slate-800">
                          {visit.patient.first_name} {visit.patient.last_name}
                        </span>
                      </td>

                      {/* MRN */}
                      <td className="hidden sm:table-cell px-5 py-3.5 text-slate-500 text-xs font-mono">
                        {visit.patient.mrn}
                      </td>

                      {/* Stage badge */}
                      <td className="px-4 sm:px-5 py-3.5">
                        <Badge
                          className="text-white text-xs font-medium px-2 py-0.5 whitespace-nowrap"
                          style={{ backgroundColor: visit.current_stage.color }}
                        >
                          {visit.current_stage.name}
                        </Badge>
                      </td>

                      {/* OR room */}
                      <td className="hidden md:table-cell px-5 py-3.5 text-slate-500 text-sm">
                        {visit.or_room?.name || <span className="text-slate-300">—</span>}
                      </td>

                      {/* Family contact indicator */}
                      <td className="hidden md:table-cell px-5 py-3.5">
                        {visit.family_contacts && visit.family_contacts.length > 0 ? (
                          <div className="space-y-1">
                            {visit.family_contacts.map((fc) => (
                              <div key={fc.id} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-xs text-slate-700 font-medium truncate max-w-[120px]">{fc.name}</span>
                                <span className="text-xs text-slate-400">· {fc.relationship}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 sm:px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => printBarcode(visit)}
                            title="Print barcode"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => navigate(`/update-stage?visitId=${visit.visit_tracking_id}`)}
                            title="View / update stage"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Register patient dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register new patient visit</DialogTitle>
          </DialogHeader>
          <CreateVisitForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
