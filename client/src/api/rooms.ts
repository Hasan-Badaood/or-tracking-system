import apiClient from './client';

export interface CleaningTimer {
  started_at: string;
  scheduled_end_at: string;
  minutes_remaining: number;
  completed: boolean;
}

export interface Room {
  id: number;
  name: string;
  room_number?: string;
  room_type?: string;
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance';
  active?: boolean;
  cleaning_timer?: CleaningTimer | null;
}

export interface RoomsResponse {
  rooms: Room[];
}

export const roomsAPI = {
  getAll: async (): Promise<Room[]> => {
    const response = await apiClient.get<RoomsResponse>('/rooms');
    return response.data.rooms;
  },

  getAllIncludingInactive: async (): Promise<Room[]> => {
    const response = await apiClient.get<RoomsResponse>('/rooms?includeAll=true');
    return response.data.rooms;
  },

  create: async (data: { name: string; room_number: string; room_type?: string }): Promise<Room> => {
    const response = await apiClient.post('/rooms', data);
    return response.data.room;
  },

  update: async (id: number, data: { name?: string; room_number?: string; room_type?: string; active?: boolean }): Promise<Room> => {
    const response = await apiClient.put(`/rooms/${id}`, data);
    return response.data.room;
  },

  updateStatus: async (id: number, status: Room['status']): Promise<Room> => {
    const response = await apiClient.put<{ room: Room }>(`/rooms/${id}/status`, { status });
    return response.data.room;
  },

  startCleaning: async (id: number, duration_minutes = 15): Promise<void> => {
    await apiClient.post(`/rooms/${id}/cleaning/start`, { duration_minutes });
  },

  completeCleaning: async (id: number): Promise<void> => {
    await apiClient.post(`/rooms/${id}/cleaning/complete`, {});
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/rooms/${id}`);
  },
};
