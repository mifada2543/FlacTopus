import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, LogOut, Users, Trash2, UserCog, Search, Pencil, Copy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AUTH_API, RUANGAN_API } from '../utils/api';
import { ROLE } from '../utils/roles';

// Helper fetch GET ke API ruangan
const apiGet = async () => {
  const res = await fetch(`${RUANGAN_API}/ruangan.php`, { credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal memuat ruangan.');
  return data;
};

export default function ClassDashboard() {
  const navigate = useNavigate();
  // Kontrol akses: sumber kebenaran = session PHP
  const { user: sessionUser, loading: sessionLoading, csrfToken } = useAuth();
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(Date.now());
  const mounted = useRef(true);

  // States for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTheme, setNewRoomTheme] = useState('#0f172a');
  const [newRoomOutline, setNewRoomOutline] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [renameRoom, setRenameRoom] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameTheme, setRenameTheme] = useState('#0f172a');
  const [renameOutline, setRenameOutline] = useState(true);
  // Pesan error inline per modal (pengganti alert())
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [renameError, setRenameError] = useState('');

  const loadRooms = useCallback(async () => {
    try {
      const data = await apiGet();
      if (!mounted.current) return;
      setRooms(data.ruangan || []);
      setLastFetch(Date.now());
    } catch (err) {
      if (mounted.current) alert(err.message);
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, []);

  const postAction = useCallback(async (payload) => {
    const res = await fetch(`${RUANGAN_API}/ruangan.php`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.message || 'Terjadi kesalahan.');
    return data;
  }, [csrfToken]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!sessionUser) {
      navigate('/login');
      return;
    }
    setUser(sessionUser);
    loadRooms();
  }, [sessionLoading, sessionUser, navigate, loadRooms]);

  // Refresh berkala daftar ruangan
  useEffect(() => {
    if (!user) return;
    const iv = setInterval(() => {
      loadRooms();
    }, 30000);
    return () => clearInterval(iv);
  }, [user, loadRooms]);

  const handleLogout = async () => {
    try {
      await fetch(`${AUTH_API}/logout.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-CSRF-Token': csrfToken },
      });
    } catch { /* session tetap dihapus di sisi client */ }
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  const handleCreate = async () => {
    const nama = newRoomName.trim();
    if (!nama) { setCreateError('Nama ruangan tidak boleh kosong.'); return; }
    if (nama.length < 3) { setCreateError('Nama ruangan minimal 3 karakter.'); return; }
    
    let themeToSend = newRoomTheme;
    if (newRoomTheme !== '#0f172a' && !newRoomOutline) {
      themeToSend += '_nooutline';
    }

    try {
      await postAction({ action: 'create', nama, theme_color: themeToSend });
      await loadRooms();
      setShowCreateModal(false);
      setNewRoomName('');
      setNewRoomTheme('#0f172a');
      setNewRoomOutline(true);
      setCreateError('');
    } catch (err) {
      setCreateError(err.message);
    }
  };

  const handleJoin = async () => {
    const kode = joinCode.trim().toUpperCase();
    if (!kode) { setJoinError('Masukkan kode ruangan.'); return; }
    if (kode.length !== 6) { setJoinError('Kode ruangan harus tepat 6 karakter (contoh: TREE01).'); return; }
    try {
      await postAction({ action: 'join', kode_ruangan: kode });
      await loadRooms();
      setShowJoinModal(false);
      setJoinCode('');
      setJoinError('');
    } catch (err) {
      setJoinError(err.message);
    }
  };

  const handleDelete = async (e, room) => {
    e.stopPropagation();
    if (!window.confirm(`Hapus ruangan "${room.nama}" secara permanen? Murid yang tergabung juga akan terhapus.`)) return;
    try {
      await postAction({ action: 'delete', id: room.id });
      setRooms(rooms.filter(r => r.id !== room.id));
    } catch (err) {
      alert(err.message);
      return;
    }
  };

  const handleDuplicate = async (e, room) => {
    e.stopPropagation();
    if (!window.confirm(`Duplikat kelas "${room.nama}"?\n\n(Hanya skill tree dan pengaturan yang disalin. Data murid tidak akan disalin.)`)) return;
    
    try {
      // 1. Ambil syllabus dari kelas lama
      const res = await fetch(`${RUANGAN_API}/ruangan.php?action=syllabus&id=${room.id}`, { credentials: 'same-origin' });
      const oldSyllabus = await res.json();
      
      // 2. Buat kelas baru
      const copyName = "Copy " + room.nama;
      const data = await postAction({ action: 'create', nama: copyName, theme_color: room.theme_color || '#0f172a' });
      const newRoomId = data.ruangan?.id;
      
      if (newRoomId && oldSyllabus.nodes) {
        // 3. Simpan syllabus ke kelas baru
        await postAction({ action: 'syllabus', id: newRoomId, nodes: oldSyllabus.nodes, edges: oldSyllabus.edges || [] });
      }
      
      await loadRooms();
      alert(`Kelas berhasil diduplikat menjadi "${copyName}"!`);
    } catch (err) {
      alert("Gagal menduplikat kelas: " + err.message);
    }
  };

  const openRename = (e, room) => {
    e.stopPropagation();
    setRenameRoom(room);
    setRenameValue(room.nama);
    
    let currentTheme = room.theme_color || '#0f172a';
    let hasOutline = true;
    if (currentTheme.endsWith('_nooutline')) {
      hasOutline = false;
      currentTheme = currentTheme.replace('_nooutline', '');
    }
    setRenameTheme(currentTheme);
    setRenameOutline(hasOutline);
    setRenameError('');
  };

  const handleRename = async () => {
    const nama = renameValue.trim();
    if (!nama) { setRenameError('Nama ruangan tidak boleh kosong.'); return; }
    if (nama.length < 3) { setRenameError('Nama ruangan minimal 3 karakter.'); return; }
    
    let themeToSend = renameTheme;
    if (renameTheme !== '#0f172a' && !renameOutline) {
      themeToSend += '_nooutline';
    }

    if (nama === renameRoom.nama && themeToSend === renameRoom.theme_color) {
      setRenameRoom(null); // tidak berubah, tutup saja
      setRenameError('');
      return;
    }
    try {
      const data = await postAction({ action: 'rename', id: renameRoom.id, nama, theme_color: themeToSend });
      setRooms(rooms.map(r => r.id === renameRoom.id ? { ...r, nama: data.nama || nama, theme_color: data.theme_color || themeToSend } : r));
      setRenameRoom(null);
      setRenameError('');
    } catch (err) {
      setRenameError(err.message);
    }
  };

  const openManage = (e, room) => {
    e.stopPropagation();
    navigate(`/room/${room.id}`);
  };

  const openClass = async (room) => {
    // Catat aktivitas → reset hitung mundur 2 jam
    postAction({ action: 'touch', id: room.id }).catch(() => {});
    // Guru membuka dashboard analisis kelas; murid membuka tampilan belajar
    if (user.role === ROLE.TEACHER) {
      navigate(`/analytics/${room.id}`);
    } else {
      navigate(`/student/${room.id}`);
    }
  };

  const isOwner = (room) => user && (room.user_id === user.id);
  const isOwnerOrAdmin = (room) => isOwner(room) || room.member_role === 'admin';

  // Pencarian client-side: cocokkan nama ATAU kode ruangan (case-insensitive)
  const q = searchTerm.trim().toLowerCase();
  const filteredRooms = q
    ? rooms.filter(r =>
        (r.nama || '').toLowerCase().includes(q) ||
        (r.kode_ruangan || '').toLowerCase().includes(q)
      )
    : rooms;

  if (isLoading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '3rem' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ color: 'var(--accent-green)', fontSize: '2rem' }}>Halo, {user?.name}!</h1>
          <p style={{ color: 'var(--text-muted)' }}>Role: {user?.role === ROLE.TEACHER ? 'Guru' : user?.role === ROLE.ADMIN ? 'Admin' : 'Murid'}</p>
        </div>
        <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LogOut size={18} /> Keluar
        </button>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Daftar Ruangan</h2>
        <div style={{ display: 'flex', gap: '0.7rem' }}>
          {user?.role === ROLE.STUDENT && (
            <button onClick={() => { setShowJoinModal(true); setJoinError(''); }} style={{ background: 'var(--accent-green)', color: '#000', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} /> Gabung Ruangan
            </button>
          )}
          {user?.role === ROLE.TEACHER && (
            <button onClick={() => { setShowCreateModal(true); setCreateError(''); }} style={{ background: 'var(--accent-green)', color: '#000', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} /> Buat Ruangan Baru
            </button>
          )}
        </div>
      </div>

      {/* Pencarian ruangan (nama / kode) */}
      {rooms.length > 0 && (
        <div style={{ position: 'relative', maxWidth: '440px', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau kode ruangan (mis. TREE01)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Cari ruangan"
            style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'white', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-green)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>
      )}

      {rooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <BookOpen size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ color: 'var(--text-muted)' }}>Belum ada ruangan yang terdaftar.</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {user?.role === ROLE.TEACHER ? 'Klik tombol "Buat Ruangan Baru" untuk memulai.' : user?.role === ROLE.STUDENT ? 'Klik tombol "Gabung Ruangan" dan masukkan kode ruangan dari guru.' : 'Admin tidak memiliki akses ke kelas guru.'}
          </p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <Search size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3 style={{ color: 'var(--text-muted)' }}>Tidak ada ruangan yang cocok dengan "{searchTerm}".</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Coba kata kunci lain, atau hapus pencarian untuk melihat semua ruangan.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {filteredRooms.map(room => {
            const rawTheme = room.theme_color || '#0f172a';
            const isNoOutline = rawTheme.endsWith('_nooutline');
            const actualThemeColor = rawTheme.replace('_nooutline', '');
            const borderColor = isNoOutline ? '#0f172a' : actualThemeColor;
            return (
              <div
                key={room.id}
                onClick={() => openClass(room)}
                style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: `2px solid ${borderColor}`, cursor: 'pointer', transition: 'all 0.3s', position: 'relative', boxShadow: `0 4px 20px ${isNoOutline ? '#0f172a' : actualThemeColor}15` }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 25px ${isNoOutline ? '#0f172a' : actualThemeColor}30`; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 20px ${isNoOutline ? '#0f172a' : actualThemeColor}15`; }}
              >
                {isOwnerOrAdmin(room) && (
                  <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={(e) => openManage(e, room)}
                      title="Kelola murid & Analitik"
                      style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.4)', color: 'var(--accent-green)', cursor: 'pointer', borderRadius: '8px', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      <UserCog size={16} />
                    </button>
                    <button
                      onClick={(e) => openRename(e, room)}
                      title="Ubah nama ruangan"
                      style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#3b82f6', cursor: 'pointer', borderRadius: '8px', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      <Pencil size={16} />
                    </button>
                    {isOwner(room) && (
                      <>
                        <button
                          onClick={(e) => handleDuplicate(e, room)}
                          title="Duplikat kelas"
                          style={{ background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#a855f7', cursor: 'pointer', borderRadius: '8px', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(168, 85, 247, 0.25)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(168, 85, 247, 0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, room)}
                          title="Hapus ruangan"
                          style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', cursor: 'pointer', borderRadius: '8px', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                )}
                <h3 title={room.nama} style={{ color: 'var(--accent-green)', marginBottom: '0.5rem', fontSize: '1.2rem', paddingRight: isOwnerOrAdmin(room) ? (isOwner(room) ? '120px' : '85px') : '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.nama}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} /> Guru: {room.guru}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {room.anggota} murid bergabung
                </p>
                <div style={{ background: '#0f172a', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', border: '1px solid var(--border-color)', marginBottom: '0.7rem' }}>
                  Kode Ruangan: <strong style={{ color: 'white', letterSpacing: '2px' }}>{room.kode_ruangan}</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--accent-green)' }}>Buat Ruangan Baru</h3>
            <input
              type="text"
              placeholder="Nama Ruangan / Mapel (Contoh: Matematika 10A)"
              value={newRoomName}
              onChange={(e) => { setNewRoomName(e.target.value); setCreateError(''); }}
              aria-invalid={!!createError}
              style={{ width: '100%', padding: '1rem', background: '#0f172a', border: `1px solid ${createError ? '#ef4444' : 'var(--border-color)'}`, color: 'white', borderRadius: '8px', marginBottom: createError ? '0.5rem' : '1.5rem', transition: 'border-color 0.2s' }}
            />
            {createError && (
              <p role="alert" style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>⚠️ {createError}</p>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              ℹ️ Ruangan yang dibuat bersifat permanen.
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Tema Warna Ruangan:</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'].map(color => (
                  <button
                    key={color}
                    onClick={() => setNewRoomTheme(color)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%', background: color, border: newRoomTheme === color ? '3px solid white' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: newRoomTheme === color ? `0 0 10px ${color}80` : 'none'
                    }}
                    title={`Pilih tema ${color}`}
                  />
                ))}
              </div>
            </div>
            {newRoomTheme !== '#0f172a' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.85rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newRoomOutline}
                  onChange={(e) => setNewRoomOutline(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Gunakan warna pada border/outline kelas
              </label>
            )}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => { setShowCreateModal(false); setCreateError(''); setNewRoomTheme('#0f172a'); setNewRoomOutline(true); }} style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer' }}>Batal</button>
              <button onClick={handleCreate} style={{ flex: 1, padding: '0.8rem', background: 'var(--accent-green)', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>Buat</button>
            </div>
          </div>
        </div>
      )}

      {/* JOIN MODAL */}
      {showJoinModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--accent-green)' }}>Gabung Ruangan</h3>
            <input
              type="text"
              placeholder="Masukkan 6 Digit Kode Ruangan"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value); setJoinError(''); }}
              aria-invalid={!!joinError}
              style={{ width: '100%', padding: '1rem', background: '#0f172a', border: `1px solid ${joinError ? '#ef4444' : 'var(--border-color)'}`, color: 'white', borderRadius: '8px', marginBottom: joinError ? '0.5rem' : '1.5rem', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', transition: 'border-color 0.2s' }}
              maxLength={6}
            />
            {joinError && (
              <p role="alert" style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>⚠️ {joinError}</p>
            )}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => { setShowJoinModal(false); setJoinError(''); }} style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer' }}>Batal</button>
              <button onClick={handleJoin} style={{ flex: 1, padding: '0.8rem', background: 'var(--accent-green)', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>Gabung</button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {renameRoom && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '1rem', color: '#3b82f6' }}>Ubah Nama Ruangan</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Kode ruangan <strong style={{ color: 'white', letterSpacing: '1px' }}>{renameRoom.kode_ruangan}</strong> tidak berubah — murid tetap bisa bergabung.
            </p>
            <input
              type="text"
              placeholder="Nama Ruangan / Mapel (Contoh: Matematika 10A)"
              value={renameValue}
              onChange={(e) => { setRenameValue(e.target.value); setRenameError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
              autoFocus
              aria-invalid={!!renameError}
              style={{ width: '100%', padding: '1rem', background: '#0f172a', border: `1px solid ${renameError ? '#ef4444' : 'var(--border-color)'}`, color: 'white', borderRadius: '8px', marginBottom: renameError ? '0.5rem' : '1.5rem', transition: 'border-color 0.2s' }}
            />
            {renameError && (
              <p role="alert" style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>⚠️ {renameError}</p>
            )}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Tema Warna Ruangan:</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'].map(color => (
                  <button
                    key={color}
                    onClick={() => setRenameTheme(color)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%', background: color, border: renameTheme === color ? '3px solid white' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: renameTheme === color ? `0 0 10px ${color}80` : 'none'
                    }}
                    title={`Pilih tema ${color}`}
                  />
                ))}
              </div>
            </div>
            {renameTheme !== '#0f172a' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.85rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={renameOutline}
                  onChange={(e) => setRenameOutline(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Gunakan warna pada border/outline kelas
              </label>
            )}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => { setRenameRoom(null); setRenameError(''); }} style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer' }}>Batal</button>
              <button onClick={handleRename} style={{ flex: 1, padding: '0.8rem', background: '#3b82f6', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
