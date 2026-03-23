import apiClient from './client';

export interface SmtpConfig {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  smtp_secure: string;
}

export interface ResendConfig {
  resend_api_key: string;
  resend_from: string;
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
    await apiClient.post('/settings/smtp/test', {}, { timeout: 15_000 });
  },

  getResend: async (): Promise<ResendConfig> => {
    const response = await apiClient.get('/settings/resend');
    return response.data.config;
  },

  updateResend: async (config: Partial<ResendConfig>): Promise<void> => {
    await apiClient.put('/settings/resend', config);
  },

  testResend: async (): Promise<void> => {
    await apiClient.post('/settings/resend/test', {}, { timeout: 10_000 });
  },

  sendTestEmail: async (to: string): Promise<void> => {
    await apiClient.post('/settings/resend/send-test', { to }, { timeout: 15_000 });
  },
};
