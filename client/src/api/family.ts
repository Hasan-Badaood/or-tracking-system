import apiClient from './client';

export interface FamilyVisitStatus {
  patient_first_name: string;
  current_stage: {
    name: string;
    color: string;
  };
  stage_progress_percent: number;
  visit_tracking_id: string;
  updated_at: string;
}

export interface OtpVerifyResponse {
  access_token: string;
  visit: FamilyVisitStatus;
}

export const familyAPI = {
  requestOtp: async (data: {
    visit_tracking_id: string;
    email?: string;
    phone?: string;
  }): Promise<{ message: string }> => {
    const response = await apiClient.post('/family/request-otp', data);
    return response.data;
  },

  verifyOtp: async (data: {
    visit_tracking_id: string;
    otp: string;
  }): Promise<OtpVerifyResponse> => {
    const response = await apiClient.post('/family/verify-otp', data);
    return {
      access_token: response.data.access_token,
      visit: response.data.visit,
    };
  },

  getVisitStatus: async (token: string): Promise<FamilyVisitStatus> => {
    const response = await apiClient.get(`/family/visit/${token}`);
    const d = response.data;
    return {
      patient_first_name: d.patient_first_name,
      current_stage: d.current_stage,
      stage_progress_percent: d.stage_progress_percent,
      visit_tracking_id: d.visit_tracking_id,
      updated_at: d.updated_at,
    };
  },
};
