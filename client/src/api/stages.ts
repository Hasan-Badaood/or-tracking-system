import apiClient from './client';

export interface Stage {
  id: number;
  name: string;
  color: string;
  display_order: number;
  description?: string;
  active: boolean;
}

export const stagesAPI = {
  getAll: async (includeInactive = false): Promise<Stage[]> => {
    const response = await apiClient.get('/stages', {
      params: includeInactive ? { all: 'true' } : undefined,
    });
    return response.data.data ?? [];
  },

  create: async (data: { name: string; color: string; display_order?: number; description?: string }): Promise<Stage> => {
    const response = await apiClient.post('/stages', data);
    return response.data.data;
  },

  update: async (id: number, data: { name?: string; color?: string; display_order?: number; description?: string; active?: boolean }): Promise<Stage> => {
    const response = await apiClient.put(`/stages/${id}`, data);
    return response.data.data;
  },
};
