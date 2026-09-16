// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { api } from '../api';
import { useAuthStore } from '../store/auth';

vi.mock('../api', () => ({
  api: {
    post: vi.fn(),
  },
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
  });

  it('renders login form', () => {
    renderWithRouter(<Login />);
    expect(screen.getByText('Welcome to TaskFlow')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@company.com')).toBeTruthy();
  });

  it('handles successful login as employee', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      token: 'fake-token',
      user: { id: '1', role: 'EMPLOYEE', email: 'emp@test.com', org_id: 'org1' }
    });

    renderWithRouter(<Login />);
    
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), {
      target: { value: 'emp@test.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'emp@test.com',
        password: 'password123'
      });
    });
  });

  it('displays error on failed login', async () => {
    const { ApiError } = await import('../api');
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new ApiError(401, 'Invalid credentials')
    );

    renderWithRouter(<Login />);
    
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), {
      target: { value: 'wrong@test.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'badpass' }
    });
    
    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy();
    });
  });
});
