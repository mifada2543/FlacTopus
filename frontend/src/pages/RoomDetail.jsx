import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, UserX, Clock, KeyRound, BarChart3, Edit3, Pin, Star, Trash2, AlertTriangle, MessageSquare, Bot, User, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRoomHeartbeat } from '../hooks/useRoomHeartbeat';
import { RUANGAN_API, QUIZ_API } from '../utils/api';
import { ROLE } from '../utils/roles';

// Clock timer logic removed

export default function RoomDetail() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, csrfToken } = useAuth();

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [lastFetch, setLastFetch] = useState(Date.now());

  // "Ada orang disini?" â†’ browser menjawab "Ya, ada" setiap 3 menit
  useRoomHeartbeat(roomId);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(5);
  const [showChatModal, setShowChatModal] = useState(null); // { studentId, studentName }
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    let timer;
    if (showResetModal && resetCountdown > 0) {
      timer = setTimeout(() => setResetCountdown(resetCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [showResetModal, resetCountdown]);

  const handleResetAnalytics = async () => {
    try {
      const res = await fetch(`${RUANGAN_API}/ruangan.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ action: 'reset_analytics', id: roomId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        alert("Data analitik berhasil dibersihkan!");
      } else {
        alert("Gagal mereset analitik: " + (data.message || 'Unknown error'));
      }
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setShowResetModal(false);
      setResetCountdown(5);
    }
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${RUANGAN_API}/ruangan.php?action=members&id=${roomId}`, { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal memuat detail ruangan.');
      setRoom(data.ruangan);
      setMembers(data.anggota || []);
      setLastFetch(Date.now());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    load();
  }, [authLoading, user, navigate, load]);

  // Refresh kehadiran (status online murid) tiap 30 detik
  useEffect(() => {
    const ivReload = setInterval(() => load(), 30000);
    return () => { clearInterval(ivReload); };
  }, [load]);

  // Hanya pemilik ruangan atau ketua kelas yang boleh di sini
  useEffect(() => {
    if (!isLoading && room && user) {
      const isOwner = user.role === ROLE.ADMIN || room.user_id === user.id;
      const isKetua = members.some(m => Number(m.id) === Number(user.id) && m.role === 'admin');
      if (!isOwner && !isKetua) navigate('/classes');
    }
  }, [isLoading, room, user, members, navigate]);

  const handleKick = async (member) => {
    if (!window.confirm(`Keluarkan ${member.name} dari ruangan ini?`)) return;
    try {
      const res = await fetch(`${RUANGAN_API}/ruangan.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ action: 'kick', id: room.id, user_id: member.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal mengeluarkan murid.');
      setMembers(members.filter(m => m.id !== member.id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSetAdmin = async (member) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    const actionText = newRole === 'admin' ? 'Jadikan Ketua Kelas' : 'Turunkan menjadi Murid Biasa';
    if (!window.confirm(`${actionText} untuk ${member.name}?`)) return;
    try {
      const res = await fetch(`${RUANGAN_API}/ruangan.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ action: 'set_admin', id: room.id, user_id: member.id, role: newRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal mengubah status murid.');
      setMembers(members.map(m => m.id === member.id ? { ...m, role: newRole } : m));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleMark = async (member) => {
    try {
      const res = await fetch(`${RUANGAN_API}/ruangan.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ action: 'toggle_mark', id: room.id, user_id: member.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal menandai murid.');
      setMembers(members.map(m => m.id === member.id ? { ...m, is_marked: !m.is_marked } : m));
    } catch (err) {
      alert(err.message);
    }
  };

  const loadChatHistory = async (studentId, studentName) => {
    setShowChatModal({ studentId, studentName });
    setChatLoading(true);
    setChatHistory([]);
    try {
      const res = await fetch(`${QUIZ_API}?action=chat_history&ruangan_id=${roomId}&student_id=${studentId}`, { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setChatHistory(data.chats || []);
      }
    } catch (err) {
      console.error('Gagal memuat riwayat chat:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleTogglePin = async (member) => {
    try {
      const res = await fetch(`${RUANGAN_API}/ruangan.php`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ action: 'toggle_pin', id: room.id, user_id: member.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.message || 'Gagal mengubah pin murid.');
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (authLoading || isLoading) {
    return <div style={{ color: 'white', textAlign: 'center', marginTop: '3rem' }}>Loading...</div>;
  }

  if (error || !room) {
    return (
      <div style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
        <div style={{ background: 'var(--bg-card)', padding: '3rem', borderRadius: '15px', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</h2>
          <button onClick={() => navigate(`/classes`)} style={{ background: 'var(--accent-green)', color: '#000', border: 'none', padding: '0.7rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Kembali ke Daftar Ruangan</button>
        </div>
      </div>
    );
  }


  return (
    <div style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <button 
        onClick={() => navigate('/classes')}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', fontSize: '0.95rem' }}
      >
        <ArrowLeft size={18} /> Kembali ke Daftar Ruangan
      </button>

      {/* Status kehadiran: "Ada orang disini?" */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        background: room.online ? 'rgba(16,185,129,0.12)' : 'var(--bg-card)',
        border: `1px solid ${room.online ? 'var(--accent-green)' : 'var(--border-color)'}`,
        padding: '0.9rem 1.2rem', borderRadius: '10px', marginBottom: '1.5rem',
        color: room.online ? 'var(--accent-green)' : 'var(--text-muted)',
        fontSize: '0.95rem', fontWeight: 'bold',
      }}>
        <span style={{
          width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
          background: room.online ? 'var(--accent-green)' : 'var(--text-muted)',
          opacity: room.online ? 1 : 0.45,
          boxShadow: room.online ? '0 0 10px var(--accent-green)' : 'none',
        }} />
        {room.online ? '🟢 Ada orang disini — ruangan aktif' : '⚪ Tidak ada orang di ruangan saat ini'}
      </div>

      {/* Info ruangan */}
      <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--accent-green)', fontSize: '1.6rem', marginBottom: '0.5rem' }}>{room.nama}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={15} /> Guru: <strong style={{ color: 'white' }}>{room.guru}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <KeyRound size={15} /> Kode: <strong style={{ color: 'white', letterSpacing: '2px' }}>{room.kode_ruangan}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={15} /> {members.length} murid tergabung
            </span>
          </div>
        </div>

        {/* Tombol Cepat ke Analitik & Editor */}
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(`/analytics/${roomId}`)}
            style={{ background: 'transparent', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--accent-green)'; e.currentTarget.style.color = '#000'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent-green)'; }}
          >
            <BarChart3 size={16} /> Analitik Kelas
          </button>
          <button
            onClick={() => navigate(`/teacher/${roomId}`)}
            style={{ background: 'var(--accent-green)', border: 'none', color: '#000', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <Edit3 size={16} /> Editor Skill Tree
          </button>
          { (user.role === ROLE.ADMIN || (room && room.user_id === user.id)) && (
            <button
              onClick={() => setShowResetModal(true)}
              style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444'; }}
            >
              <Trash2 size={16} /> Reset Analitik
            </button>
          )}
        </div>
      </div>

      {/* Daftar murid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.2rem' }}>Daftar Murid</h2>
        {(user.role === ROLE.ADMIN || (room && room.user_id === user.id)) && (
          <button
            onClick={() => loadChatHistory(0, 'Semua Murid')}
            style={{ background: 'transparent', border: '1px solid #8b5cf6', color: '#8b5cf6', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 'bold', transition: 'all 0.2s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#8b5cf6'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b5cf6'; }}
          >
            <MessageSquare size={15} /> Riwayat Chat AI
          </button>
        )}
      </div>
      {members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
          <Users size={40} style={{ opacity: 0.5, marginBottom: '0.8rem' }} />
          <p>Belum ada murid yang bergabung. Bagikan kode ruangan <strong style={{ color: 'white', letterSpacing: '2px' }}>{room.kode_ruangan}</strong> ke murid.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {members.map(member => (
            <div key={member.id} className="student-card">
              <div className="student-card-info">
                <span
                  title={member.online ? 'Online' : 'Offline'}
                  style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: member.online ? 'var(--accent-green)' : 'var(--text-muted)',
                    opacity: member.online ? 1 : 0.4,
                    boxShadow: member.online ? '0 0 8px var(--accent-green)' : 'none',
                  }}
                />
                <div>
                  <div style={{ color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                    {member.name} 
                    {member.role === 'admin' && <span style={{ background: '#3b82f6', color: 'white', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>Ketua Kelas</span>}
                    {member.pinned_at && <span style={{ background: '#f59e0b', color: 'white', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Pin size={10} /> Ditandai Atas</span>}
                    {member.is_marked && <span style={{ background: '#ec4899', color: 'white', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Star size={10} /> Spesial</span>}
                    {member.online && <span style={{ color: 'var(--accent-green)', fontSize: '0.75rem', fontWeight: 'normal', marginLeft: '0.5rem' }}>• Online</span>}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{member.email} • Bergabung {member.joined_at}</div>
                </div>
              </div>
              
              <div className="student-card-actions">
                { (user.role === ROLE.ADMIN || (room && room.user_id === user.id)) && (
                  <>
                    <button
                      onClick={() => handleTogglePin(member)}
                      title={member.pinned_at ? "Lepas Pin" : "Pin Murid (tampilkan teratas)"}
                      style={{ background: 'transparent', border: '1px solid #f59e0b', color: '#f59e0b', padding: '0.45rem 0.9rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#f59e0b'; e.currentTarget.style.color = '#fff'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f59e0b'; }}
                    >
                      <Pin size={15} /> {member.pinned_at ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={() => handleToggleMark(member)}
                      title={member.is_marked ? "Hapus Tanda" : "Tandai Murid (Berikan Badge)"}
                      style={{ background: 'transparent', border: '1px solid #ec4899', color: '#ec4899', padding: '0.45rem 0.9rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#ec4899'; e.currentTarget.style.color = '#fff'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ec4899'; }}
                    >
                      <Star size={15} /> {member.is_marked ? 'Unmark' : 'Mark'}
                    </button>
                    <button
                      onClick={() => handleSetAdmin(member)}
                      title={member.role === 'admin' ? "Jadikan Murid Biasa" : "Jadikan Ketua Kelas"}
                      style={{ background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', padding: '0.45rem 0.9rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3b82f6'; }}
                    >
                      <KeyRound size={15} /> {member.role === 'admin' ? 'Copot Jabatan' : 'Jadikan Ketua'}
                    </button>
                  </>
                )}
                {(user.role === ROLE.ADMIN || (room && room.user_id === user.id)) && (
                  <button
                    onClick={() => loadChatHistory(member.id, member.name)}
                    title="Lihat Riwayat Chat AI"
                    style={{ background: 'transparent', border: '1px solid #8b5cf6', color: '#8b5cf6', padding: '0.45rem 0.9rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#8b5cf6'; e.currentTarget.style.color = '#fff'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8b5cf6'; }}
                  >
                    <MessageSquare size={15} /> Chat
                  </button>
                )}
                <button
                  onClick={() => handleKick(member)}
                  title="Keluarkan murid dari ruangan"
                  style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.45rem 0.9rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444'; }}
                >
                  <UserX size={15} /> Keluarkan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chat History Modal */}
      {showChatModal && (
        <div className="modal-overlay" onClick={() => setShowChatModal(null)}>
          <div className="modal-content" style={{ maxWidth: '700px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="modal-title" style={{ textAlign: 'left', fontSize: '1.3rem' }}>
                💬 Riwayat Chat AI — {showChatModal.studentName}
              </h2>
              <button onClick={() => setShowChatModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', maxHeight: '60vh' }}>
              {chatLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Memuat riwayat chat...</div>
              ) : chatHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <Bot size={40} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                  <p>Belum ada riwayat chat AI.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Group by node */}
                  {(() => {
                    const grouped = {};
                    chatHistory.forEach(chat => {
                      const key = chat.node_label || 'Umum';
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(chat);
                    });
                    return Object.entries(grouped).map(([nodeLabel, chats]) => (
                      <div key={nodeLabel} style={{ background: 'var(--bg-main)', borderRadius: '12px', padding: '1rem', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ color: 'var(--accent-green)', fontSize: '0.9rem', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          📚 {nodeLabel}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          {chats.filter(c => c.role === 'user').map((chat, i) => (
                            <div key={i} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)' }}>
                                <User size={16} color="white" />
                              </div>
                              <div style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: 'var(--text-main)',
                                padding: '0.8rem 1rem',
                                borderRadius: '0 16px 16px 16px',
                                fontSize: '0.9rem',
                                lineHeight: 1.5,
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                wordBreak: 'break-word',
                                position: 'relative'
                              }}>
                                <div style={{ position: 'absolute', top: 0, left: '-6px', width: 0, height: 0, borderTop: '8px solid rgba(59, 130, 246, 0.2)', borderLeft: '8px solid transparent' }} />
                                {chat.content}
                              </div>
                            </div>
                          ))}
                          {chats.filter(c => c.role === 'user').length === 0 && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Tidak ada pertanyaan spesifik.</div>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'center' }}>
            <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <AlertTriangle size={32} />
            </div>
            <h2 className="modal-title" style={{ color: '#ef4444' }}>Reset Data Analitik?</h2>
            <p className="modal-subtitle" style={{ fontSize: '0.9rem', marginBottom: '2rem' }}>
              Tindakan ini akan <strong>menghapus semua progress murid</strong> (riwayat jawaban, skor, dan analitik) pada kelas ini. <br/><br/>
              Skill Tree dan Daftar Murid akan tetap aman. Tindakan ini <strong>tidak dapat diurungkan</strong>.
            </p>
            
            <button 
              onClick={handleResetAnalytics}
              disabled={resetCountdown > 0}
              style={{
                width: '100%',
                padding: '1rem',
                background: resetCountdown > 0 ? 'var(--bg-main)' : '#ef4444',
                color: resetCountdown > 0 ? 'var(--text-muted)' : 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: resetCountdown > 0 ? 'not-allowed' : 'pointer',
                marginBottom: '1rem',
                transition: 'all 0.2s'
              }}
            >
              {resetCountdown > 0 ? `Tunggu (${resetCountdown}s)...` : 'Ya, Reset Semua Data'}
            </button>
            <button 
              onClick={() => { setShowResetModal(false); setResetCountdown(5); }}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'transparent',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

