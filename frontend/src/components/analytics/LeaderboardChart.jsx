import React, { useEffect, useState, useMemo } from 'react';
import { X, Search, Trophy, Medal, Star, User, Maximize2, Minimize2 } from 'lucide-react';
import { quizGet } from '../../utils/api';

export default function LeaderboardChart({ isOpen, onClose, roomId, isBlackTheme }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [hoveredStudent, setHoveredStudent] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen && roomId) {
      setLoading(true);
      quizGet('analytics_leaderboard', { ruangan_id: roomId })
        .then(res => {
          if (res.success) {
            setData(res.leaderboard || []);
          } else {
            setError(res.message || 'Gagal memuat data leaderboard.');
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen, roomId]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [data, searchQuery]);

  if (!isOpen) return null;

  const overlayColor = isBlackTheme ? 'rgba(0,0,0,0.85)' : 'rgba(15, 23, 42, 0.75)';
  const modalBg = isBlackTheme ? '#0f172a' : '#f8fafc';
  const textColor = isBlackTheme ? '#f8fafc' : '#0f172a';
  const gridColor = isBlackTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // Top 3 for Podium
  const top3 = data.slice(0, 3);
  // We reorder Top 3 for Podium rendering: Rank 2, Rank 1, Rank 3
  const podiumOrder = [];
  if (top3[1]) podiumOrder.push({ ...top3[1], rank: 2 });
  if (top3[0]) podiumOrder.push({ ...top3[0], rank: 1 });
  if (top3[2]) podiumOrder.push({ ...top3[2], rank: 3 });

  // List for Rank 4+ (only if not searching, if searching show all matching)
  const listData = searchQuery ? filteredData.map((d) => {
    const originalIndex = data.findIndex(x => x.id === d.id);
    return { ...d, rank: originalIndex + 1 };
  }) : data.slice(3).map((d, i) => ({ ...d, rank: i + 4 }));

  const getRankColor = (rank) => {
    if (rank === 1) return '#fbbf24'; // Gold
    if (rank === 2) return '#94a3b8'; // Silver
    if (rank === 3) return '#b45309'; // Bronze
    return isBlackTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: overlayColor,
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: isMobile ? '0' : (isMaximized ? '2rem' : '1.5rem'),
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes podiumRise { from { transform: scaleY(0); transform-origin: bottom; } to { transform: scaleY(1); transform-origin: bottom; } }
          @keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${isBlackTheme ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; border-radius: 4px; }
        `}
      </style>
      
      <div style={{
        background: modalBg,
        borderRadius: isMobile ? '0' : (isMaximized ? '8px' : '16px'),
        width: '100%',
        maxWidth: isMaximized ? '1400px' : '1000px',
        height: isMobile || isMaximized ? '100%' : '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: isBlackTheme ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
        animation: 'slideUp 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? '1rem 0.8rem' : '1.25rem 1.5rem',
          borderBottom: `1px solid ${gridColor}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          background: isBlackTheme ? '#1e293b' : '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
              padding: isMobile ? '0.4rem' : '0.5rem', borderRadius: '10px', color: '#fff',
              boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)'
            }}>
              <Trophy size={isMobile ? 18 : 22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.25rem', color: textColor, fontWeight: 700 }}>
                Leaderboard
              </h2>
              {!isMobile && (
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: isBlackTheme ? '#94a3b8' : '#64748b' }}>
                  Peringkat berdasarkan nilai dan kuis yang dikerjakan
                </p>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
            {/* Search Bar */}
            <div style={{
              display: 'flex', alignItems: 'center',
              background: isBlackTheme ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
              borderRadius: '20px',
              padding: '0.4rem 0.8rem',
              border: `1px solid ${gridColor}`
            }}>
              <Search size={16} color={isBlackTheme ? '#94a3b8' : '#64748b'} style={{ marginRight: '0.5rem' }} />
              <input 
                type="text" 
                placeholder="Cari murid..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: textColor, fontSize: '0.9rem', width: isMobile ? '100px' : '150px'
                }}
              />
            </div>
            {!isMobile && (
              <button 
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? "Perkecil (Minimize)" : "Perbesar (Maximize)"}
                style={{
                  background: 'transparent', border: 'none',
                  color: isBlackTheme ? '#94a3b8' : '#64748b',
                  cursor: 'pointer', padding: '0.5rem', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = isBlackTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = textColor; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isBlackTheme ? '#94a3b8' : '#64748b'; }}
              >
                {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            )}
            <button 
              onClick={onClose}
              title="Tutup"
              style={{
                background: 'transparent', border: 'none',
                color: isBlackTheme ? '#94a3b8' : '#64748b',
                cursor: 'pointer', padding: '0.5rem', borderRadius: '8px',
                display: 'flex', alignItems: 'center', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isBlackTheme ? '#94a3b8' : '#64748b'; }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className={isMobile ? "custom-scrollbar" : ""} style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          overflowY: isMobile ? 'auto' : 'hidden',
          overflowX: 'hidden',
          background: isBlackTheme ? '#0f172a' : '#f8fafc'
        }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: textColor }}>
              Memuat data...
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ef4444' }}>
              {error}
            </div>
          ) : data.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: isBlackTheme ? '#94a3b8' : '#64748b' }}>
              Belum ada data kuis yang dikerjakan.
            </div>
          ) : (
            <>
              {/* Podium Section (Hide if searching to save space) */}
              {!searchQuery && podiumOrder.length > 0 && (
                <div style={{ 
                  flex: isMobile ? 'none' : '0 0 55%', 
                  padding: isMobile ? '8.5rem 0.5rem 2rem' : '4rem 2rem 2rem', // Increased top padding for tooltip room and bottom padding to push list down
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  gap: isMobile ? '0.5rem' : '1rem',
                  borderRight: isMobile ? 'none' : `1px solid ${gridColor}`,
                  borderBottom: isMobile ? `1px solid ${gridColor}` : 'none',
                  background: isBlackTheme 
                    ? (isMobile ? 'linear-gradient(to bottom, rgba(59,130,246,0.15) 0%, transparent 100%)' : 'radial-gradient(circle at top, rgba(59,130,246,0.1) 0%, transparent 60%)') 
                    : (isMobile ? 'linear-gradient(to bottom, rgba(59,130,246,0.1) 0%, transparent 100%)' : 'radial-gradient(circle at top, rgba(59,130,246,0.05) 0%, transparent 60%)'),
                  overflowX: isMobile ? 'visible' : 'visible',
                  width: '100%'
                }}>
                  {podiumOrder.map((student, idx) => {
                    const isRank1 = student.rank === 1;
                    const height = isMobile 
                      ? (isRank1 ? '200px' : student.rank === 2 ? '150px' : '120px') // Taller podiums to push the list down more
                      : (isRank1 ? '240px' : student.rank === 2 ? '180px' : '150px');
                    const delay = isRank1 ? '0.2s' : student.rank === 2 ? '0.4s' : '0.6s';
                    
                    return (
                      <div key={student.id} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        width: isMobile ? '32%' : '130px', 
                        maxWidth: '130px',
                        position: 'relative'
                      }}
                      onMouseEnter={() => setHoveredStudent(student.id)}
                      onMouseLeave={() => setHoveredStudent(null)}
                      onClick={() => setHoveredStudent(hoveredStudent === student.id ? null : student.id)}
                      >
                        {/* Custom Tooltip */}
                        {hoveredStudent === student.id && (
                          <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: isBlackTheme ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
                            border: `1px solid ${isBlackTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                            padding: '0.8rem',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                            zIndex: 50,
                            width: 'max-content',
                            textAlign: 'center',
                            marginBottom: '0.5rem',
                            animation: 'popIn 0.2s ease-out'
                          }}>
                            <div style={{ fontWeight: 700, color: textColor, marginBottom: '0.2rem' }}>{student.name}</div>
                            <div style={{ fontSize: '0.75rem', color: isBlackTheme ? '#94a3b8' : '#64748b', marginBottom: '0.5rem' }}>{student.email}</div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                              <div>
                                <div style={{ fontSize: '0.7rem', color: isBlackTheme ? '#94a3b8' : '#64748b' }}>Skor</div>
                                <div style={{ fontWeight: 700, color: getRankColor(student.rank) }}>{student.avg_score}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.7rem', color: isBlackTheme ? '#94a3b8' : '#64748b' }}>Kuis</div>
                                <div style={{ fontWeight: 700, color: '#3b82f6' }}>{student.quizzes_taken}x</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Avatar & Info */}
                        <div style={{
                          animation: `popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${delay} both`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          marginBottom: '1rem', position: 'relative'
                        }}>
                          {isRank1 && <Trophy size={isMobile ? 24 : 32} color="#fbbf24" style={{ position: 'absolute', top: isMobile ? '-25px' : '-35px', zIndex: 1 }} />}
                          <div style={{
                            width: isRank1 ? (isMobile ? '55px' : '75px') : (isMobile ? '45px' : '65px'), 
                            height: isRank1 ? (isMobile ? '55px' : '75px') : (isMobile ? '45px' : '65px'),
                            borderRadius: '50%',
                            background: getRankColor(student.rank),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `3px solid ${isBlackTheme ? '#1e293b' : '#fff'}`,
                            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                            color: '#fff', fontSize: '1.5rem', fontWeight: 700,
                            position: 'relative', zIndex: 0
                          }}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ 
                            marginTop: '0.8rem', fontWeight: 700, color: textColor, 
                            fontSize: isRank1 ? '1.1rem' : '0.95rem',
                            textAlign: 'center',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px'
                          }}>
                            {student.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                            <Star size={14} color="#fbbf24" fill="#fbbf24" />
                            <span style={{ fontWeight: 600, color: getRankColor(student.rank), fontSize: '1.1rem' }}>
                              {student.avg_score}
                            </span>
                          </div>
                        </div>

                        {/* Podium Block */}
                        <div style={{
                          width: '100%', height: height,
                          background: `linear-gradient(to bottom, ${getRankColor(student.rank)}, ${getRankColor(student.rank)}40)`,
                          borderRadius: '12px 12px 0 0',
                          display: 'flex', justifyContent: 'center', paddingTop: '1.5rem',
                          color: '#fff', fontSize: '3rem', fontWeight: 800, textShadow: '0 4px 10px rgba(0,0,0,0.2)',
                          animation: `podiumRise 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${delay} both`
                        }}>
                          {student.rank}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* List Section */}
              <div style={{ 
                flex: isMobile ? 'none' : 1, 
                display: 'flex', flexDirection: 'column',
                background: isBlackTheme ? '#1e293b' : '#fff',
                minHeight: isMobile ? '300px' : 'auto'
              }}>
                {/* Column Headers */}
                <div style={{ 
                  display: 'flex', alignItems: 'center', padding: '1rem 1.5rem',
                  borderBottom: `1px solid ${gridColor}`,
                  color: isBlackTheme ? '#94a3b8' : '#64748b',
                  fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase'
                }}>
                  <div style={{ width: '50px', textAlign: 'center' }}>Rank</div>
                  <div style={{ flex: 1 }}>Murid</div>
                  <div style={{ width: '80px', textAlign: 'center' }}>Kuis</div>
                  <div style={{ width: '80px', textAlign: 'center' }}>Skor</div>
                </div>

                <div className={isMobile ? "" : "custom-scrollbar"} style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', padding: '0.5rem 1rem' }}>
                  {listData.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isBlackTheme ? '#94a3b8' : '#64748b' }}>
                      Tidak ada murid yang cocok dengan pencarian.
                    </div>
                  ) : (
                    listData.map((student, idx) => (
                      <div key={student.id} style={{
                        display: 'flex', alignItems: 'center', padding: '0.8rem 0.5rem',
                        borderRadius: '12px',
                        marginBottom: '0.3rem',
                        background: isBlackTheme ? 'transparent' : 'transparent',
                        transition: 'background 0.2s',
                        animation: `fadeIn 0.3s ease-out ${(idx * 0.05)}s both`
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = isBlackTheme ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Rank */}
                        <div style={{ width: '50px', display: 'flex', justifyContent: 'center' }}>
                          {student.rank <= 3 ? (
                            <div style={{ 
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: getRankColor(student.rank), color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '0.9rem'
                            }}>
                              {student.rank}
                            </div>
                          ) : (
                            <span style={{ fontWeight: 600, color: isBlackTheme ? '#64748b' : '#94a3b8', fontSize: '1rem' }}>
                              #{student.rank}
                            </span>
                          )}
                        </div>
                        
                        {/* Name & Avatar */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.8rem', overflow: 'hidden' }}>
                          <div style={{ 
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: isBlackTheme ? '#334155' : '#e2e8f0',
                            color: isBlackTheme ? '#cbd5e1' : '#475569',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '1rem', flexShrink: 0
                          }}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: textColor, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {student.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: isBlackTheme ? '#94a3b8' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {student.email}
                            </div>
                          </div>
                        </div>

                        {/* Quizzes Taken */}
                        <div style={{ width: '80px', textAlign: 'center' }}>
                          <span style={{
                            background: isBlackTheme ? 'rgba(59,130,246,0.1)' : '#eff6ff',
                            color: '#3b82f6', padding: '0.2rem 0.6rem', borderRadius: '20px',
                            fontWeight: 600, fontSize: '0.85rem'
                          }}>
                            {student.quizzes_taken}x
                          </span>
                        </div>

                        {/* Avg Score */}
                        <div style={{ width: '80px', textAlign: 'center', fontWeight: 700, color: textColor, fontSize: '1.05rem' }}>
                          {student.avg_score}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
