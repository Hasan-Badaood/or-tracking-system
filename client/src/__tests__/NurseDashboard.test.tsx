import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NurseDashboard } from '@/pages/NurseDashboard';
import { visitsAPI } from '@/api/visits';
import { roomsAPI } from '@/api/rooms';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/api/visits', () => ({
  visitsAPI: { getAll: vi.fn() },
}));

vi.mock('@/api/rooms', () => ({
  roomsAPI: { getAll: vi.fn(), updateStatus: vi.fn() },
}));

vi.mock('@/components/BarcodeScanner', () => ({
  BarcodeScanner: ({ onScan }: any) => (
    <button data-testid="scanner" onClick={() => onScan('VT-20260225-001')}>
      Scan
    </button>
  ),
}));

vi.mock('@/components/layout/Navbar', () => ({
  Navbar: ({ title }: any) => <nav>{title}</nav>,
}));

vi.mock('lucide-react', () => ({
  Camera: () => <span />,
  Loader2: () => <span data-testid="loader" />,
  Timer: () => <span />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: any) => (
    <select onChange={(e) => onValueChange?.(e.target.value)}>{children}</select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>,
}));

const makeVisit = (id: number, stageName: string) => ({
  id,
  visit_tracking_id: `VT-00${id}`,
  active: true,
  created_at: '2026-02-25T08:00:00Z',
  updated_at: '2026-02-25T08:00:00Z',
  patient: { id, mrn: `MRN00${id}`, first_name: 'Patient', last_name: `${id}` },
  current_stage: { id: 2, name: stageName, color: '#e74c3c', display_order: 2 },
  or_room: null,
  family_contacts: [],
});

const makeRoom = (id: number, status: string) => ({
  id,
  room_number: `OR-${id}`,
  name: `Operating Room ${id}`,
  status,
  active: true,
  room_type: 'General',
  capacity: 'Standard',
  last_status_change: '2026-02-25T08:00:00Z',
});

describe('NurseDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(visitsAPI.getAll).mockResolvedValue({ visits: [], total: 0, pagination: {} } as any);
    vi.mocked(roomsAPI.getAll).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading state initially', () => {
    vi.mocked(visitsAPI.getAll).mockReturnValue(new Promise(() => {}));
    render(<NurseDashboard />);
    expect(screen.getAllByTestId('loader').length).toBeGreaterThan(0);
  });

  it('renders visits after loading', async () => {
    vi.mocked(visitsAPI.getAll).mockResolvedValue({
      visits: [makeVisit(1, 'In Theatre'), makeVisit(2, 'Pre-Op Assessment')],
      total: 2,
      pagination: {},
    } as any);
    render(<NurseDashboard />);
    expect(await screen.findByText('VT-001')).toBeInTheDocument();
    expect(screen.getByText('VT-002')).toBeInTheDocument();
  });

  it('renders room statuses', async () => {
    vi.mocked(roomsAPI.getAll).mockResolvedValue([
      makeRoom(1, 'Available'),
      makeRoom(2, 'Occupied'),
      makeRoom(3, 'Cleaning'),
    ]);
    render(<NurseDashboard />);
    expect(await screen.findByText('Operating Room 1')).toBeInTheDocument();
    expect(screen.getByText('Operating Room 2')).toBeInTheDocument();
    expect(screen.getByText('Operating Room 3')).toBeInTheDocument();
  });

  it('shows error message when visits fail to load', async () => {
    vi.mocked(visitsAPI.getAll).mockRejectedValue(new Error('Network error'));
    render(<NurseDashboard />);
    expect(await screen.findByText(/Failed to load data/i)).toBeInTheDocument();
  });

  it('navigates to update stage when the Update button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(visitsAPI.getAll).mockResolvedValue({
      visits: [makeVisit(1, 'In Theatre')],
      total: 1,
      pagination: {},
    } as any);
    render(<NurseDashboard />);
    const updateBtn = await screen.findByRole('button', { name: /^Update$/i });
    await user.click(updateBtn);
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('VT-001'));
  });

  it('shows the barcode scanner when the camera button is clicked', async () => {
    const user = userEvent.setup();
    render(<NurseDashboard />);
    const cameraBtn = await screen.findByRole('button', { name: /activate camera/i });
    await user.click(cameraBtn);
    expect(screen.getByTestId('scanner')).toBeInTheDocument();
  });

  it('navigates to update stage after scanning a barcode', async () => {
    const user = userEvent.setup();
    render(<NurseDashboard />);
    const cameraBtn = await screen.findByRole('button', { name: /activate camera/i });
    await user.click(cameraBtn);
    await user.click(screen.getByTestId('scanner'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('VT-20260225-001'));
  });
});
