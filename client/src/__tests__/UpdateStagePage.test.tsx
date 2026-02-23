import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateStagePage } from '@/pages/UpdateStagePage';
import { visitsAPI } from '@/api/visits';
import { stagesAPI } from '@/api/stages';
import { roomsAPI } from '@/api/rooms';

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams('visitId=VT-001');

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

vi.mock('@/api/visits', () => ({
  visitsAPI: {
    getByTrackingId: vi.fn(),
    getTimeline: vi.fn(),
    updateStage: vi.fn(),
    notifyFamily: vi.fn(),
  },
}));

vi.mock('@/api/stages', () => ({
  stagesAPI: { getAll: vi.fn() },
}));

vi.mock('@/api/rooms', () => ({
  roomsAPI: { getAll: vi.fn() },
}));

vi.mock('@/components/layout/Navbar', () => ({
  Navbar: ({ title }: any) => <nav data-testid="navbar">{title}</nav>,
}));

vi.mock('lucide-react', () => ({
  Check: () => <span />,
  Loader2: () => <span data-testid="loader" />,
  Bell: () => <span />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-value={value} onClick={() => onValueChange?.('1')}>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder }: any) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} />
  ),
}));

const makeStages = () => [
  { id: 1, name: 'Arrived', color: '#3498db', display_order: 1 },
  { id: 2, name: 'Pre-Op Assessment', color: '#f39c12', display_order: 2 },
  { id: 3, name: 'In Theatre', color: '#e74c3c', display_order: 3 },
  { id: 4, name: 'Recovery', color: '#2ecc71', display_order: 4 },
  { id: 5, name: 'Discharged', color: '#95a5a6', display_order: 5 },
];

const makeVisit = (stageName = 'Arrived', stageId = 1) => ({
  id: 1,
  visit_tracking_id: 'VT-001',
  active: true,
  created_at: '2026-02-25T09:00:00Z',
  updated_at: '2026-02-25T09:00:00Z',
  patient: { id: 1, mrn: 'MRN001', first_name: 'Jane', last_name: 'Smith' },
  current_stage: { id: stageId, name: stageName, color: '#3498db', display_order: stageId },
  or_room: null,
  family_contacts: [],
});

describe('UpdateStagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('visitId=VT-001');
    vi.mocked(stagesAPI.getAll).mockResolvedValue(makeStages());
    vi.mocked(roomsAPI.getAll).mockResolvedValue([]);
    vi.mocked(visitsAPI.getByTrackingId).mockResolvedValue(makeVisit());
    vi.mocked(visitsAPI.getTimeline).mockResolvedValue([]);
  });

  it('shows "No visit selected" when visitId param is absent', async () => {
    mockSearchParams = new URLSearchParams('');
    render(<UpdateStagePage />);
    expect(await screen.findByText('No visit selected')).toBeInTheDocument();
  });

  it('shows loading spinner initially', () => {
    render(<UpdateStagePage />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('renders patient info after loading', async () => {
    render(<UpdateStagePage />);
    expect(await screen.findByText(/Jane Smith/)).toBeInTheDocument();
    expect(screen.getByText(/MRN001/)).toBeInTheDocument();
  });

  it('renders stage buttons for each stage', async () => {
    render(<UpdateStagePage />);
    await screen.findByText(/Jane Smith/);
    expect(screen.getByText('Arrived')).toBeInTheDocument();
    expect(screen.getByText('In Theatre')).toBeInTheDocument();
    expect(screen.getByText('Discharged')).toBeInTheDocument();
  });

  it('shows "Visit not found" when API returns null', async () => {
    vi.mocked(visitsAPI.getByTrackingId).mockRejectedValue(new Error('not found'));
    render(<UpdateStagePage />);
    await waitFor(() => {
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });
  });

  it('disables UPDATE STAGE and shows no-rooms message when moving to In Theatre with no available rooms', async () => {
    const user = userEvent.setup();
    vi.mocked(visitsAPI.getByTrackingId).mockResolvedValue(makeVisit('Pre-Op Assessment', 2));
    render(<UpdateStagePage />);
    await screen.findByText(/Jane Smith/);

    const inTheatreBtn = screen.getByText('In Theatre').closest('button')!;
    await user.click(inTheatreBtn);

    await waitFor(() => {
      expect(screen.getByText(/No rooms are currently available/i)).toBeInTheDocument();
    });

    const updateBtn = screen.getByRole('button', { name: /UPDATE STAGE/i });
    expect(updateBtn).toBeDisabled();
  });

  it('calls visitsAPI.updateStage and navigates back on success', async () => {
    const user = userEvent.setup();
    vi.mocked(visitsAPI.updateStage).mockResolvedValue(undefined as any);
    render(<UpdateStagePage />);
    await screen.findByText(/Jane Smith/);

    const updateBtn = screen.getByRole('button', { name: /UPDATE STAGE/i });
    await user.click(updateBtn);

    await waitFor(() => {
      expect(visitsAPI.updateStage).toHaveBeenCalledWith(1, 2, undefined, undefined, undefined);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  it('shows error message when updateStage API fails', async () => {
    const user = userEvent.setup();
    vi.mocked(visitsAPI.updateStage).mockRejectedValue({
      response: { data: { error: 'Stage update failed' } },
    });
    render(<UpdateStagePage />);
    await screen.findByText(/Jane Smith/);

    await user.click(screen.getByRole('button', { name: /UPDATE STAGE/i }));

    await waitFor(() => {
      expect(screen.getByText('Stage update failed')).toBeInTheDocument();
    });
  });

  it('navigates back when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<UpdateStagePage />);
    await screen.findByText(/Jane Smith/);

    await user.click(screen.getByRole('button', { name: /CANCEL/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
