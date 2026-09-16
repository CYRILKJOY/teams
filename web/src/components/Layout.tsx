import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { LogOut, LayoutDashboard, Users, CheckCircle } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [];
  
  if (user) {
    if (['MANAGER', 'ADMIN'].includes(user.role)) {
      navItems.push({ path: '/manager', label: 'Team Dashboard', icon: Users });
    }
    navItems.push({ path: '/employee', label: 'My Tasks', icon: CheckCircle });
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="glass" style={{ width: '260px', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-light)' }}>
        <div className="flex-center gap-2" style={{ marginBottom: '3rem', justifyContent: 'flex-start' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutDashboard size={18} color="white" />
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>TaskFlow</h2>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={18} color={isActive ? 'var(--primary-color)' : 'currentColor'} />
                {item.label}
              </Link>
            );
          })}
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
        <Outlet />
      </main>
    </div>
  );
}
