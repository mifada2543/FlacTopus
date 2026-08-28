import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AUTH_API, RUANGAN_API } from '../utils/api';
import { LogOut } from 'lucide-react';
import { ROLE, isAllowed } from '../utils/roles';
import {
  Users, UserCheck, UserX, Shield, GraduationCap, BookOpen,
  Search, Trash2, Key, ChevronDown, ArrowLeft, Clock, CheckCircle,
  XCircle, Loader2, BarChart3, Settings, Home, Activity,
  Wifi, WifiOff, Eye, AlertTriangle, KeyRound, Filter
} from 'lucide-react';

const ADMIN_API = `${import.meta.env.BASE_URL}backend/controller/api/admin.php`;

// ---- Shared helpers ----
const adminGet = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${ADMIN_API}?${qs}` : ADMIN_API;
  const res = await fetch(url, { credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal memuat data.');
  return data;
};

const adminPost = async (csrfToken, payload) => {
  const res = await fetch(ADMIN_API, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || 'Terjadi kesalahan.');
  return data;
};

const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtSisa = (detik) => {
  const d = Math.max(0, Math.floor(detik));
  const h = String(Math.floor(d / 3600)).padStart(2, '0');
  const m = String(Math.floor((d % 3600) / 60)).padStart(2, '0');
  const s = String(d % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// ---- Badge components ----
const roleBadge = (role) => {
  const map = {
    admin:  { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.4)', label: 'Admin', icon: <Shield size={13} /> },
    teacher:{ bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)', label: 'Guru', icon: <GraduationCap size={13} /> },
    student:{ bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.4)', label: 'Murid', icon: <BookOpen size={13} /> },
  };
  const s = map[role] || map.student;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem',
      fontWeight: 700, background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {s.icon} {s.label}
    </span>
  );
};

const statusBadge = (status) => {
  const map = {
    pending:  { bg: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24', border: 'rgba(234, 179, 8, 0.4)', label: 'Menunggu', icon: <Clock size={13} /> },
    active:   { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.4)', label: 'Aktif', icon: <CheckCircle size={13} /> },
    rejected: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.4)', label: 'Ditolak', icon: <XCircle size={13} /> },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem',
      fontWeight: 700, background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {s.icon} {s.label}
    </span>
  );
};

// ---- Shared styles ----
const thStyle = {
  padding: '0.9rem 1rem', textAlign: 'left', fontWeight: 700,
  color: 'var(--text-muted)', fontSize: '0.82rem', textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const tdStyle = {
  padding: '0.8rem 1rem', color: 'var(--text-main)',
};

const modalBtnPrimary = {
  flex: 1, padding: '0.75rem', background: 'var(--accent-green)',
  color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
  fontSize: '0.9rem',
};

const modalBtnSecondary = {
  flex: 1, padding: '0.75rem', background: 'transparent',
  border: '1px solid var(--text-muted)', color: 'var(--text-muted)',
  borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem',
};

const inputStyle = {
  width: '100%', padding: '0.7rem 1rem',
  background: '#0f172a', border: '1px solid var(--border-color)',
  color: 'white', borderRadius: '8px', fontSize: '0.9rem', outline: 'none',
};

const btnSmall = (bg) => ({
  padding: '0.35rem 0.7rem', background: bg, color: 'white', border: 'none',
  borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
  transition: 'all 0.2s',
});

// ---- Tab Definitions ----
const TABS = [
  { id: 'users', label: 'Kelola User', icon: <Users size={16} /> },
  { id: 'rooms', label: 'Ruangan Terhapus', icon: <Trash2 size={16} /> },
  { id: 'activity', label: 'Activity Log', icon: <Activity size={16} /> },
];

// ================================================================
// MAIN COMPONENT
// ================================================================
export default function AdminPanel() {
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading, csrfToken } = useAuth();

  const [activeTab, setActiveTab] = useState('users');
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

  // Proteksi akses
  useEffect(() => {
    if (authLoading) return;
    if (!authUser) { navigate('/login'); return; }
    if (!isAllowed(authUser.role, [ROLE.ADMIN])) { navigate('/classes'); return; }
  }, [authLoading, authUser, navigate]);

  // Auto-clear action message
  useEffect(() => {
    if (actionMsg.text) {
      const t = setTimeout(() => setActionMsg({ type: '', text: '' }), 4000);
      return () => clearTimeout(t);
    }
  }, [actionMsg]);

  const showMsg = (type, text) => setActionMsg({ type, text });

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.6rem' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        Memuat panel admin...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      {/* ---- Header ---- */}
      <header className="responsive-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ color: 'var(--accent-green)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Settings size={22} /> Panel Admin
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            👋 {authUser?.name || 'Admin'}
          </span>
          <button
            onClick={async () => {
              try {
                await fetch(`${AUTH_API}/logout.php`, {
                  method: 'POST', credentials: 'same-origin',
                  headers: { 'X-CSRF-Token': csrfToken },
                });
              } catch {}
              localStorage.removeItem('currentUser');
              navigate('/login');
            }}
            style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444'; }}
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </header>

      {/* ---- Tab Navigation (sticky) ---- */}
      <div className="admin-tabs" style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', gap: 0, borderBottom: '2px solid var(--border-color)', padding: '0 clamp(0.5rem, 2vw, 2rem)', background: 'var(--bg-card)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: 'clamp(0.6rem, 1.5vw, 0.9rem) clamp(0.8rem, 2vw, 1.4rem)', background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 'clamp(0.78rem, 1.5vw, 0.9rem)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem',
              color: activeTab === tab.id ? 'var(--accent-green)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-green)' : '2px solid transparent',
              marginBottom: '-2px', transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---- Action Toast ---- */}
      {actionMsg.text && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 200,
          padding: '0.8rem 1.2rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600,
          background: actionMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${actionMsg.type === 'success' ? 'var(--accent-green)' : '#ef4444'}`,
          color: actionMsg.type === 'success' ? 'var(--accent-green)' : '#f87171',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {actionMsg.type === 'success' ? '✅ ' : '❌ '}{actionMsg.text}
        </div>
      )}

      {/* ---- Tab Content ---- */}
      <div style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
        {activeTab === 'users' && <UserManagementTab csrfToken={csrfToken} showMsg={showMsg} />}
        {activeTab === 'rooms' && <RoomsManagementTab csrfToken={csrfToken} showMsg={showMsg} />}
        {activeTab === 'activity' && <ActivityLogTab csrfToken={csrfToken} showMsg={showMsg} />}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ================================================================
