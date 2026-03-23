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

export interface UserAuditRow {
  id: number;
  created_at: string;
  action: string;
  performed_by: { id: number; name: string; username: string; role: string } | null;
  target_user:  { id: number; name: string; username: string; role: string } | null;
  changes: Record<string, { from: any; to: any }> | null;
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

  update: async (id: number, data: Partial<StaffUser> & { new_password?: string }): Promise<StaffUser> => {
    const response = await apiClient.put<{ user: StaffUser }>(`/users/${id}`, data);
    return response.data.user;
  },

  resetPassword: async (id: number, newPassword: string): Promise<void> => {
    await apiClient.put(`/users/${id}/password`, { new_password: newPassword });
  },

  getAuditLog: async (limit = 50, offset = 0): Promise<{ total: number; rows: UserAuditRow[] }> => {
    const response = await apiClient.get('/users/audit', { params: { limit, offset } });
    return { total: response.data.total, rows: response.data.rows ?? [] };
  },

  sendCredentials: async (id: number, password: string, loginUrl?: string): Promise<void> => {
    await apiClient.post(`/users/${id}/send-credentials`, { password, login_url: loginUrl });
  },
};
