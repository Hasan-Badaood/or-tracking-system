import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VisitCard } from '@/components/VisitCard';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick }: any) => <div data-testid="card" onClick={onClick}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, style }: any) => <span data-testid="badge" style={style}>{children}</span>,
}));

vi.mock('lucide-react', () => ({
  Clock: () => <span data-testid="clock-icon" />,
  User: () => <span data-testid="user-icon" />,
}));

const makeVisit = (overrides: any = {}) => ({
  id: 1,
  visit_tracking_id: 'VT-20260225-001',
  active: true,
  created_at: '2026-02-25T09:00:00Z',
  updated_at: '2026-02-25T10:30:00Z',
  patient: {
    id: 1,
    mrn: 'MRN001',
    first_name: 'John',
    last_name: 'Doe',
  },
  current_stage: {
    id: 2,
    name: 'Pre-Op Assessment',
    color: '#f39c12',
    display_order: 2,
  },
  or_room: null,
  family_contacts: [],
  ...overrides,
});

describe('VisitCard', () => {
  it('renders the visit tracking ID', () => {
    render(<VisitCard visit={makeVisit()} />);
    expect(screen.getByText('VT-20260225-001')).toBeInTheDocument();
  });

  it('renders the patient full name', () => {
    render(<VisitCard visit={makeVisit()} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders the patient MRN', () => {
    render(<VisitCard visit={makeVisit()} />);
    expect(screen.getByText('MRN: MRN001')).toBeInTheDocument();
  });

  it('renders the current stage badge with the correct color', () => {
    render(<VisitCard visit={makeVisit()} />);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('Pre-Op Assessment');
    expect(badge).toHaveStyle({ backgroundColor: '#f39c12' });
  });

  it('calls onClick when the card is clicked', () => {
    const onClick = vi.fn();
    render(<VisitCard visit={makeVisit()} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('card'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders without onClick without throwing', () => {
    expect(() => render(<VisitCard visit={makeVisit()} />)).not.toThrow();
  });

  it('shows the clock icon for the timestamp', () => {
    render(<VisitCard visit={makeVisit()} />);
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
  });
});