// TAB 1: USER MANAGEMENT
// ================================================================
function UserManagementTab({ csrfToken, showMsg }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showResetModal, setShowResetModal] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [usersData, statsData] = await Promise.all([
        adminGet({ search: searchTerm, role: filterRole, status: filterStatus }),
        adminGet({ action: 'stats' }),
      ]);
      setUsers(usersData.users || []);
      setStats(statsData.stats || null);
    } catch (err) {
      showMsg('error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filterRole, filterStatus, showMsg]);

  useEffect(() => {
    if (!csrfToken) return;
    loadData();
  }, [csrfToken, loadData]);

  const handleApprove = async (userId) => {
    setActionLoading(true);
    try { await adminPost(csrfToken, { action: 'approve', user_id: userId }); showMsg('success', 'User berhasil di-approve!'); await loadData(); }
    catch (err) { showMsg('error', err.message); } finally { setActionLoading(false); }
  };

  const handleReject = async (userId) => {
    setActionLoading(true);
    try { await adminPost(csrfToken, { action: 'reject', user_id: userId }); showMsg('success', 'User berhasil ditolak.'); await loadData(); }
    catch (err) { showMsg('error', err.message); } finally { setActionLoading(false); }
  };

  const handleChangeRole = async () => {
    if (!showRoleModal || !newRole) return;
    setActionLoading(true);
    try {
      await adminPost(csrfToken, { action: 'change_role', user_id: showRoleModal.id, role: newRole });
      showMsg('success', `Role ${showRoleModal.name} berhasil diubah ke ${newRole}.`);
      setShowRoleModal(null); setNewRole(''); await loadData();
    } catch (err) { showMsg('error', err.message); } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    setActionLoading(true);
    try {
      await adminPost(csrfToken, { action: 'delete', user_id: showDeleteModal.id });
      showMsg('success', `User "${showDeleteModal.name}" berhasil dihapus.`);
      setShowDeleteModal(null); await loadData();
    } catch (err) { showMsg('error', err.message); } finally { setActionLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!showResetModal || !newPassword) return;
    setActionLoading(true);
    try {
      await adminPost(csrfToken, { action: 'reset_password', user_id: showResetModal.id, new_password: newPassword });
      showMsg('success', `Password ${showResetModal.name} berhasil di-reset.`);
      setShowResetModal(null); setNewPassword('');
    } catch (err) { showMsg('error', err.message); } finally { setActionLoading(false); }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Memuat data user...
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total', value: stats.total, color: 'var(--accent-green)' },
            { label: 'Menunggu', value: stats.total_pending, color: '#fbbf24' },
            { label: 'Aktif', value: stats.total_active, color: '#34d399' },
            { label: 'Ditolak', value: stats.total_rejected, color: '#f87171' },
            { label: 'Murid', value: stats.total_student, color: '#34d399' },
            { label: 'Guru', value: stats.total_teacher, color: '#60a5fa' },
            { label: 'Admin', value: stats.total_admin, color: '#f87171' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value ?? 0}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar" style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.2rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Cari nama atau email..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '2.5rem', width: '100%' }} />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ ...inputStyle, flex: '0 1 auto', cursor: 'pointer' }}>
          <option value="">Semua Role</option>
          <option value="student">Murid</option>
          <option value="teacher">Guru</option>
          <option value="admin">Admin</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle, flex: '0 1 auto', cursor: 'pointer' }}>
          <option value="">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="active">Aktif</option>
          <option value="rejected">Ditolak</option>
        </select>
      </div>

      {/* Table */}
      <div className="responsive-table-wrap" style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Users size={40} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: '0.8rem' }} />
            <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Tidak ada user ditemukan.</h3>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Nama</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Terdaftar</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.03)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{u.name}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={tdStyle}>{roleBadge(u.role)}</td>
                    <td style={tdStyle}>{statusBadge(u.status)}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmtDate(u.created_at)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {u.status === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(u.id)} disabled={actionLoading} style={btnSmall('rgba(16, 185, 129, 0.2)')} title="Approve">
                              <CheckCircle size={12} color="var(--accent-green)" /> Terima
                            </button>
                            <button onClick={() => handleReject(u.id)} disabled={actionLoading} style={btnSmall('rgba(239, 68, 68, 0.2)')} title="Tolak">
                              <XCircle size={12} color="#f87171" /> Tolak
                            </button>
                          </>
                        )}
                        <button onClick={() => { setShowRoleModal(u); setNewRole(u.role); }} style={btnSmall('rgba(59, 130, 246, 0.2)')} title="Ubah role">
                          <Shield size={12} color="#60a5fa" />
                        </button>
                        <button onClick={() => { setShowResetModal(u); setNewPassword(''); }} style={btnSmall('rgba(234, 179, 8, 0.2)')} title="Reset password">
                          <Key size={12} color="#fbbf24" />
                        </button>
                        <button onClick={() => setShowDeleteModal(u)} style={btnSmall('rgba(239, 68, 68, 0.15)')} title="Hapus">
                          <Trash2 size={12} color="#f87171" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Change Role */}
      {showRoleModal && (
        <ModalBackdrop onClose={() => setShowRoleModal(null)}>
          <ModalCard title="Ubah Role" titleColor="#60a5fa" onClose={() => setShowRoleModal(null)}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Ubah role <strong style={{ color: 'white' }}>{showRoleModal.name}</strong> ({showRoleModal.email}):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
              {['student', 'teacher', 'admin'].map(r => (
                <label key={r} style={{
                  display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.7rem',
                  background: newRole === r ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  border: `1px solid ${newRole === r ? '#3b82f6' : 'var(--border-color)'}`,
                  borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  <input type="radio" name="role" value={r} checked={newRole === r} onChange={() => setNewRole(r)} style={{ accentColor: '#3b82f6' }} />
                  {roleBadge(r)}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button onClick={() => setShowRoleModal(null)} style={modalBtnSecondary}>Batal</button>
              <button onClick={handleChangeRole} disabled={actionLoading || newRole === showRoleModal.role} style={{ ...modalBtnPrimary, background: '#3b82f6' }}>
                {actionLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null} Simpan
              </button>
            </div>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Modal: Delete */}
      {showDeleteModal && (
        <ModalBackdrop onClose={() => setShowDeleteModal(null)}>
          <ModalCard title="Hapus User" titleColor="#f87171" onClose={() => setShowDeleteModal(null)}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Yakin ingin menghapus user ini?</p>
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 700, color: '#f87171', margin: 0 }}>{showDeleteModal.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>{showDeleteModal.email}</p>
            </div>
            <p style={{ color: '#fbbf24', fontSize: '0.82rem', marginBottom: '1rem' }}>⚠️ Tindakan ini tidak dapat dibatalkan. CASCADE akan menghapus data terkait.</p>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button onClick={() => setShowDeleteModal(null)} style={modalBtnSecondary}>Batal</button>
              <button onClick={handleDelete} disabled={actionLoading} style={{ ...modalBtnPrimary, background: '#ef4444', color: 'white' }}>
                {actionLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />} Hapus
              </button>
            </div>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Modal: Reset Password */}
      {showResetModal && (
        <ModalBackdrop onClose={() => setShowResetModal(null)}>
          <ModalCard title="Reset Password" titleColor="#fbbf24" onClose={() => setShowResetModal(null)}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Reset password untuk <strong style={{ color: 'white' }}>{showResetModal.name}</strong>:
            </p>
            <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', padding: '0.8rem', marginBottom: '1rem' }}>
              <p style={{ color: '#fbbf24', fontSize: '0.85rem', margin: 0 }}>{showResetModal.email}</p>
            </div>
            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>Password Baru</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 8 karakter"
              style={{ ...inputStyle, marginBottom: '0.8rem', borderColor: newPassword.length > 0 && newPassword.length < 8 ? '#ef4444' : 'var(--border-color)' }} autoFocus />
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '-0.5rem', marginBottom: '0.8rem' }}>Minimal 8 karakter</p>
            )}
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button onClick={() => setShowResetModal(null)} style={modalBtnSecondary}>Batal</button>
              <button onClick={handleResetPassword} disabled={actionLoading || newPassword.length < 8} style={{ ...modalBtnPrimary, background: '#eab308' }}>
                {actionLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Key size={16} />} Reset
              </button>
            </div>
          </ModalCard>
        </ModalBackdrop>
      )}
    </div>
  );
}

