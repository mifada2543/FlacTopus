import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ClassDashboard from './pages/ClassDashboard';
import ClassAnalytics from './pages/ClassAnalytics';
import RoomDetail from './pages/RoomDetail';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Quiz from './pages/Quiz';
import ProtectedRoute from './components/ProtectedRoute';
import { ROLE } from './utils/roles';
import './index.css';

// Matriks RBAC:
//   guest   → hanya landing, login, register (tidak bisa kemana-mana)
//   student → kelas yang diikuti + belajar/kuis
//   teacher → kelas + analisis kelas + mengelola silabus
//   admin   → dashboard khusus admin (belum dibuat)
function App() {
  // Aplikasi disajikan di subfolder /FlacTopus/ (XAMPP htdocs),
  // jadi semua route React Router harus berbasename di sana —
  // kalau tidak, link seperti /login malah menuju localhost root.
  return (
    <Router basename="/FlacTopus">
      <Routes>
        {/* Publik (guest) */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Wajib login: semua role kecuali guest */}
        <Route
          path="/classes"
          element={(
            <ProtectedRoute roles={[ROLE.STUDENT, ROLE.TEACHER, ROLE.ADMIN]}>
              <ClassDashboard />
            </ProtectedRoute>
          )}
        />

        {/* Detail ruangan + kelola murid: hanya guru & admin (pemilik dicek di halaman) */}
        <Route
          path="/room/:roomId"
          element={(
            <ProtectedRoute roles={[ROLE.TEACHER, ROLE.ADMIN, ROLE.STUDENT]}>
              <RoomDetail />
            </ProtectedRoute>
          )}
        />

        {/* Analisis kelas: hanya guru */}
        <Route
          path="/analytics/:classId"
          element={(
            <ProtectedRoute roles={[ROLE.TEACHER, ROLE.ADMIN, ROLE.STUDENT]}>
              <ClassAnalytics />
            </ProtectedRoute>
          )}
        />

        {/* Editor silabus: hanya guru */}
        <Route
          path="/teacher/:classId"
          element={(
            <ProtectedRoute roles={[ROLE.TEACHER, ROLE.ADMIN, ROLE.STUDENT]}>
              <TeacherDashboard />
            </ProtectedRoute>
          )}
        />

        {/* Belajar: murid */}
        <Route
          path="/student/:classId"
          element={(
            <ProtectedRoute roles={[ROLE.STUDENT]}>
              <StudentDashboard />
            </ProtectedRoute>
          )}
        />

        {/* Kuis: murid */}
        <Route
          path="/quiz/:classId/:nodeId"
          element={(
            <ProtectedRoute roles={[ROLE.STUDENT]}>
              <Quiz />
            </ProtectedRoute>
          )}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
