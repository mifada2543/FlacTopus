import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROLE, isAllowed } from '../utils/roles';

/**
 * ProtectedRoute — gerbang RBAC untuk sebuah route.
 *
 * - Guest (belum login)       → redirect ke /login (halaman asal disimpan
 *                               di location.state.from agar bisa kembali).
 * - Role tidak diizinkan       → redirect ke halaman beranda (/).
 * - Role diizinkan             → render halaman.
 *
 * Pemakaian:
 *   <ProtectedRoute roles={[ROLE.TEACHER, ROLE.ADMIN]}>
 *     <TeacherDashboard />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ roles, children }) {
  const { role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: '1rem',
        gap: '0.6rem',
      }}>
        <span style={{
          width: 18, height: 18,
          border: '3px solid var(--border-color)',
          borderTopColor: 'var(--accent-green)',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.8s linear infinite',
        }} />
        Memeriksa akses...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (role === ROLE.GUEST) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !isAllowed(role, roles)) {
    // Sudah login tapi role tidak berhak → arahkan ke halaman yang sesuai role
    if (role === ROLE.ADMIN) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/classes" replace />;
  }

  return children;
}
