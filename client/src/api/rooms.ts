import apiClient from './client';

export interface Room {
  id: number;
  name: string;
  status: 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance';
}

export interface RoomsResponse {
  rooms: Room[];
}

export const roomsAPI = {
  getAll: async (): Promise<Room[]> => {
    const response = await apiClient.get<RoomsResponse>('/rooms');
    return response.data.rooms;
  },

  updateStatus: async (id: number, status: Room['status']): Promise<Room> => {
    const response = await apiClient.put<{ room: Room }>(`/rooms/${id}/status`, { status });
    return response.data.room;
  },
};
