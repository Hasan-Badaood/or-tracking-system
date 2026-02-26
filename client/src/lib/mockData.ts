// Mock data for development without backend

export interface Stage {
  id: number;
  name: string;
  color: string;
}

export interface Patient {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
}

export interface Visit {
  id: number;
  visit_tracking_id: string;
  patient: Patient;
  current_stage: Stage;
  active: boolean;
  created_at: string;
}

export const mockStages: Stage[] = [
  { id: 1, name: 'Arrived', color: '#3498db' },
  { id: 2, name: 'Pre-Op', color: '#f39c12' },
  { id: 3, name: 'Ready', color: '#27ae60' },
  { id: 4, name: 'In Theatre', color: '#e74c3c' },
  { id: 5, name: 'Recovery', color: '#9b59b6' },
  { id: 6, name: 'Discharged', color: '#95a5a6' },
];

export const mockPatients: Patient[] = [
  { id: 1, mrn: 'MRN001', first_name: 'John', last_name: 'Smith' },
  { id: 2, mrn: 'MRN002', first_name: 'Sarah', last_name: 'Johnson' },
  { id: 3, mrn: 'MRN003', first_name: 'Michael', last_name: 'Williams' },
  { id: 4, mrn: 'MRN004', first_name: 'Emily', last_name: 'Brown' },
  { id: 5, mrn: 'MRN005', first_name: 'David', last_name: 'Jones' },
];

export const mockVisits: Visit[] = [
  {
    id: 1,
    visit_tracking_id: 'VT-20260226-001',
    patient: mockPatients[0],
    current_stage: mockStages[0],
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    visit_tracking_id: 'VT-20260226-002',
    patient: mockPatients[1],
    current_stage: mockStages[2],
    active: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 3,
    visit_tracking_id: 'VT-20260226-003',
    patient: mockPatients[2],
    current_stage: mockStages[3],
    active: true,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 4,
    visit_tracking_id: 'VT-20260226-004',
    patient: mockPatients[3],
    current_stage: mockStages[4],
    active: true,
    created_at: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 5,
    visit_tracking_id: 'VT-20260226-005',
    patient: mockPatients[4],
    current_stage: mockStages[1],
    active: true,
    created_at: new Date(Date.now() - 14400000).toISOString(),
  },
];

export const mockUsers = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
  },
  {
    id: 2,
    username: 'nurse1',
    password: 'nurse123',
    name: 'Nurse Johnson',
    role: 'nurse',
  },
  {
    id: 3,
    username: 'reception',
    password: 'reception123',
    name: 'Reception Desk',
    role: 'reception',
  },
];
