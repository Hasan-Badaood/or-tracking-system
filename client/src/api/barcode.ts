import apiClient from './client';

export interface ScannedVisit {
  id: number;
  visit_tracking_id: string;
  patient: {
    first_name: string;
    last_name: string;
    mrn: string;
  };
  current_stage: {
    id: number;
    name: string;
  };
  or_room: {
    id: number;
    name: string;
  } | null;
}

export const barcodeAPI = {
  scanBarcode: async (barcodeData: string): Promise<ScannedVisit> => {
    const response = await apiClient.post('/barcode/scan', { barcode_data: barcodeData });
    return response.data.visit;
  },
};
