import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { api, ApiError } from '../api';
import { LayoutDashboard } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post<{ token: string; user: { id: string; email: string; role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'; org_id: string } }>('/auth/login', { email, password });
      login(response.token, response.user);
      
      if (['MANAGER', 'ADMIN'].includes(response.user.role)) {
        navigate('/manager');
      } else {
        navigate('/employee');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem' }}>
        <div className="flex-column flex-center gap-4" style={{ marginBottom: '2rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow)' }}>
            <LayoutDashboard size={24} color="white" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Welcome to TaskFlow</h1>
            <p style={{ fontSize: '0.9rem' }}>Sign in to manage your tasks</p>
          </div>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-column gap-4">
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com" 
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={isLoading}>
            {isLoading ? <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
