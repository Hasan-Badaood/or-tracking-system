import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateVisitForm } from '@/components/CreateVisitForm';
import { visitsAPI } from '@/api/visits';

vi.mock('@/api/visits', () => ({
  visitsAPI: {
    create: vi.fn(),
  },
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children, id }: any) => <div id={id}>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

describe('CreateVisitForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form fields', () => {
    render(<CreateVisitForm onSuccess={vi.fn()} />);

    expect(screen.getByLabelText(/MRN/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register Visit/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<CreateVisitForm onSuccess={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows error when family contact has name but no phone', async () => {
    const user = userEvent.setup();

    render(<CreateVisitForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/MRN/i), 'MRN001');
    await user.type(screen.getByLabelText(/First Name/i), 'John');
    await user.type(screen.getByLabelText(/Last Name/i), 'Doe');

    await user.click(screen.getByRole('button', { name: /\+ Add contact/i }));
    await user.type(screen.getByLabelText(/^Name \*/i), 'Jane Doe');
    // intentionally leave phone empty

    await user.click(screen.getByRole('button', { name: /Register Visit/i }));

    await waitFor(() => {
      expect(screen.getByText(/name, phone, and relationship are required/i)).toBeInTheDocument();
    });
  });

  it('shows error when family contact has no consent', async () => {
    const user = userEvent.setup();

    render(<CreateVisitForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/MRN/i), 'MRN002');
    await user.type(screen.getByLabelText(/First Name/i), 'John');
    await user.type(screen.getByLabelText(/Last Name/i), 'Doe');

    await user.click(screen.getByRole('button', { name: /\+ Add contact/i }));
    await user.type(screen.getByLabelText(/^Name \*/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/^Phone \*/i), '+447700000000');
    await user.type(screen.getByLabelText(/Relationship \*/i), 'Spouse');
    // consent checkbox visible but NOT checked

    await user.click(screen.getByRole('button', { name: /Register Visit/i }));

    await waitFor(() => {
      expect(screen.getByText(/patient consent must be given/i)).toBeInTheDocument();
    });
  });

  it('calls visitsAPI.create with correct data on valid submission', async () => {
    const user = userEvent.setup();

    vi.mocked(visitsAPI.create).mockResolvedValue(undefined as any);

    render(<CreateVisitForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/MRN/i), 'MRN003');
    await user.type(screen.getByLabelText(/First Name/i), 'Alice');
    await user.type(screen.getByLabelText(/Last Name/i), 'Smith');

    await user.click(screen.getByRole('button', { name: /Register Visit/i }));

    await waitFor(() => {
      expect(visitsAPI.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patient: expect.objectContaining({
            mrn: 'MRN003',
            first_name: 'Alice',
            last_name: 'Smith',
          }),
        })
      );
    });
  });

  it('calls onSuccess after successful submission', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    vi.mocked(visitsAPI.create).mockResolvedValue(undefined as any);

    render(<CreateVisitForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/MRN/i), 'MRN004');
    await user.type(screen.getByLabelText(/First Name/i), 'Bob');
    await user.type(screen.getByLabelText(/Last Name/i), 'Jones');

    await user.click(screen.getByRole('button', { name: /Register Visit/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('shows API error message on failure', async () => {
    const user = userEvent.setup();

    vi.mocked(visitsAPI.create).mockRejectedValue({
      response: { data: { error: 'Patient already exists' } },
    });

    render(<CreateVisitForm onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/MRN/i), 'MRN005');
    await user.type(screen.getByLabelText(/First Name/i), 'Tom');
    await user.type(screen.getByLabelText(/Last Name/i), 'Brown');

    await user.click(screen.getByRole('button', { name: /Register Visit/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });
});
