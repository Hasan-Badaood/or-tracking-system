import apiClient from './client';

export interface Stage {
  id: number;
  name: string;
  color: string;
  display_order: number;
}

export const stagesAPI = {
  getAll: async (): Promise<Stage[]> => {
    const response = await apiClient.get('/stages');
    return response.data.data ?? [];
  },
};
