import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { quizGet } from '../../utils/api';

// Tooltip khusus untuk menampilkan nama materi panjang dan detail nilai
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        padding: '1rem',
        borderRadius: '8px',
        color: '#fff',
        maxWidth: '280px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
      }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.4, color: '#f8fafc' }}>
          {data.name}
        </p>
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Rata-rata:</span>
          <span style={{ fontSize: '1.2rem', color: payload[0].fill, fontWeight: 800 }}>
            {data.avg_score}
          </span>
        </div>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
          Diselesaikan oleh {data.attempts} murid
        </p>
      </div>
    );
  }
  return null;
};

// Fungsi penentuan warna berdasarkan skor
const getBarColor = (score) => {
  if (score < 60) return '#ef4444'; // Merah (Susah banget / banyak remedial)
  if (score < 80) return '#f59e0b'; // Kuning (Lumayan / perlu perhatian)
  return '#10b981'; // Hijau (Gampang / aman)
};

export default function HardestNodesChart({ isOpen, onClose, roomId, roomData, isBlackTheme }) {
  const [data, setData] = useState([]);
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
      // Kita reuse API yang sama dengan Tren Nilai!
      quizGet('analytics_trend', { ruangan_id: roomId })
        .then(res => {
          if (res.success) {
            let chartData = res.trend;
            // Filter ice breaking
            if (roomData && roomData.nodes) {
              const isNodePureIceBreaking = (nodeId) => {
                const node = roomData.nodes.find(n => n.id === nodeId);
                if (!node || !node.data?.items) return false;
                const nonIceBreaking = node.data.items.filter(it => it.type !== 'ice_breaking');
                return node.data.items.length > 0 && nonIceBreaking.length === 0;
              };
              chartData = chartData.filter(item => !isNodePureIceBreaking(item.node_id));
            }
            // Sort data dari nilai terendah (paling sulit) ke tertinggi
            const sortedData = [...chartData].sort((a, b) => a.avg_score - b.avg_score);
            setData(sortedData);
          } else {
            setError(res.message || 'Gagal memuat data materi tersulit.');
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen, roomId, roomData]);

  if (!isOpen) return null;

  const overlayColor = isBlackTheme ? 'rgba(0,0,0,0.85)' : 'rgba(15, 23, 42, 0.75)';
  const modalBg = isBlackTheme ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.98)';
  const textColor = isBlackTheme ? '#f8fafc' : '#0f172a';
  const gridColor = isBlackTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // Perhitungan tinggi dinamis agar bisa di-scroll jika datanya banyak
  // Tiap bar butuh sekitar 45px tinggi supaya gak dempet
  const minChartHeight = Math.max(350, data.length * 45);

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
          
          /* Custom Scrollbar untuk grafik */
          .chart-scroll-container::-webkit-scrollbar {
            width: 8px;
          }
          .chart-scroll-container::-webkit-scrollbar-track {
            background: transparent;
          }
          .chart-scroll-container::-webkit-scrollbar-thumb {
            background-color: ${isBlackTheme ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};
            border-radius: 4px;
          }
        `}
      </style>
      
      <div style={{
        background: modalBg,
        borderRadius: isMaximized && !isMobile ? '8px' : '16px',
        width: '100%',
        maxWidth: isMaximized ? '1400px' : '900px',
        height: isMaximized ? '100%' : 'auto',
        maxHeight: isMaximized ? '100%' : '85vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: isBlackTheme ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
        animation: 'scaleUp 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: gridColor,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: textColor, fontWeight: 700 }}>
              Analisis Materi Tersulit
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: isBlackTheme ? '#94a3b8' : '#64748b' }}>
              Perbandingan tingkat kesulitan seluruh materi di kelas
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

        {/* Content Modal (Scrollable Area) */}
        <div 
          className="chart-scroll-container"
          style={{ 
            flex: 1, 
            padding: '1.5rem',
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {loading ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: textColor }}>
              Memuat data...
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: '#ef4444' }}>
              {error}
            </div>
          ) : data.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: isBlackTheme ? '#94a3b8' : '#64748b', textAlign: 'center' }}>
              Belum ada data kuis yang dikerjakan oleh murid.
            </div>
          ) : (
            <div style={{ width: '100%', height: minChartHeight, minHeight: isMaximized ? '100%' : 'auto' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: isMobile ? 0 : 30, bottom: 20 }}
                  barSize={24}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={true} vertical={true} />
                  
                  {/* Sumbu X: Nilai (0 - 100) */}
                  <XAxis 
                    type="number"
                    domain={[0, 100]} 
                    stroke={isBlackTheme ? '#cbd5e1' : '#64748b'} 
                    tick={{ fill: isBlackTheme ? '#cbd5e1' : '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                  />
                  
                  {/* Sumbu Y: Nama Materi */}
                  <YAxis 
                    dataKey="name" 
                    type="category"
                    width={isMobile ? 90 : 200}
                    stroke={isBlackTheme ? '#cbd5e1' : '#64748b'} 
                    tick={{ fill: isBlackTheme ? '#cbd5e1' : '#64748b', fontSize: isMobile ? 10 : 13 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => {
                      const maxLen = isMobile ? 12 : 30;
                      return val.length > maxLen ? val.substring(0, maxLen) + '...' : val;
                    }}
                  />
                  
                  <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ fill: isBlackTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }} />
                  
                  <Bar dataKey="avg_score" animationDuration={1200} radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.avg_score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        {/* Footer info (legend) */}
        {!loading && !error && data.length > 0 && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: `1px solid ${gridColor}`,
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            background: isBlackTheme ? 'rgba(0,0,0,0.2)' : 'rgba(248, 250, 252, 0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: isBlackTheme ? '#cbd5e1' : '#64748b' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444' }}></div> Sulit (&lt; 60)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: isBlackTheme ? '#cbd5e1' : '#64748b' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b' }}></div> Sedang (60 - 79)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: isBlackTheme ? '#cbd5e1' : '#64748b' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }}></div> Mudah (&ge; 80)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
