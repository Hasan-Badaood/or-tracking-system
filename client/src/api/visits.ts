import apiClient from './client';

export interface Patient {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
}

export interface Stage {
  id: number;
  name: string;
  color: string;
}

export interface Room {
  id: number;
  name: string;
  status?: string;
}

export interface FamilyContact {
  id: number;
  name: string;
  relationship: string;
  email?: string;
  phone?: string;
}

export interface Visit {
  id: number;
  visit_tracking_id: string;
  patient: Patient;
  current_stage: Stage;
  or_room?: Room;
  family_contacts?: FamilyContact[];
  active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: number;
  from_stage?: Stage;
  to_stage: Stage;
  room?: Room;
  updated_by_user?: { name: string };
  notes?: string;
  created_at: string;
  duration_minutes?: number;
}

export interface CreateVisitData {
  patient: {
    mrn: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: string;
  };
  family_contact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    consent_given: boolean;
  };
}

export interface VisitsListParams {
  search?: string;
  stage?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}

export interface VisitsResponse {
  visits: Visit[];
  total?: number;
  page?: number;
  totalPages?: number;
}

// Map the backend data format to the Visit interface
const mapVisit = (data: any): Visit => ({
  id: data.id,
  visit_tracking_id: data.visit_tracking_id,
  patient: data.patient,
  current_stage: data.current_stage,
  or_room: data.or_room ?? undefined,
  family_contacts: data.family_contacts,
  active: data.active,
  notes: data.notes,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

export const visitsAPI = {
  getAll: async (params?: VisitsListParams): Promise<VisitsResponse> => {
    const response = await apiClient.get('/visits', { params });
    const body = response.data;
    return {
      visits: (body.data ?? []).map(mapVisit),
      total: body.pagination?.total,
      page: body.pagination?.page,
      totalPages: body.pagination?.total_pages,
    };
  },

  getById: async (id: number): Promise<Visit> => {
    const response = await apiClient.get(`/visits/${id}`);
    return mapVisit(response.data.data);
  },

  getByTrackingId: async (trackingId: string): Promise<Visit> => {
    const response = await apiClient.get('/visits', {
      params: { search: trackingId, limit: 1 },
    });
    const visits: Visit[] = (response.data.data ?? []).map(mapVisit);
    const visit = visits.find((v) => v.visit_tracking_id === trackingId);
    if (!visit) throw new Error('Visit not found');
    return visit;
  },

  getTimeline: async (id: number): Promise<TimelineEvent[]> => {
    const response = await apiClient.get(`/visits/${id}/timeline`);
    const events = response.data.data?.stage_events ?? [];
    return events.map((e: any) => ({
      id: e.id,
      from_stage: e.from_stage,
      to_stage: e.to_stage,
      room: e.or_room,
      updated_by_user: e.updated_by_user,
      notes: e.notes,
      created_at: e.created_at,
      duration_minutes: e.duration_minutes,
    }));
  },

  create: async (data: CreateVisitData): Promise<Visit> => {
    const response = await apiClient.post('/visits', data);
    return mapVisit(response.data.data);
  },

  update: async (id: number, data: Partial<{ stage_id: number; room_id: number; notes: string; active: boolean }>): Promise<Visit> => {
    const response = await apiClient.put(`/visits/${id}`, data);
    return mapVisit(response.data.data);
  },

  updateStage: async (id: number, toStageId: number, roomId?: number, notes?: string): Promise<Visit> => {
    const response = await apiClient.put(`/visits/${id}/stage`, {
      to_stage_id: toStageId,
      ...(roomId && { or_room_id: roomId }),
      ...(notes && { notes }),
    });
    return mapVisit(response.data.data.updated_visit);
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/visits/${id}`);
  },
};
