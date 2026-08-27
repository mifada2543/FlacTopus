import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { quizGet } from '../../utils/api';

// Komponen Tooltip Kustom agar tulisan panjang bisa terbaca dengan baik
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        padding: '1rem',
        borderRadius: '8px',
        color: '#fff',
        maxWidth: '250px'
      }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.4 }}>
          {payload[0].payload.name}
        </p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '1.1rem', color: payload[0].stroke, fontWeight: 700 }}>
          Rata-rata: {payload[0].value}
        </p>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
          Dari {payload[0].payload.attempts} pengerjaan
        </p>
      </div>
    );
  }
  return null;
};

export default function ScoreTrendChart({ isOpen, onClose, roomId, themeColor, roomData, isBlackTheme }) {
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

            // Beri label pendek (M1, M2, dst) untuk sumbu X agar tidak bertabrakan
            const formattedData = chartData.map((item, index) => ({
              ...item,
              shortName: `M${index + 1}`
            }));
            setData(formattedData);
          } else {
            setError(res.message || 'Gagal memuat tren nilai.');
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen, roomId, roomData]);

  if (!isOpen) return null;

  // Warna garis grafik
  const lineColor = isBlackTheme ? '#38bdf8' : (themeColor || '#10b981');
  const overlayColor = isBlackTheme ? 'rgba(0,0,0,0.8)' : 'rgba(15, 23, 42, 0.7)';
  const modalBg = isBlackTheme ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.95)';
  const textColor = isBlackTheme ? '#f8fafc' : '#0f172a';

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
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
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
        animation: 'slideUp 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: isBlackTheme ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: textColor, fontWeight: 700 }}>
              Tren Rata-Rata Nilai
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: isBlackTheme ? '#94a3b8' : '#64748b' }}>
              Perkembangan nilai kelas berdasarkan urutan materi
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
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = isBlackTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = textColor; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isBlackTheme ? '#94a3b8' : '#64748b'; }}
          >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content Modal */}
        <div style={{ 
          flex: 1,
          padding: '1.5rem', 
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: textColor }}>
              Memuat grafik...
            </div>
          ) : error ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#ef4444' }}>
              {error}
            </div>
          ) : data.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: isBlackTheme ? '#94a3b8' : '#64748b', textAlign: 'center' }}>
              Belum ada data kuis yang dikerjakan oleh murid.
            </div>
          ) : (
            <div style={{ width: '100%', height: isMaximized ? '100%' : '350px', flex: isMaximized ? 1 : 'none', overflowX: 'auto' }}>
              <div style={{ width: '100%', minWidth: '600px', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isBlackTheme ? 'rgba(255,255,255,0.1)' : '#e2e8f0'} vertical={false} />
                    <XAxis 
                      dataKey="shortName" 
                      stroke={isBlackTheme ? '#cbd5e1' : '#64748b'} 
                      tick={{ fill: isBlackTheme ? '#cbd5e1' : '#64748b', fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      stroke={isBlackTheme ? '#cbd5e1' : '#64748b'} 
                      tick={{ fill: isBlackTheme ? '#cbd5e1' : '#64748b', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                    />
                    <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: isBlackTheme ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', strokeWidth: 2 }} />
                    <Line 
                      type="monotone" 
                      dataKey="avg_score" 
                      stroke={lineColor} 
                      strokeWidth={4} 
                      dot={{ fill: modalBg, stroke: lineColor, strokeWidth: 3, r: 6 }} 
                      activeDot={{ r: 8, strokeWidth: 0, fill: lineColor }} 
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
