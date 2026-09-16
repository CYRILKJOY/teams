import { create } from 'zustand';
import { api } from '../api';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  org_id: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: typeof window !== 'undefined' ? !!window.localStorage.getItem('token') : false,
  isLoading: true,
  
  login: (token, user) => {
    if (typeof window !== 'undefined') window.localStorage.setItem('token', token);
    set({ user, isAuthenticated: true });
  },
  
  logout: () => {
    if (typeof window !== 'undefined') window.localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false });
  },
  
  checkAuth: async () => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    
    try {
      const response = await api.get<{ user: User }>('/auth/me');
      set({ user: response.user, isAuthenticated: true, isLoading: false });
    } catch {
      if (typeof window !== 'undefined') window.localStorage.removeItem('token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  }
}));
