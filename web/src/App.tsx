import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import Layout from './components/Layout';

function ProtectedRoute({ children, allowedRoles }: { children: JSX.Element, allowedRoles: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) return <div className="flex-center" style={{ height: '100vh' }}><div className="spinner"></div></div>;
  if (!isAuthenticated || !user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;

  return children;
}

export default function App() {
  const checkAuth = useAuthStore(state => state.checkAuth);
  const { user } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<Layout />}>
          {/* Default redirect based on role */}
          <Route index element={
            user ? (
              ['MANAGER', 'ADMIN'].includes(user.role) 
                ? <Navigate to="/manager" /> 
                : <Navigate to="/employee" />
            ) : <Navigate to="/login" />
          } />
          
          <Route path="employee" element={
            <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER', 'ADMIN']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="manager" element={
            <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
