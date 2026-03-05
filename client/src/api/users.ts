import apiClient from './client';

export interface StaffUser {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'nurse' | 'reception';
  email: string | null;
  active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface CreateUserData {
  username: string;
  name: string;
  role: string;
  password: string;
  email?: string;
}

export const usersAPI = {
  getAll: async (): Promise<StaffUser[]> => {
    const response = await apiClient.get<{ users: StaffUser[] }>('/users');
    return response.data.users;
  },

  create: async (data: CreateUserData): Promise<StaffUser> => {
    const response = await apiClient.post<{ user: StaffUser }>('/users', data);
    return response.data.user;
  },

  update: async (id: number, data: Partial<StaffUser>): Promise<StaffUser> => {
    const response = await apiClient.put<{ user: StaffUser }>(`/users/${id}`, data);
    return response.data.user;
  },
};
