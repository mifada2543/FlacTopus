import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { quizGet, ruanganGet } from '../utils/api';
import { ROLE } from '../utils/roles';
import { BookOpen, Users, TrendingUp, AlertTriangle, Trophy, ArrowLeft, BarChart3, Target, RefreshCw, Sparkles } from 'lucide-react';
import ScoreTrendChart from '../components/analytics/ScoreTrendChart';
import MistakesChart from '../components/analytics/MistakesChart';
import HardestNodesChart from '../components/analytics/HardestNodesChart';
import ParticipationChart from '../components/analytics/ParticipationChart';
import LeaderboardChart from '../components/analytics/LeaderboardChart';
import SyllabusExplorerModal from '../components/analytics/SyllabusExplorerModal';
import TeacherAIAssistantModal from '../components/analytics/TeacherAIAssistantModal';
export default function ClassAnalytics() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user, loading, csrfToken } = useAuth();
  const [room, setRoom] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isHardestModalOpen, setIsHardestModalOpen] = useState(false);
  const [isMistakesModalOpen, setIsMistakesModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isExplorerModalOpen, setIsExplorerModalOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [cheatingData, setCheatingData] = useState(null);
  const [isCheatingLoading, setIsCheatingLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      // Fetch room info + analytics in parallel
      const [syllabusData, analyticsData, cheatingRes] = await Promise.all([
        ruanganGet('syllabus', { id: classId }),
        quizGet('analytics', { ruangan_id: classId }),
        quizGet('analytics_cheating', { ruangan_id: classId }).catch(() => null),
      ]);
      setRoom({
        nama: syllabusData.nama,
        theme_color: (syllabusData.theme_color || '#0f172a').replace('_nooutline', ''),
        nodes: syllabusData.nodes || [],
      });
      setAnalytics(analyticsData);
      setCheatingData(cheatingRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/login'); return; }
    // We let the backend reject with 403 if they don't have access (either not teacher and not ketua kelas)
    fetchData();
  }, [loading, user, navigate, fetchData]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Memuat data kelas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', gap: '1rem' }}>
        <p style={{ color: '#ef4444' }}>{error}</p>
        <button onClick={() => navigate('/classes')} style={styles.backBtn}>Kembali</button>
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const leaderboard = analytics?.leaderboard || [];
  const frequentWrong = analytics?.frequent_wrong || [];

  // Filter out pure ice_breaking nodes from hardest_nodes
  const isNodePureIceBreaking = (nodeId) => {
    const node = room?.nodes?.find(n => n.id === nodeId);
    if (!node || !node.data?.items) return false;
    const nonIceBreaking = node.data.items.filter(it => it.type !== 'ice_breaking');
    return node.data.items.length > 0 && nonIceBreaking.length === 0;
  };
  const hardest = (analytics?.hardest_nodes || []).filter(item => !isNodePureIceBreaking(item.node_id));

  // Hitung jumlah kuis individual dari seluruh tree (hanya yang memiliki soal)
  const totalQuizItems = (room?.nodes || []).reduce((sum, n) => sum + (n.data?.items?.filter(i => i.type === 'kuis' && i.quiz?.question?.trim())?.length || 0), 0);
  
  // Hitung jumlah node yang memiliki setidaknya 1 kuis dengan soal
  const totalNodesWithQuizzes = (room?.nodes || []).filter(n => n.data?.items?.some(i => i.type === 'kuis' && i.quiz?.question?.trim())).length;

  const getLuminance = (hex) => {
    if (!hex) return 1;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    if (c.length !== 6) return 1;
    const r = parseInt(c.substr(0, 2), 16);
    const g = parseInt(c.substr(2, 2), 16);
    const b = parseInt(c.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };

  const isBlackTheme = room?.theme_color && getLuminance(room.theme_color) < 0.25;
  const safeThemeColor = isBlackTheme ? '#f8fafc' : getSafeColor(room?.theme_color, 'var(--accent-green)');

  return (
    <div style={{
      ...styles.page, 
      background: 'transparent'
    }}>
      <div style={{
        ...styles.brilliant, 
        background: isBlackTheme
          ? `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.06) 0%, transparent 60%), linear-gradient(to bottom, rgba(255,255,255,0.02), transparent 500px)`
          : room?.theme_color 
            ? `radial-gradient(circle at 30% 20%, ${room.theme_color}15 0%, transparent 50%), linear-gradient(to bottom, ${room.theme_color}1a, transparent 500px)`
            : `radial-gradient(circle at 30% 20%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)`,
        opacity: 1
      }}></div>

      {/* Header */}
      <header style={styles.header}>
        <button onClick={() => navigate('/classes')} style={{ ...styles.backBtn, padding: isMobile ? '0.5rem' : '0.5rem 1rem' }}>
          <ArrowLeft size={18} /> {!isMobile && 'Kembali'}
        </button>
        <div style={{ flex: 1, minWidth: '120px' }}>
          <h1 style={{ ...styles.title, color: safeThemeColor }}>{room?.nama || 'Kelas'}</h1>
          <p style={styles.subtitle}>Dashboard Analisis Kelas</p>
        </div>
        <button 
          onClick={() => setIsAIAssistantOpen(true)} 
          style={{ 
            ...styles.refreshBtn, 
            color: '#000', 
            borderColor: 'var(--accent-green)', 
            background: 'var(--accent-green)',
            marginRight: '0.5rem'
          }}
          title="Tanya Asisten AI"
        >
          <Sparkles size={18} /> {!isMobile && 'Asisten AI'}
        </button>
        <button 
          onClick={fetchData} 
          style={{ 
            ...styles.refreshBtn, 
            color: isBlackTheme ? '#f8fafc' : safeThemeColor, 
            borderColor: isBlackTheme ? 'rgba(255,255,255,0.2)' : room?.theme_color ? `${room.theme_color}40` : 'rgba(16, 185, 129, 0.3)', 
            background: isBlackTheme ? 'rgba(255,255,255,0.05)' : room?.theme_color ? `${room.theme_color}15` : 'rgba(16, 185, 129, 0.1)' 
          }}
        >
          <RefreshCw size={16} /> {!isMobile && 'Refresh'}
        </button>
      </header>

      {/* CTA Manage & Editor */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', marginBottom: '2rem' }}>
        <div 
          onClick={() => navigate(`/room/${classId}`)}
          style={{ 
            ...styles.ctaCard, flex: 1, 
            background: isBlackTheme 
              ? `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))`
              : `linear-gradient(135deg, ${room?.theme_color || 'var(--accent-green)'}, ${room?.theme_color ? room.theme_color+'cc' : '#059669'})`,
            border: isBlackTheme ? '1px solid rgba(255,255,255,0.15)' : 'none',
            backdropFilter: isBlackTheme ? 'blur(10px)' : 'none'
          }}
        >
          <div style={{ ...styles.ctaIcon, background: isBlackTheme ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)' }}>
            <Users size={28} color="#fff" />
          </div>
          <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left' }}>
            <h2 style={{ ...styles.ctaTitle, color: '#fff' }}>Kelola Murid & Kehadiran</h2>
            <p style={{ ...styles.ctaDesc, color: 'rgba(255,255,255,0.8)' }}>Lihat status online dan atur anggota</p>
          </div>
          {!isMobile && <div style={{ ...styles.ctaArrow, color: '#fff' }}>&rarr;</div>}
        </div>
        
        <div 
          onClick={() => navigate(`/teacher/${classId}`)}
          style={{ 
            ...styles.ctaCard, flex: 1, 
            background: `linear-gradient(135deg, #1e293b, #0f172a)`, 
            border: isBlackTheme ? '1px solid rgba(255,255,255,0.15)' : `1px solid ${room?.theme_color || 'var(--accent-green)'}50`,
            boxShadow: isBlackTheme ? 'inset 0 0 20px rgba(255,255,255,0.02)' : 'none'
          }}
        >
          <div style={{ ...styles.ctaIcon, background: isBlackTheme ? 'rgba(255,255,255,0.1)' : `${room?.theme_color || 'var(--accent-green)'}20` }}>
            <BookOpen size={28} color={safeThemeColor} />
          </div>
          <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left' }}>
            <h2 style={{ ...styles.ctaTitle, color: safeThemeColor }}>Editor Skill Tree</h2>
            <p style={{ ...styles.ctaDesc, color: 'var(--text-muted)' }}>Edit materi dan struktur belajar</p>
          </div>
          {!isMobile && <div style={{ ...styles.ctaArrow, color: safeThemeColor }}>&rarr;</div>}
        </div>
      </div>

      {/* Top Summary */}
      <div style={styles.cardGrid}>
        <SummaryCard 
          icon={<Users size={24} color={isBlackTheme ? '#f8fafc' : (safeThemeColor !== 'var(--accent-green)' ? safeThemeColor : "#3b82f6")} />} 
          label="Total Murid" 
          value={summary.total_members || 0} 
          sub={`${summary.total_students_attempted || 0} sudah mengerjakan kuis`} 
          valueColor={isBlackTheme ? '#f8fafc' : (safeThemeColor !== 'var(--accent-green)' ? safeThemeColor : "#3b82f6")}
          onClick={() => setIsPartModalOpen(true)}
        />
        <SummaryCard 
          icon={<BarChart3 size={24} color={isBlackTheme ? '#cbd5e1' : "#10b981"} />} 
          label="Rata-rata Nilai" 
          value={summary.avg_score !== null ? summary.avg_score : '-'} 
          sub={`dari ${summary.total_quizzes_taken || 0} pengerjaan`}
          valueColor={isBlackTheme ? '#cbd5e1' : "#10b981"}
          onClick={() => setIsScoreModalOpen(true)}
        />
        <SummaryCard 
          icon={<Target size={24} color={isBlackTheme ? '#e2e8f0' : "#f59e0b"} />} 
          label="Kuis Tersedia" 
          value={totalQuizItems} 
          sub={`dari ${totalNodesWithQuizzes} node materi`}
          valueColor={isBlackTheme ? '#e2e8f0' : "#f59e0b"}
          onClick={() => setIsExplorerModalOpen(true)}
        />
        <SummaryCard 
          icon={<TrendingUp size={24} color={isBlackTheme ? '#94a3b8' : "#8b5cf6"} />} 
          label="Tingkat Partisipasi" 
          value={summary.total_members > 0 ? `${Math.round((summary.total_students_attempted / summary.total_members) * 100)}%` : '0%'} 
          sub="murid aktif mengerjakan kuis"
          valueColor={isBlackTheme ? '#94a3b8' : "#8b5cf6"}
          onClick={() => setIsPartModalOpen(true)}
        />
      </div>

      {/* Two Column Layout */}
      <div style={{ ...styles.twoCol, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>

        {/* Left: Leaderboard */}
        <div 
          onClick={() => setIsLeaderboardOpen(true)}
          style={{
            ...styles.section,
            borderColor: isBlackTheme ? 'rgba(255,255,255,0.1)' : room?.theme_color ? `${room.theme_color}30` : 'var(--border-color)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.borderColor = 'var(--accent-green)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = isBlackTheme ? 'rgba(255,255,255,0.1)' : (room?.theme_color ? `${room.theme_color}30` : 'var(--border-color)'); }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
              <Trophy size={20} color={isBlackTheme ? '#f8fafc' : (safeThemeColor !== 'var(--accent-green)' ? safeThemeColor : "#f59e0b")} /> Leaderboard
            </h3>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Lihat detail &rarr;</span>
          </div>
          {leaderboard.length === 0 ? (
            <EmptyState text="Belum ada data nilai murid." />
          ) : (
            <div style={styles.leaderList}>
              {leaderboard.map((student, i) => (
                <div key={i} style={styles.leaderItem}>
                  <div style={{ 
                    ...styles.rank, 
                    background: i === 0 ? (isBlackTheme ? 'linear-gradient(135deg, #f1f5f9, #94a3b8)' : (room?.theme_color || '#f59e0b')) : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'rgba(255,255,255,0.1)', 
                    color: i === 0 ? (isBlackTheme ? '#000' : (safeThemeColor !== room?.theme_color ? '#fff' : '#000')) : (i < 3 ? '#000' : 'var(--text-muted)')
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={styles.leaderName}>{student.name}</p>
                    <p style={styles.leaderSub}>Selesai {student.quizzes_done} kuis</p>
                  </div>
                  <div style={styles.scoreBadge}>
                    <span style={{ ...styles.scoreValue, color: getScoreColor(student.avg_score) }}>{student.avg_score}</span>
                    <span style={styles.scoreLabel}>Rata-rata</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Hardest Nodes + Frequent Wrong */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Hardest Materials */}
          <div 
            onClick={() => setIsHardestModalOpen(true)}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.borderColor = 'var(--accent-green)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = isBlackTheme ? 'rgba(255,255,255,0.1)' : (room?.theme_color ? `${room.theme_color}30` : 'var(--border-color)'); }}
            style={{
              ...styles.section, 
              borderColor: isBlackTheme ? 'rgba(255,255,255,0.1)' : room?.theme_color ? `${room.theme_color}30` : 'var(--border-color)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              transform: 'scale(1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                <TrendingUp size={20} color="#ef4444" style={{transform: 'scaleY(-1)'}} /> Materi Tersulit
              </h3>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Lihat detail &rarr;</span>
            </div>
            {hardest.length === 0 ? <EmptyState text="Belum ada data materi." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {hardest.slice(0, 3).map((node, i) => (
                  <div key={i} style={styles.hardestItem}>
                    <div style={{ width: '40px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>
                      #{i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>{node.node_label}</span>
                        <span style={{ color: getScoreColor(node.avg_score), fontWeight: 'bold' }}>{node.avg_score}</span>
                      </div>
                      <div style={styles.progressBarBg}>
                        <div style={{ ...styles.progressBarFill, width: `${node.avg_score}%`, background: getScoreColor(node.avg_score) }}></div>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                        Rata-rata nilai murid: <strong style={{color:'var(--text-main)'}}>{node.avg_score}</strong>
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                        (Berdasarkan {node.attempts} murid yang telah menyelesaikan)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Frequent Wrong Questions */}
          <div 
            onClick={() => setIsMistakesModalOpen(true)}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.borderColor = '#f59e0b'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = isBlackTheme ? 'rgba(255,255,255,0.1)' : (room?.theme_color ? `${room.theme_color}30` : 'var(--border-color)'); }}
            style={{
              ...styles.section, 
              borderColor: isBlackTheme ? 'rgba(255,255,255,0.1)' : room?.theme_color ? `${room.theme_color}30` : 'var(--border-color)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              transform: 'scale(1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                <AlertTriangle size={20} color="#f59e0b" /> Soal Sering Salah
              </h3>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Lihat detail &rarr;</span>
            </div>
            {frequentWrong.length === 0 ? <EmptyState text="Belum ada data soal salah." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {frequentWrong.slice(0, 3).map((item, i) => (
                  <div key={i} style={styles.hardestItem}>
                    <div style={{ width: '40px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>
                      #{i + 1}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem', gap: '1rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {item.question}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}>
                        <AlertTriangle size={14} />
                        {item.wrong_count} Murid Menjawab Salah
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cheating Detection (Tab Switch) */}
          <div style={{
            ...styles.section,
            borderColor: isBlackTheme ? 'rgba(255,255,255,0.1)' : room?.theme_color ? `${room.theme_color}30` : 'var(--border-color)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                <AlertTriangle size={20} color="#ef4444" /> Deteksi Pindah Tab
              </h3>
              {(cheatingData?.cheaters?.length || 0) > 0 && (
                <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 600 }}>
                  {cheatingData.cheaters.length} Murid
                </span>
              )}
            </div>
            {!cheatingData || cheatingData.cheaters?.length === 0 ? (
              <EmptyState text="Tidak ada deteksi pindah tab." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cheatingData.cheaters.slice(0, 5).map((c, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.8rem 1rem',
                    background: 'rgba(239, 68, 68, 0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                  }}>
                    <div style={{ width: '40px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>
                      ⚠️
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {c.name}
                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>{c.email}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                        <span>Pindah tab: <strong style={{ color: '#ef4444' }}>{c.total_switches}x</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ScoreTrendChart 
        isOpen={isScoreModalOpen} 
        onClose={() => setIsScoreModalOpen(false)} 
        roomId={classId} 
        themeColor={safeThemeColor}
        roomData={room}
        isBlackTheme={isBlackTheme} 
      />

      <HardestNodesChart
        isOpen={isHardestModalOpen}
        onClose={() => setIsHardestModalOpen(false)}
        roomId={classId}
        roomData={room}
        isBlackTheme={isBlackTheme}
      />

      <MistakesChart
        isOpen={isMistakesModalOpen}
        onClose={() => setIsMistakesModalOpen(false)}
        roomId={classId}
        isBlackTheme={isBlackTheme}
      />

      <ParticipationChart
        isOpen={isPartModalOpen}
        onClose={() => setIsPartModalOpen(false)}
        roomId={classId}
        isBlackTheme={isBlackTheme}
      />

      <LeaderboardChart
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        roomId={classId}
        isBlackTheme={isBlackTheme}
      />
      <SyllabusExplorerModal
        isOpen={isExplorerModalOpen}
        onClose={() => setIsExplorerModalOpen(false)}
        nodes={room?.nodes || []}
        isBlackTheme={isBlackTheme}
        onNavigateToBuilder={(nodeId) => navigate(`/teacher/${classId}?nodeId=${nodeId}`)}
      />

      {isAIAssistantOpen && (
        <TeacherAIAssistantModal
          onClose={() => setIsAIAssistantOpen(false)}
          analyticsData={{...analytics, hardest_nodes: hardest}}
          roomName={room?.nama}
          roomId={classId}
        />
      )}
    </div>
  );
}

// === Sub-components ===

function SummaryCard({ icon, label, value, sub, valueColor, onClick }) {
  return (
    <div 
      style={{
        ...styles.summaryCard, 
        cursor: onClick ? 'pointer' : 'default',
        transform: 'scale(1)',
        transition: 'all 0.2s',
      }}
      onClick={onClick}
      onMouseOver={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.borderColor = valueColor || 'var(--accent-green)';
        }
      }}
      onMouseOut={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.borderColor = 'var(--border-color)';
        }
      }}
    >
      <div style={styles.summaryIcon}>{icon}</div>
      <p style={styles.summaryLabel}>{label}</p>
      <p style={{ ...styles.summaryValue, color: valueColor || 'var(--text-main)' }}>{value}</p>
      <p style={styles.summarySub}>{sub}</p>
      {onClick && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
          Lihat selengkapnya &rarr;
        </p>
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
      {text}
    </div>
  );
}

function getScoreColor(score) {
  if (!score && score !== 0) return 'var(--text-muted)';
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function getSafeColor(hex, fallback = 'var(--accent-green)') {
  if (!hex) return fallback;
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.25 ? '#f8fafc' : hex;
}

// === Styles ===

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-dark)',
    color: 'var(--text-main)',
    padding: '1.5rem 2rem 3rem',
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative',
  },
  brilliant: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'radial-gradient(circle at 30% 20%, rgba(16, 185, 129, 0.04) 0%, transparent 50%)',
    zIndex: -1,
    pointerEvents: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '2rem',
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  refreshBtn: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: 'var(--accent-green)',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--accent-green)',
    lineHeight: 1.2,
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    marginTop: '0.3rem',
  },

  // CTA Card
  ctaCard: {
    background: 'linear-gradient(135deg, var(--accent-green), #059669)',
    padding: '1.5rem 2rem',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginBottom: '2rem',
  },
  ctaIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ctaTitle: {
    color: '#000',
    fontSize: '1.15rem',
    fontWeight: 700,
  },
  ctaDesc: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: '0.85rem',
    marginTop: '0.2rem',
  },
  ctaArrow: {
    fontSize: '1.5rem',
    color: '#000',
    marginLeft: 'auto',
    fontWeight: 700,
  },

  // Summary Cards
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  summaryCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '1.25rem 1.5rem',
    transition: 'border-color 0.2s',
  },
  summaryIcon: {
    marginBottom: '0.6rem',
  },
  summaryLabel: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
  summaryValue: {
    fontSize: '2rem',
    fontWeight: 800,
    lineHeight: 1.1,
    margin: '0.3rem 0',
  },
  summarySub: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
  },

  // Two Column
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
  },

  // Sections
  section: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    padding: '1.5rem',
    overflowX: 'auto',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
    fontWeight: 700,
    marginBottom: '1rem',
    color: 'var(--text-main)',
  },

  // Leaderboard
  leaderList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  leaderItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '10px',
    flexWrap: 'wrap',
  },
  rank: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '0.8rem',
    flexShrink: 0,
  },
  leaderName: {
    fontWeight: 600,
    fontSize: '0.95rem',
    color: 'var(--text-main)',
  },
  leaderSub: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  scoreBadge: {
    textAlign: 'right',
    flexShrink: 0,
  },
  scoreValue: {
    fontSize: '1.2rem',
    fontWeight: 800,
  },
  scoreLabel: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    display: 'block',
  },
  progressBarBg: {
    width: '100%',
    height: '4px',
    background: 'var(--border-color)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.6s ease',
  },

  // Hardest
  hardestItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    background: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: '10px',
  },

  // Wrong questions
  wrongItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6rem',
    padding: '0.6rem',
    background: 'rgba(245, 158, 11, 0.05)',
    border: '1px solid rgba(245, 158, 11, 0.15)',
    borderRadius: '8px',
  },
  wrongCount: {
    background: 'rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    fontWeight: 800,
    fontSize: '0.8rem',
    padding: '0.15rem 0.5rem',
    borderRadius: '6px',
    flexShrink: 0,
  },
};

