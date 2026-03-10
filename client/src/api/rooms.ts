import apiClient from './client';

export interface Room {
  id: number;
  name: string;
  room_number?: string;
  room_type?: string;
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance';
  active?: boolean;
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
    // The GET /rooms only returns active ones; for settings we need all
    // Since backend doesn't support this yet, we use the same endpoint
    // but the settings panel will manage active/inactive via update
    const response = await apiClient.get<RoomsResponse>('/rooms');
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

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/rooms/${id}`);
  },
};
