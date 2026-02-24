import apiClient from './client';

export interface Patient {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
}

export interface Stage {
  id: number;
  name: string;
  color: string;
}

export interface Visit {
  id: number;
  visit_tracking_id: string;
  patient: Patient;
  current_stage: Stage;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateVisitData {
  patient: {
    mrn: string;
    first_name: string;
    last_name: string;
  };
}

export interface VisitsResponse {
  visits: Visit[];
}

export interface VisitResponse {
  visit: Visit;
}

export const visitsAPI = {
  getAll: async (): Promise<Visit[]> => {
    const response = await apiClient.get<VisitsResponse>('/visits');
    return response.data.visits;
  },

  create: async (data: CreateVisitData): Promise<Visit> => {
    const response = await apiClient.post<VisitResponse>('/visits', data);
    return response.data.visit;
  },

  updateStage: async (id: number, toStageId: number): Promise<Visit> => {
    const response = await apiClient.put<{ visit: Visit }>(`/visits/${id}/stage`, {
      to_stage_id: toStageId,
    });
    return response.data.visit;
  },
};