// ================================================================
// TAB 2: RUANGAN TERHAPUS (Trash)
// Admin hanya melihat ruangan yang dihapus guru (soft-deleted)
// ================================================================
function RoomsManagementTab({ csrfToken, showMsg }) {
  const [trashedRooms, setTrashedRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(null);
  const [showForceDeleteModal, setShowForceDeleteModal] = useState(null);

  const loadTrash = useCallback(async () => {
    try {
      const res = await fetch(`${RUANGAN_API}/ruangan.php?action=trash`, { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal memuat data.');
      setTrashedRooms(data.ruangan || []);
    } catch (err) {
      showMsg('error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [showMsg]);

  useEffect(() => {
    if (!csrfToken) return;
    loadTrash();
  }, [csrfToken, loadTrash]);

  const handleRestore = async () => {
    if (!showRestoreModal) return;
    setActionLoading(true);
    try {
      await adminPost(csrfToken, { action: 'restore', id: showRestoreModal.id });
      showMsg('success', `Ruangan "${showRestoreModal.nama}" berhasil dipulihkan!`);
      setTrashedRooms(prev => prev.filter(r => r.id !== showRestoreModal.id));
      setShowRestoreModal(null);
    } catch (err) { showMsg('error', err.message); } finally { setActionLoading(false); }
  };

  const handleForceDelete = async () => {
    if (!showForceDeleteModal) return;
    setActionLoading(true);
    try {
      await adminPost(csrfToken, { action: 'force_delete', id: showForceDeleteModal.id });
      showMsg('success', `Ruangan "${showForceDeleteModal.nama}" dihapus permanen.`);
      setTrashedRooms(prev => prev.filter(r => r.id !== showForceDeleteModal.id));
      setShowForceDeleteModal(null);
    } catch (err) { showMsg('error', err.message); } finally { setActionLoading(false); }
  };

  const q = searchTerm.trim().toLowerCase();
  const filteredRooms = q ? trashedRooms.filter(r =>
    (r.nama || '').toLowerCase().includes(q) || (r.guru || '').toLowerCase().includes(q)
  ) : trashedRooms;

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Memuat ruangan terhapus...
      </div>
    );
  }

  return (
    <div>
      {/* Info Banner */}
      <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <AlertTriangle size={20} color="#60a5fa" style={{ flexShrink: 0 }} />
        <div>
          <p style={{ color: '#60a5fa', fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>Ruangan Terhapus</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>
            Hanya ruangan yang dihapus oleh guru yang muncul di sini. Data akan dihapus permanen setelah 30 hari. Anda bisa memulihkannya kapan saja.
          </p>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.2rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Cari nama ruangan atau guru..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '2.5rem' }} />
        </div>
      </div>

      {/* Table */}
      <div className="responsive-table-wrap" style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {filteredRooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Trash2 size={40} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: '0.8rem' }} />
            <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{trashedRooms.length === 0 ? 'Tidak ada ruangan terhapus.' : 'Tidak ada yang cocok.'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
              {trashedRooms.length === 0 ? 'Ruangan yang dihapus guru akan muncul di sini.' : 'Coba kata kunci lain.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Nama Ruangan</th>
                  <th style={thStyle}>Guru</th>
                  <th style={thStyle}>Anggota</th>
                  <th style={thStyle}>Dihapus</th>
                  <th style={thStyle}>Sisa Hari</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room, idx) => {
                  const sisaHari = Math.ceil((room.sisa_hari_detik ?? 0) / 86400);
                  const isUrgent = sisaHari <= 7;

                  return (
                    <tr key={room.id} style={{ borderBottom: '1px solid var(--border-color)' }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.03)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Trash2 size={13} color="#f87171" style={{ flexShrink: 0 }} />
                          <span>{room.nama}</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><GraduationCap size={12} color="#60a5fa" />{room.guru}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: room.anggota > 0 ? 'white' : 'var(--text-muted)' }}>
                          <Users size={12} /> {room.anggota}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {fmtDate(room.deleted_at)}
                      </td>
                      <td style={{ ...tdStyle }}>
                        <span style={{
                          fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700,
                          color: isUrgent ? '#f87171' : sisaHari <= 14 ? '#fbbf24' : 'var(--text-muted)',
                          background: isUrgent ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                          padding: '0.15rem 0.5rem', borderRadius: '4px',
                        }}>
                          {sisaHari} hari
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                          <button onClick={() => setShowRestoreModal(room)} style={btnSmall('rgba(16, 185, 129, 0.2)')} title="Pulihkan">
                            <CheckCircle size={12} color="var(--accent-green)" /> Pulihkan
                          </button>
                          <button onClick={() => setShowForceDeleteModal(room)} style={btnSmall('rgba(239, 68, 68, 0.15)')} title="Hapus Permanen">
                            <Trash2 size={12} color="#f87171" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Restore */}
      {showRestoreModal && (
        <ModalBackdrop onClose={() => setShowRestoreModal(null)}>
          <ModalCard title="Pulihkan Ruangan" titleColor="var(--accent-green)" onClose={() => setShowRestoreModal(null)}>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 700, color: 'var(--accent-green)', margin: 0 }}>{showRestoreModal.nama}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.3rem 0 0' }}>
                Guru: {showRestoreModal.guru} · {showRestoreModal.anggota} anggota
              </p>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.5' }}>
              Ruangan akan dipulihkan dan guru serta murid bisa mengaksesnya kembali.
            </p>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button onClick={() => setShowRestoreModal(null)} style={modalBtnSecondary}>Batal</button>
              <button onClick={handleRestore} disabled={actionLoading} style={modalBtnPrimary}>
                {actionLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />} Pulihkan
              </button>
            </div>
          </ModalCard>
        </ModalBackdrop>
      )}

      {/* Modal: Force Delete */}
      {showForceDeleteModal && (
        <ModalBackdrop onClose={() => setShowForceDeleteModal(null)}>
          <ModalCard title="Hapus Permanen" titleColor="#f87171" onClose={() => setShowForceDeleteModal(null)}>
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 700, color: '#f87171', margin: 0 }}>{showForceDeleteModal.nama}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.3rem 0 0' }}>
                Guru: {showForceDeleteModal.guru} · {showForceDeleteModal.anggota} anggota
              </p>
            </div>
            <p style={{ color: '#fbbf24', fontSize: '0.85rem', marginBottom: '1rem' }}>
              ⚠️ Tindakan ini tidak dapat dibatalkan. Seluruh data (anggota, silabus, analitik) akan dihapus permanen.
            </p>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button onClick={() => setShowForceDeleteModal(null)} style={modalBtnSecondary}>Batal</button>
              <button onClick={handleForceDelete} disabled={actionLoading} style={{ ...modalBtnPrimary, background: '#ef4444', color: 'white' }}>
                {actionLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />} Hapus Permanen
              </button>
            </div>
          </ModalCard>
        </ModalBackdrop>
      )}
    </div>
  );
}

