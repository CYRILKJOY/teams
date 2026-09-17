import { Outlet, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { LogOut, LayoutDashboard, Users, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';

interface DailyReview {
  id: string;
  date: string;
  type: 'MORNING' | 'EVENING';
  response: string;
}

interface Task {
  id: string;
  status: string;
  due_date: string | null;
  name: string;
  clickup_task_id: string;
  created_at: string;
  acknowledgement_status?: string | null;
}

interface TeamMember {
  id: string;
  user_id: string;
  display_name: string;
  microsoft_id: string | null;
  clickup_id: string | null;
  reviews: DailyReview[];
  tasks: Task[];
}

interface ManagerData {
  team: TeamMember[];
  date: string;
  timezone: string;
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const selectedEmployeeId = searchParams.get('employeeId');

  const [managerData, setManagerData] = useState<ManagerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isManager = user && ['MANAGER', 'ADMIN'].includes(user.role);

  useEffect(() => {
    if (isManager) {
      let mounted = true;
      setIsLoading(true);
      const fetchData = async () => {
        try {
          const response = await api.get<ManagerData>('/dashboards/manager');
          if (mounted) {
            setManagerData(response);
            setIsLoading(false);
          }
        } catch (err: unknown) {
          if (mounted) {
            if (err instanceof Error) {
              setError(err.message);
            } else {
              setError('Failed to load team data');
            }
            setIsLoading(false);
          }
        }
      };
      fetchData();
      return () => {
        mounted = false;
      };
    }
  }, [isManager]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="glass" style={{ width: '280px', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-light)' }}>
        <div className="flex-center gap-2" style={{ marginBottom: '3rem', justifyContent: 'flex-start' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutDashboard size={18} color="white" />
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>TaskFlow</h2>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {isManager ? (
            <>
              <Link
                to="/manager"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  color: (location.pathname === '/manager' && !selectedEmployeeId) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: (location.pathname === '/manager' && !selectedEmployeeId) ? 'var(--bg-hover)' : 'transparent',
                  fontWeight: (location.pathname === '/manager' && !selectedEmployeeId) ? 500 : 400,
                  transition: 'all 0.2s'
                }}
              >
                <Users size={18} color={(location.pathname === '/manager' && !selectedEmployeeId) ? 'var(--primary-color)' : 'currentColor'} />
                Team Dashboard
              </Link>
              
              {managerData && (
                <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>Employees</div>
                  {managerData.team.map(emp => {
                    const isSelected = selectedEmployeeId === emp.id;
                    const pendingCount = emp.tasks.filter(t => t.status.toLowerCase() !== 'closed').length;
                    
                    return (
                      <Link
                        key={emp.id}
                        to={`/manager?employeeId=${emp.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          textDecoration: 'none',
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                          fontWeight: isSelected ? 500 : 400,
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isSelected ? 'var(--primary-color)' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.7rem', color: isSelected ? 'white' : 'inherit' }}>
                            {emp.display_name ? emp.display_name.charAt(0).toUpperCase() : 'E'}
                          </div>
                          <span style={{ fontSize: '0.9rem' }}>{emp.display_name || `Employee ${emp.id.substring(0, 4)}`}</span>
                        </div>
                        {pendingCount > 0 && (
                          <span className={isSelected ? "badge badge-primary" : "badge badge-default"} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                            {pendingCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <Link
              to="/employee"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                color: location.pathname === '/employee' ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: location.pathname === '/employee' ? 'var(--bg-hover)' : 'transparent',
                fontWeight: location.pathname === '/employee' ? 500 : 400,
                transition: 'all 0.2s'
              }}
            >
              <CheckCircle size={18} color={location.pathname === '/employee' ? 'var(--primary-color)' : 'currentColor'} />
              My Tasks
            </Link>
          )}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>{user?.email}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, textTransform: 'capitalize' }}>{user?.role.toLowerCase()}</p>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2.5rem 3rem', overflowY: 'auto', height: '100vh' }}>
        <Outlet context={{ managerData, isLoading, error }} />
      </main>
    </div>
  );
}
