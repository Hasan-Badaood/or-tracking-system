import apiClient from './client';

export interface SmtpConfig {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  smtp_secure: string;
}

export const settingsAPI = {
  getSmtp: async (): Promise<SmtpConfig> => {
    const response = await apiClient.get('/settings/smtp');
    return response.data.config;
  },

  updateSmtp: async (config: Partial<SmtpConfig>): Promise<void> => {
    await apiClient.put('/settings/smtp', config);
  },

  testSmtp: async (): Promise<void> => {
    await apiClient.post('/settings/smtp/test');
  },
};
