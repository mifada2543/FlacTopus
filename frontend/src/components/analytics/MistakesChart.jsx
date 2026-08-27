import React, { useEffect, useState } from 'react';
import { X, Maximize2, Minimize2, AlertCircle, ChevronDown, MapPin, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { quizGet } from '../../utils/api';

export default function MistakesChart({ isOpen, onClose, roomId, isBlackTheme }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [expandedId, setExpandedId] = useState(0); // Add expanded state

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen && roomId) {
      setLoading(true);
      quizGet('analytics_mistakes', { ruangan_id: roomId })
        .then(res => {
          if (res.success) {
            setData(res.data || []);
            setError('');
          } else {
            setError(res.message || 'Gagal memuat data kesalahan');
          }
        })
        .catch(err => {
          setError('Terjadi kesalahan jaringan.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, roomId]);

  if (!isOpen) return null;

  const modalBg = isBlackTheme ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)';
  const textColor = isBlackTheme ? '#f8fafc' : '#0f172a';
  const gridColor = isBlackTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMaximized ? '0' : (isMobile ? '0' : '2rem'),
      animation: 'fadeIn 0.2s ease-out',
      transition: 'padding 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{
        background: modalBg,
        borderRadius: isMobile ? '0' : (isMaximized ? '8px' : '16px'),
        width: '100%',
        maxWidth: isMaximized ? '1400px' : '800px',
        height: isMobile || isMaximized ? '100%' : '90vh',
        maxHeight: isMaximized ? 'none' : '900px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: isBlackTheme ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
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
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', 
              padding: isMobile ? '0.4rem' : '0.5rem', borderRadius: '10px', color: '#fff',
              boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)'
            }}>
              <AlertCircle size={isMobile ? 18 : 22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.25rem', color: textColor, fontWeight: 700 }}>
                Soal Sering Salah
              </h2>
              {!isMobile && (
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: isBlackTheme ? '#94a3b8' : '#64748b' }}>
                  Analisis pertanyaan tersulit dan sebaran jawaban murid
                </p>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
            {!isMobile && (
              <button 
                onClick={() => setIsMaximized(!isMaximized)}
                style={{
                  background: 'transparent', border: 'none', color: isBlackTheme ? '#94a3b8' : '#64748b',
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
              style={{
                background: 'transparent', border: 'none', color: isBlackTheme ? '#94a3b8' : '#64748b',
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
        <div className="hide-scrollbar" style={{ 
          flex: 1, 
          overflowY: 'auto',
          background: isBlackTheme ? '#0f172a' : '#f8fafc',
          padding: isMobile ? '1rem' : '2rem'
        }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: textColor }}>
              Memuat data analitik...
            </div>
          ) : error ? (
            <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ef4444' }}>
              {error}
            </div>
          ) : data.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: isBlackTheme ? '#94a3b8' : '#64748b' }}>
              Hebat! Belum ada murid yang menjawab salah pada kuis apa pun.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px', margin: '0 auto' }}>
              {data.map((item, idx) => (
                <div 
                  key={idx}
                  style={{
                    background: isBlackTheme ? '#1e293b' : '#fff',
                    borderRadius: '12px',
                    border: `1px solid ${gridColor}`,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    overflow: 'hidden'
                  }}
                >
                  <div 
                    onClick={() => setExpandedId(expandedId === idx ? -1 : idx)}
                    style={{
                      padding: '1rem 1.5rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '50px'
                    }}>
                      #{idx + 1}
                    </div>
                    
                    <div style={{ flex: 1, paddingRight: '2rem' }}>
                      <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: textColor, lineHeight: 1.4 }}>
                        {item.question}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                        <AlertCircle size={14} />
                        {item.total_wrong} Murid Menjawab Salah
                      </div>
                    </div>
                    
                    <div style={{ 
                      position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)',
                      color: isBlackTheme ? '#94a3b8' : '#64748b'
                    }}>
                      <div style={{
                        transform: expandedId === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}>
                        <ChevronDown size={20} />
                      </div>
                    </div>
                  </div>

                  <div style={{
                    maxHeight: expandedId === idx ? '800px' : '0px',
                    opacity: expandedId === idx ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    <div style={{
                      padding: '1.5rem',
                      borderTop: `1px solid ${gridColor}`,
                      background: isBlackTheme ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: isBlackTheme ? '#94a3b8' : '#64748b', fontSize: '0.9rem' }}>
                        <MapPin size={16} color="#3b82f6" />
                        Lokasi Materi: <strong style={{ color: textColor }}>{item.node_label}</strong>
                      </div>

                      <div>
                        <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor, fontSize: '0.95rem' }}>
                          <BarChart2 size={18} color="#f59e0b" />
                          Distribusi Jawaban Murid
                        </h4>
                        
                        <div style={{ width: '100%', height: '220px', marginTop: '1rem' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={item.answers_breakdown.map(ans => ({
                              name: ans.answer.length > 15 && ans.answer !== 'Pilihan Ganda' ? ans.answer.substring(0, 15) + '...' : ans.answer,
                              fullText: ans.answer,
                              Murid: ans.count,
                              isCorrect: ans.isCorrect,
                              letter: ans.letter
                            }))} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                              <XAxis dataKey="name" tick={{fill: textColor, fontSize: 12, fontWeight: 'bold'}} />
                              <YAxis allowDecimals={false} tick={{fill: textColor, fontSize: 11}} />
                              <Tooltip 
                                isAnimationActive={false}
                                cursor={{fill: gridColor}}
                                contentStyle={{ background: isBlackTheme ? '#1e293b' : '#fff', border: `1px solid ${gridColor}`, borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', color: textColor }}
                                itemStyle={{ color: textColor, fontWeight: 'bold' }}
                                formatter={(value) => [value + ' Murid', 'Menjawab']}
                                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullText || label}
                              />
                              <Bar dataKey="Murid" radius={[4, 4, 0, 0]} maxBarSize={60} animationDuration={1000}>
                                {item.answers_breakdown.map((ans, index) => (
                                  <Cell key={`cell-${index}`} fill={ans.isCorrect ? '#22c55e' : '#ef4444'} />
                                ))}
                                <LabelList dataKey="letter" position="center" fill="#ffffff" fontSize={24} fontWeight="bold" />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
