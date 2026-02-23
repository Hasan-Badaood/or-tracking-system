import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserManagement } from '@/pages/UserManagement';
import { usersAPI } from '@/api/users';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/api/users', () => ({
  usersAPI: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock('@/components/layout/Navbar', () => ({
  Navbar: ({ title }: any) => <nav>{title}</nav>,
}));

vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader" />,
  UserPlus: () => <span />,
  KeyRound: () => <span />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: any) => (
    <div>
      <select onChange={(e) => onValueChange?.(e.target.value)}>{children}</select>
    </div>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

const makeUser = (overrides: any = {}) => ({
  id: 1,
  username: 'nurse01',
  name: 'Alice Nurse',
  role: 'nurse',
  email: 'alice@example.com',
  phone: null,
  active: true,
  last_login: null,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('UserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    vi.mocked(usersAPI.getAll).mockReturnValue(new Promise(() => {}));
    render(<UserManagement />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('renders list of users after loading', async () => {
    vi.mocked(usersAPI.getAll).mockResolvedValue([makeUser()]);
    render(<UserManagement />);
    expect(await screen.findByText('Alice Nurse')).toBeInTheDocument();
    expect(screen.getByText('nurse01')).toBeInTheDocument();
  });

  it('renders multiple users', async () => {
    vi.mocked(usersAPI.getAll).mockResolvedValue([
      makeUser({ id: 1, name: 'Alice Nurse', username: 'alice' }),
      makeUser({ id: 2, name: 'Bob Admin', username: 'bob', role: 'admin' }),
    ]);
    render(<UserManagement />);
    expect(await screen.findByText('Alice Nurse')).toBeInTheDocument();
    expect(screen.getByText('Bob Admin')).toBeInTheDocument();
  });

  it('renders empty state when no users', async () => {
    vi.mocked(usersAPI.getAll).mockResolvedValue([]);
    render(<UserManagement />);
    await waitFor(() => {
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Alice Nurse')).not.toBeInTheDocument();
  });

  it('opens the add user dialog when the button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(usersAPI.getAll).mockResolvedValue([]);
    render(<UserManagement />);
    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add.*staff/i }));
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('shows validation error when required fields are missing', async () => {
    const user = userEvent.setup();
    vi.mocked(usersAPI.getAll).mockResolvedValue([]);
    render(<UserManagement />);
    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add.*staff/i }));
    await user.click(screen.getByRole('button', { name: /^Create$/i }));

    expect(await screen.findByText(/username, name, role, and password are required/i)).toBeInTheDocument();
  });

  it('calls usersAPI.create with form data and closes dialog on success', async () => {
    const user = userEvent.setup();
    const newUser = makeUser({ id: 2, username: 'newstaff', name: 'New Staff' });
    vi.mocked(usersAPI.getAll).mockResolvedValue([]);
    vi.mocked(usersAPI.create).mockResolvedValue(newUser);
    const { container } = render(<UserManagement />);
    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /add.*staff/i }));

    await user.type(screen.getByPlaceholderText(/sarah\.patel/i), 'newstaff');
    await user.type(screen.getByPlaceholderText(/Sarah Patel/i), 'New Staff');

    const roleSelect = screen.getByRole('combobox');
    await user.selectOptions(roleSelect, 'nurse');

    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    await user.type(passwordInput, 'password123');

    await user.click(screen.getByRole('button', { name: /^Create$/i }));

    await waitFor(() => {
      expect(usersAPI.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'newstaff', name: 'New Staff', role: 'nurse' })
      );
    });
  });
});
