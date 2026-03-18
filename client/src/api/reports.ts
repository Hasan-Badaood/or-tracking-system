import apiClient from './client';

export interface DailySummary {
  date: string;
  summary: {
    total_visits: number;
    completed_visits: number;
    active_visits: number;
    cancelled_visits: number;
    average_duration_minutes: number;
    or_utilization_rate: number;
  };
  by_stage: {
    stage_name: string;
    count: number;
    average_duration_minutes: number;
  }[];
}

export interface StageDurationRow {
  stage_name: string;
  average_minutes: number;
  min_minutes: number;
  max_minutes: number;
  sample_size: number;
}

export interface AuditLogRow {
  id: number;
  created_at: string;
  visit_tracking_id: string | null;
  patient_name: string | null;
  from_stage: { name: string; color: string } | null;
  to_stage:   { name: string; color: string } | null;
  updated_by: { name: string; role: string } | null;
  notes: string | null;
}

export interface DateRangeRow {
  date: string;
  total: number;
  completed: number;
  active: number;
}

export const reportsAPI = {
  getDailySummary: async (date: string): Promise<DailySummary> => {
    const response = await apiClient.get('/reports/daily-summary', { params: { date } });
    const d = response.data;
    return { date: d.date, summary: d.summary, by_stage: d.by_stage };
  },

  getStageDurations: async (startDate: string, endDate: string): Promise<StageDurationRow[]> => {
    const response = await apiClient.get('/reports/stage-duration', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data.durations ?? [];
  },

  getDateRange: async (startDate: string, endDate: string): Promise<DateRangeRow[]> => {
    const response = await apiClient.get('/reports/date-range', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data.rows ?? [];
  },

  getNotificationConfig: async (): Promise<{ emailConfigured: boolean; smsConfigured: boolean }> => {
    const response = await apiClient.get('/reports/notification-config');
    return { emailConfigured: response.data.emailConfigured, smsConfigured: response.data.smsConfigured };
  },

  getAuditLog: async (limit = 50, offset = 0): Promise<{ total: number; rows: AuditLogRow[] }> => {
    const response = await apiClient.get('/reports/audit-log', { params: { limit, offset } });
    return { total: response.data.total, rows: response.data.rows ?? [] };
  },
};