// ================================================================
// TAB 3: ACTIVITY LOG
// ================================================================
function ActivityLogTab({ csrfToken, showMsg }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const params = { action: 'activity_logs', page, per_page: 20 };
      if (filterAction) params.action_filter = filterAction;
      if (filterUser) params.user_filter = filterUser;

      const [logsData, statsData] = await Promise.all([
        adminGet(params),
        adminGet({ action: 'activity_stats' }),
      ]);
      setLogs(logsData.logs || []);
      setTotalPages(logsData.total_pages || 1);
      setStats(statsData.stats || null);
    } catch (err) {
      showMsg('error', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, filterAction, filterUser, showMsg]);

  useEffect(() => {
    if (!csrfToken) return;
    loadData();
  }, [csrfToken, loadData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !csrfToken) return;
    const iv = setInterval(loadData, 15000);
    return () => clearInterval(iv);
  }, [autoRefresh, csrfToken, loadData]);

  // Action badge colors
  const actionBadge = (action) => {
    const map = {
      login:          { bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', label: '🔐 Login' },
      login_failed:   { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', label: '❌ Login Gagal' },
      rate_limited:   { bg: 'rgba(234, 179, 8, 0.12)', color: '#fbbf24', label: '🔒 Rate Limited' },
      logout:         { bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af', label: '🚪 Logout' },
      register:       { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', label: '📝 Register' },
      register_failed:{ bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', label: '❌ Register Gagal' },
      approve_user:   { bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', label: '✅ Approve' },
      reject_user:    { bg: 'rgba(234, 179, 8, 0.12)', color: '#fbbf24', label: '🚫 Reject' },
      change_role:    { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa', label: '🔄 Role' },
      delete_user:    { bg: 'rgba(239, 68, 68, 0.12)', color: '#f87171', label: '🗑️ Hapus' },
      reset_password: { bg: 'rgba(234, 179, 8, 0.12)', color: '#fbbf24', label: '🔑 Reset Pwd' },
    };
    const s = map[action] || { bg: 'rgba(107, 114, 128, 0.12)', color: '#9ca3af', label: action };
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem',
        fontWeight: 600, background: s.bg, color: s.color,
        whiteSpace: 'nowrap',
      }}>
        {s.label}
      </span>
    );
  };

  // Parse user agent to short form
  const shortUA = (ua) => {
    if (!ua) return '-';
    if (ua.includes('Firefox')) return '🦊 Firefox';
    if (ua.includes('Edg')) return '🔷 Edge';
    if (ua.includes('Chrome')) return '🌐 Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return '🧭 Safari';
    return '📱 Other';
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Memuat activity log...
      </div>
    );
  }

  const allActions = ['login', 'login_failed', 'rate_limited', 'logout', 'register', 'register_failed', 'approve_user', 'reject_user', 'change_role', 'delete_user', 'reset_password'];

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Event', value: stats.total, color: 'var(--accent-green)' },
            { label: 'Login', value: stats.total_login, color: '#34d399' },
            { label: 'Login Gagal', value: stats.total_login_failed, color: '#f87171' },
            { label: 'Rate Limited', value: stats.total_rate_limited, color: '#fbbf24' },
            { label: 'Logout', value: stats.total_logout, color: '#9ca3af' },
            { label: 'Admin Actions', value: stats.total_admin_actions, color: '#60a5fa' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.value ?? 0}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar" style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.2rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{ position: 'relative', flex: '1 1 150px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Cari user ID..." value={filterUser}
            onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
            style={{ ...inputStyle, paddingLeft: '2.2rem', fontSize: '0.85rem', width: '100%' }} />
        </div>
        <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          style={{ ...inputStyle, flex: '0 1 auto', cursor: 'pointer', fontSize: '0.85rem' }}>
          <option value="">Semua Aksi</option>
          {allActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', padding: '0 0.5rem' }}>
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} style={{ accentColor: 'var(--accent-green)' }} />
          Auto-refresh
        </label>
      </div>

      {/* Log Table */}
      <div className="responsive-table-wrap" style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Activity size={40} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: '0.8rem' }} />
            <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Tidak ada log ditemukan.</h3>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ ...thStyle, fontSize: '0.78rem' }}>Waktu</th>
                  <th style={{ ...thStyle, fontSize: '0.78rem' }}>Aksi</th>
                  <th style={{ ...thStyle, fontSize: '0.78rem' }}>User</th>
                  <th style={{ ...thStyle, fontSize: '0.78rem' }}>IP Address</th>
                  <th style={{ ...thStyle, fontSize: '0.78rem' }}>Browser</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.02)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {fmtDate(log.created_at)}
                    </td>
                    <td style={tdStyle}>{actionBadge(log.action)}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, fontSize: '0.82rem' }}>
                      {log.user_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>System</span>}
                      {log.user_email && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: '0.3rem' }}>({log.user_email})</span>}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {log.ip_address}
                    </td>
                    <td style={{ ...tdStyle, fontSize: '0.78rem' }}>
                      {shortUA(log.user_agent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', marginTop: '1.2rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            style={{ padding: '0.4rem 0.8rem', background: page <= 1 ? 'transparent' : 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--border-color)', color: page <= 1 ? 'var(--text-muted)' : 'var(--accent-green)', borderRadius: '6px', cursor: page <= 1 ? 'default' : 'pointer', fontSize: '0.85rem' }}>
            ← Sebelumnya
          </button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Halaman <strong style={{ color: 'var(--accent-green)' }}>{page}</strong> dari {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ padding: '0.4rem 0.8rem', background: page >= totalPages ? 'transparent' : 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--border-color)', color: page >= totalPages ? 'var(--text-muted)' : 'var(--accent-green)', borderRadius: '6px', cursor: page >= totalPages ? 'default' : 'pointer', fontSize: '0.85rem' }}>
            Selanjutnya →
          </button>
        </div>
      )}
    </div>
  );
}

// ================================================================
// Shared Modal Components
// ================================================================
function ModalBackdrop({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 100, animation: 'fadeIn 0.2s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', margin: '1rem' }}>
        {children}
      </div>
    </div>
  );
}

function ModalCard({ title, titleColor, onClose, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '16px',
      width: '100%', border: '1px solid var(--border-color)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ color: titleColor, margin: 0, fontSize: '1.1rem' }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
      </div>
      {children}
    </div>
  );
}
