import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '@/pages/LoginPage';
import { authAPI } from '@/api/auth';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/api/auth', () => ({
  authAPI: {
    login: vi.fn(),
  },
}));

vi.mock('lucide-react', () => ({
  Eye: () => <span data-testid="icon-eye" />,
  EyeOff: () => <span data-testid="icon-eyeoff" />,
  Loader2: () => <span data-testid="loader" />,
  Activity: () => <span />,
  Users: () => <span />,
  ClipboardList: () => <span />,
  CalendarClock: () => <span />,
  User: () => <span />,
  Lock: () => <span />,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('renders the login form', () => {
    render(<LoginPage />);

    expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('shows error when login fails', async () => {
    const user = userEvent.setup();

    vi.mocked(authAPI.login).mockRejectedValue({
      response: { data: { message: 'Invalid username or password' } },
    });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('Enter your username'), 'baduser');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'badpass');
    await user.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.getByText('Invalid username or password')).toBeInTheDocument();
    });
  });

  it('navigates to /reception for reception role', async () => {
    const user = userEvent.setup();

    vi.mocked(authAPI.login).mockResolvedValue({
      token: 'tok',
      user: { id: 1, username: 'rec', name: 'Rec', role: 'reception', permissions: [] } as any,
    });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('Enter your username'), 'rec');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'pass');
    await user.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/reception');
    });
  });

  it('navigates to /nurse for nurse role', async () => {
    const user = userEvent.setup();

    vi.mocked(authAPI.login).mockResolvedValue({
      token: 'tok',
      user: { id: 2, username: 'nurse1', name: 'Nurse', role: 'nurse', permissions: [] } as any,
    });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('Enter your username'), 'nurse1');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'pass');
    await user.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/nurse');
    });
  });

  it('navigates to /admin for admin role', async () => {
    const user = userEvent.setup();

    vi.mocked(authAPI.login).mockResolvedValue({
      token: 'tok',
      user: { id: 3, username: 'admin1', name: 'Admin', role: 'admin', permissions: [] } as any,
    });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('Enter your username'), 'admin1');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'pass');
    await user.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  it('stores token and user in localStorage on success', async () => {
    const user = userEvent.setup();

    const mockUser = { id: 3, username: 'admin1', name: 'Admin', role: 'admin', permissions: [] };

    vi.mocked(authAPI.login).mockResolvedValue({
      token: 'abc123',
      user: mockUser as any,
    });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('Enter your username'), 'admin1');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'pass');
    await user.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('abc123');
    });

    expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
  });

  it('submit button is disabled while loading', async () => {
    const user = userEvent.setup();

    vi.mocked(authAPI.login).mockReturnValue(new Promise(() => {}));

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText('Enter your username'), 'admin1');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'pass');
    await user.click(screen.getByText('Sign In'));

    await waitFor(() => {
      // When loading, the button shows the Loader2 icon (mocked as a span) and no text.
      // The submit button is the only button with type="submit".
      const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(submitButton).toBeDisabled();
    });
  });
});
