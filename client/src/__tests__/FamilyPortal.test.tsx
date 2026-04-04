import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FamilyPortal } from '@/pages/FamilyPortal';
import { familyAPI } from '@/api/family';

vi.mock('@/api/family', () => ({
  familyAPI: {
    requestOtp: vi.fn(),
    verifyOtp: vi.fn(),
    getVisitStatus: vi.fn(),
  },
}));

vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader" />,
  Eye: () => <span />,
  EyeOff: () => <span />,
}));

const sampleVisit = {
  visit_tracking_id: 'VT-20260404-001',
  patient_first_name: 'John',
  current_stage: { id: 4, name: 'In Theatre', color: '#8B5CF6', display_order: 4 },
  stage_progress_percent: 67,
  updated_at: new Date().toISOString(),
};

describe('FamilyPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search step initially', () => {
    render(<FamilyPortal />);

    expect(screen.getByPlaceholderText('VT-20260305-001')).toBeInTheDocument();
    expect(screen.getByText('Send verification code')).toBeInTheDocument();
  });

  it('transitions to OTP step after successful requestOtp', async () => {
    const user = userEvent.setup();

    vi.mocked(familyAPI.requestOtp).mockResolvedValue({
      message: 'OTP sent',
      delivery_method: 'email',
      masked_recipient: 'j***@ex.com',
    } as any);

    render(<FamilyPortal />);

    await user.type(screen.getByPlaceholderText('VT-20260305-001'), 'VT-20260404-001');
    await user.type(screen.getByPlaceholderText('your@email.com'), 'john@example.com');
    await user.click(screen.getByText('Send verification code'));

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  it('shows error when visit not found', async () => {
    const user = userEvent.setup();

    vi.mocked(familyAPI.requestOtp).mockRejectedValue({
      response: { data: { error: 'Visit not found' } },
    });

    render(<FamilyPortal />);

    await user.type(screen.getByPlaceholderText('VT-20260305-001'), 'VT-INVALID');
    await user.click(screen.getByText('Send verification code'));

    await waitFor(() => {
      expect(screen.getByText(/Visit not found|Could not find/i)).toBeInTheDocument();
    });
  });

  it('shows error when no family contact registered', async () => {
    const user = userEvent.setup();

    vi.mocked(familyAPI.requestOtp).mockRejectedValue({
      response: { data: { error: 'No family contact registered' } },
    });

    render(<FamilyPortal />);

    await user.type(screen.getByPlaceholderText('VT-20260305-001'), 'VT-20260404-001');
    await user.click(screen.getByText('Send verification code'));

    await waitFor(() => {
      expect(screen.getByText(/No family contact was registered/i)).toBeInTheDocument();
    });
  });

  it('transitions to status step after OTP verification', async () => {
    const user = userEvent.setup();

    vi.mocked(familyAPI.requestOtp).mockResolvedValue({
      message: 'OTP sent',
    } as any);

    vi.mocked(familyAPI.verifyOtp).mockResolvedValue({
      access_token: 'token123',
      expires_at: '2026-04-04T12:00:00Z',
      visit: sampleVisit,
    } as any);

    render(<FamilyPortal />);

    // Fill search step
    await user.type(screen.getByPlaceholderText('VT-20260305-001'), 'VT-20260404-001');
    await user.click(screen.getByText('Send verification code'));

    // Wait for OTP step
    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });

    // Fill OTP and submit
    await user.type(screen.getByPlaceholderText('000000'), '123456');
    await user.click(screen.getByRole('button', { name: /Confirm code/i }));

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    expect(screen.getByText('Surgical journey')).toBeInTheDocument();
  });

  it('shows error when OTP is wrong', async () => {
    const user = userEvent.setup();

    vi.mocked(familyAPI.requestOtp).mockResolvedValue({
      message: 'OTP sent',
    } as any);

    vi.mocked(familyAPI.verifyOtp).mockRejectedValue({
      response: { data: { error: 'Invalid OTP code' } },
    });

    render(<FamilyPortal />);

    // Navigate to OTP step
    await user.type(screen.getByPlaceholderText('VT-20260305-001'), 'VT-20260404-001');
    await user.click(screen.getByText('Send verification code'));

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });

    // Submit wrong OTP
    await user.type(screen.getByPlaceholderText('000000'), '000000');
    await user.click(screen.getByRole('button', { name: /Confirm code/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid OTP code')).toBeInTheDocument();
    });
  });

  it('shows discharged patient directly on status step', async () => {
    const user = userEvent.setup();

    const dischargedVisit = {
      visit_tracking_id: 'VT-20260404-001',
      patient_first_name: 'Jane',
      current_stage: { id: 6, name: 'Discharged', color: '#6B7280', display_order: 6 },
      stage_progress_percent: 100,
      updated_at: new Date().toISOString(),
    };

    vi.mocked(familyAPI.requestOtp).mockResolvedValue({
      discharged: true,
      visit: dischargedVisit,
    });

    render(<FamilyPortal />);

    await user.type(screen.getByPlaceholderText('VT-20260305-001'), 'VT-20260404-001');
    await user.click(screen.getByText('Send verification code'));

    await waitFor(() => {
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });

    expect(screen.getByText('Surgical journey')).toBeInTheDocument();
  });
});
