import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { X, UserX, UserCheck, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { quizGet } from '../../utils/api';

const COLORS = ['#3b82f6', '#ef4444']; // Biru untuk Aktif, Merah untuk Pasif

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        padding: '0.8rem 1rem',
        borderRadius: '8px',
        color: '#fff',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
      }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{data.name}</p>
        <p style={{ margin: '0.2rem 0 0', fontSize: '1.2rem', color: payload[0].fill, fontWeight: 700 }}>
          {data.value} Murid
        </p>
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, value }) => {
  if (value === 0) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontWeight={700} fontSize="16">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function ParticipationChart({ isOpen, onClose, roomId, isBlackTheme }) {
  const [data, setData] = useState([]);
  const [passiveList, setPassiveList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen && roomId) {
      setLoading(true);
      quizGet('analytics_participation', { ruangan_id: roomId })
        .then(res => {
          if (res.success) {
            setData([
              { name: 'Aktif (Mengerjakan Kuis)', value: res.active_count },
              { name: 'Pasif (Belum Ngerjain)', value: res.passive_count }
            ]);
            setPassiveList(res.passive_students || []);
          } else {
            setError(res.message || 'Gagal memuat data partisipasi.');
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen, roomId]);

  if (!isOpen) return null;

  const overlayColor = isBlackTheme ? 'rgba(0,0,0,0.85)' : 'rgba(15, 23, 42, 0.75)';
  const modalBg = isBlackTheme ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.98)';
  const textColor = isBlackTheme ? '#f8fafc' : '#0f172a';
  const gridColor = isBlackTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

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
      padding: isMobile ? '1rem' : (isMaximized ? '2rem' : '1rem'),
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <style>
        {`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
          
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${isBlackTheme ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; border-radius: 4px; }
        `}
      </style>
      
      <div style={{
        background: modalBg,
        borderRadius: isMaximized && !isMobile ? '8px' : '16px',
        width: '100%',
        maxWidth: isMaximized ? '1400px' : '900px',
        height: isMaximized ? '100%' : 'auto',
        maxHeight: isMaximized ? '100%' : '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: isBlackTheme ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
        animation: 'scaleUp 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: `1px solid ${gridColor}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: textColor, fontWeight: 700 }}>
              Partisipasi
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: isBlackTheme ? '#94a3b8' : '#64748b' }}>
              Rasio murid aktif vs pasif beserta daftar murid yang belum aktif
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!isMobile && (
              <button 
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? "Perkecil (Minimize)" : "Perbesar (Maximize)"}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isBlackTheme ? '#94a3b8' : '#64748b',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s'
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
              background: 'transparent',
              border: 'none',
              color: isBlackTheme ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isBlackTheme ? '#94a3b8' : '#64748b'; }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: textColor }}>
              Memuat data...
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: '#ef4444' }}>
              {error}
            </div>
          ) : (
            <>
              {/* Kiri: Donut Chart */}
              <div style={{ 
                flex: 1, 
                padding: '1.5rem',
                borderRight: isMobile ? 'none' : `1px solid ${gridColor}`,
                borderBottom: isMobile ? `1px solid ${gridColor}` : 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ width: '100%', height: isMobile ? '250px' : '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 60 : 80}
                        outerRadius={isMobile ? 100 : 130}
                        paddingAngle={4}
                        cornerRadius={6}
                        dataKey="value"
                        animationDuration={1500}
                        labelLine={false}
                        label={renderCustomizedLabel}
                        stroke="none"
                      >
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '0.85rem', color: textColor }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Info Box */}
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: isBlackTheme ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                  border: `1px solid ${isBlackTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`,
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#3b82f6', marginBottom: '0.3rem' }}>
                      <UserCheck size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Aktif</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: textColor }}>{data[0]?.value || 0}</div>
                  </div>
                  <div style={{ width: '1px', background: gridColor }}></div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#ef4444', marginBottom: '0.3rem' }}>
                      <UserX size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Pasif</span>
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: textColor }}>{data[1]?.value || 0}</div>
                  </div>
                </div>
              </div>

              {/* Kanan: Wall of Shame */}
              <div style={{ 
                flex: 1, 
                display: 'flex',
                flexDirection: 'column',
                background: isBlackTheme ? 'rgba(0,0,0,0.2)' : 'rgba(248, 250, 252, 0.5)'
              }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${gridColor}`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} color="#ef4444" />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: textColor, fontWeight: 600 }}>Daftar Murid Pasif</h3>
                </div>
                
                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
                  {passiveList.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: isBlackTheme ? '#94a3b8' : '#64748b', textAlign: 'center' }}>
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                        <UserCheck size={32} />
                      </div>
                      <p style={{ margin: 0, fontWeight: 600 }}>Luar Biasa!</p>
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>Semua murid di kelas ini sudah berpartisipasi mengerjakan kuis.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {passiveList.map((student, idx) => (
                        <div key={idx} style={{
                          background: isBlackTheme ? 'rgba(30, 41, 59, 0.5)' : '#fff',
                          border: `1px solid ${gridColor}`,
                          padding: '1rem',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem'
                        }}>
                          <div style={{ 
                            width: 40, height: 40, 
                            borderRadius: '50%', 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            color: '#ef4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '1.2rem',
                            flexShrink: 0
                          }}>
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: textColor, fontSize: '0.95rem' }}>{student.name}</div>
                            <div style={{ fontSize: '0.8rem', color: isBlackTheme ? '#94a3b8' : '#64748b', marginTop: '0.2rem' }}>{student.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
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
