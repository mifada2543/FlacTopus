import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Send, Loader, Bot, User, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { chatWithTeacherAssistant } from '../../utils/aiService';
import { quizGet } from '../../utils/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useRive } from '@rive-app/react-canvas';

const AiMascotReviewing = () => {
  const { rive, RiveComponent } = useRive({
    src: `${import.meta.env.BASE_URL}animojis.riv`,
    artboard: 'Animoji-Reviewing',
    stateMachines: 'State Machine 1',
    autoplay: true,
  });

  return (
    <div style={{ 
      width: '120px', 
      height: '120px',
      opacity: 0,
      animation: 'mascotPopIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
    }}>
      <RiveComponent />
    </div>
  );
};

export default function TeacherAIAssistantModal({ onClose, analyticsData, roomName, roomId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [trendData, setTrendData] = useState([]);
  const [partData, setPartData] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef(null);
  const storageKey = `ai_chat_history_${roomId}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Load chat history on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Gagal meload history:', e);
      }
    }
  }, [storageKey]);

  // Save chat history on update
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  const handleClearHistory = () => {
    if (window.confirm("Yakin ingin menghapus riwayat obrolan kelas ini?")) {
      localStorage.removeItem(storageKey);
      setMessages([]);
    }
  };

  useEffect(() => {
    // Fetch additional data for charts
    const fetchExtraData = async () => {
      try {
        const [trendRes, partRes] = await Promise.all([
          quizGet('analytics_trend', { ruangan_id: roomId }),
          quizGet('analytics_participation', { ruangan_id: roomId })
        ]);
        if (trendRes.success) setTrendData(trendRes.trend || []);
        if (partRes.success) setPartData(partRes);
        setIsDataLoaded(true);
      } catch (err) {
        console.error('Failed to fetch extra analytics', err);
        setIsDataLoaded(true); // Still proceed even if graphs fail
      }
    };
    if (roomId) fetchExtraData();
  }, [roomId]);

  const handleStartAnalysis = () => {
    const initialPrompt = "Tolong buatkan analisis awal kelas ini berdasarkan data yang ada. Sertakan: Rekap Data, grafik pendukung (gunakan tag grafiknya), tindakan yang harus diambil, dan konklusi singkat.";
    handleSend(initialPrompt, true);
  };

  // Format context for AI based on real analytics
  const buildContext = () => {
    if (!analyticsData) return "Data tidak tersedia.";
    
    // Fallback safely just in case properties are missing
    const summary = analyticsData.summary || {};
    const hardestNodes = analyticsData.hardest_nodes || [];
    const totalPart = partData ? ((partData.active_count || 0) + (partData.passive_count || 0)) : 0;
    
    // Build context string safely
    return `
    Nama Kelas: ${roomName}
    Rata-rata Kelas: ${summary.avg_score || 0}%
    Total Murid Aktif (Selesai Kuis): ${partData?.active_count || 0} dari ${totalPart} murid
    
    Top Materi Tersulit (Rata-rata Terendah):
    ${hardestNodes.slice(0,3).map((n, i) => `${i+1}. ${n.node_label} (Rata-rata: ${n.avg_score}%)`).join('\n')}
    
    Tren Nilai Rata-rata (Per Materi):
    ${trendData.map(d => `${d.name}: ${d.avg_score}%`).join(', ')}
    `;
  };

  const handleSend = async (text, isInitial = false) => {
    const userMessage = { role: 'user', content: text };
    const newMessages = isInitial ? [userMessage] : [...messages, userMessage];
    
    if (!isInitial) {
      setMessages(newMessages);
      setInput('');
    }
    
    setIsTyping(true);
    
    try {
      const aiResponse = await chatWithTeacherAssistant(newMessages, buildContext());
      setMessages([...newMessages, { role: 'model', content: aiResponse }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'model', content: `[ERROR] Wah maaf Bapak/Ibu Guru, sepertinya asisten sedang terlalu banyak diakses (server penuh). Tunggu sebentar lalu coba tanyakan lagi ya!` }]);
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const parseMessageContent = (content) => {
    if (content.startsWith('[ERROR]')) {
      return (
        <div style={{ color: '#ef4444', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <span>⚠️</span>
          <span>{content.replace('[ERROR]', '').trim()}</span>
        </div>
      );
    }
    
    // Pecah berdasarkan tag grafik
    const regex = /(\[GRAFIK_MATERI_TERSULIT\]|\[GRAFIK_TREN_NILAI\]|\[GRAFIK_PARTISIPASI\])/g;
    const parts = content.split(regex);
    
    return parts.map((part, index) => {
      if (part === '[GRAFIK_MATERI_TERSULIT]') {
        const data = (analyticsData?.hardest_nodes || []).slice(0, 5);
        if (!data.length) return <div key={index} style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>(Belum ada data materi tersulit)</div>;
        return (
          <div key={index} style={{ margin: '1rem 0', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent-green)' }}>Grafik Materi Tersulit (Rata-rata Terendah)</h4>
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis dataKey="node_label" type="category" width={100} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'var(--bg-card)', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                  <Bar dataKey="avg_score" fill="#ef4444" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }
      if (part === '[GRAFIK_TREN_NILAI]') {
        const data = trendData || [];
        if (!data.length) return <div key={index} style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>(Belum ada data tren nilai)</div>;
        return (
          <div key={index} style={{ margin: '1rem 0', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#3b82f6' }}>Grafik Tren Nilai Rata-rata</h4>
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                  <Line type="monotone" dataKey="avg_score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }
      if (part === '[GRAFIK_PARTISIPASI]') {
        if (!partData) return <div key={index} style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>(Belum ada data partisipasi)</div>;
        const total = (partData.active_count || 0) + (partData.passive_count || 0);
        const completed = partData.active_count || 0;
        if (total === 0) return <div key={index} style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>(Belum ada murid)</div>;
        
        const data = [
          { name: 'Selesai', value: completed, color: '#10b981' },
          { name: 'Belum Selesai', value: total - completed, color: 'rgba(255,255,255,0.1)' }
        ];
        return (
          <div key={index} style={{ margin: '1rem 0', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ height: '120px', width: '120px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={50} dataKey="value" stroke="none" isAnimationActive={false}>
                    {data.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  {/* Tooltip removed entirely for pie chart */}
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#a855f7' }}>Tingkat Partisipasi</h4>
              <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>{completed} / {total}</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Murid Aktif</p>
            </div>
          </div>
        );
      }
      
      // Parse markdown: **bold**, * list, ### heading
      const lines = part.split('\n');
      return (
        <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {lines.map((line, lineIndex) => {
            if (!line.trim()) return <br key={lineIndex} />;
            
            let isHeading = false;
            let isList = false;
            let textLine = line;

            if (textLine.startsWith('### ')) {
              isHeading = true;
              textLine = textLine.substring(4);
            } else if (textLine.startsWith('## ')) {
              isHeading = true;
              textLine = textLine.substring(3);
            } else if (textLine.trim().startsWith('* ') || textLine.trim().startsWith('- ')) {
              isList = true;
              textLine = textLine.trim().substring(2);
            }

            // Bold parsing
            const boldRegex = /\*\*(.*?)\*\*/g;
            const textParts = textLine.split(boldRegex);
            const renderedLine = textParts.map((t, i) => i % 2 === 1 ? <strong key={i}>{t}</strong> : <span key={i}>{t}</span>);

            if (isHeading) {
              return <h3 key={lineIndex} style={{ fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0', color: 'var(--accent-green)' }}>{renderedLine}</h3>;
            }
            if (isList) {
              return <li key={lineIndex} style={{ marginLeft: '1rem', marginBottom: '0.2rem' }}>{renderedLine}</li>;
            }
            return <p key={lineIndex} style={{ margin: 0 }}>{renderedLine}</p>;
          })}
        </div>
      );
    });
  };

  const modalStyle = isFullscreen 
    ? { width: '100%', height: '100%', maxWidth: 'none', borderRadius: 0 } 
    : { maxWidth: '800px', width: '95%', height: '85vh', borderRadius: '16px' };

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal-content" style={{ ...modalStyle, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', transition: 'all 0.3s ease' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-green), #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'white' }}>Asisten AI Guru</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Konsultan Akademik • {roomName}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {messages.length > 0 && (
              <button onClick={handleClearHistory} title="Hapus Riwayat" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Perkecil" : "Layar Penuh"} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button onClick={onClose} title="Tutup" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-main)' }}>
          {messages.length === 0 && !isTyping && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
              <AiMascotReviewing />
              <p style={{ maxWidth: '400px', margin: '0 auto' }}>Hai Bapak/Ibu! Saya Asisten AI Guru. Saya siap membantu menganalisis performa kelas dan memberikan saran strategis.</p>
              
              <button
                onClick={handleStartAnalysis}
                disabled={!isDataLoaded}
                style={{
                  background: 'var(--accent-green)',
                  color: '#000',
                  border: 'none',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '30px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: isDataLoaded ? 'pointer' : 'wait',
                  opacity: isDataLoaded ? 1 : 0.7,
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => { if(isDataLoaded) e.currentTarget.style.transform = 'scale(1.05)' }}
                onMouseOut={(e) => { if(isDataLoaded) e.currentTarget.style.transform = 'scale(1)' }}
              >
                {!isDataLoaded ? <Loader size={18} className="spin" /> : <Sparkles size={18} />}
                Mulai Analisis Kelas
              </button>
            </div>
          )}
          
          {messages.map((msg, i) => {
            if (i === 0 && msg.role === 'user') return null; // Hide internal prompt
            
            const isUser = msg.role === 'user';
            
            return (
              <div key={i} style={{ display: 'flex', gap: '1rem', flexDirection: isUser ? 'row-reverse' : 'row' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isUser ? 'white' : 'var(--accent-green)', flexShrink: 0 }}>
                  {isUser ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div style={{ 
                  background: isUser ? '#3b82f6' : 'var(--bg-card)', 
                  color: isUser ? 'white' : 'var(--text-main)', 
                  padding: '1rem', 
                  borderRadius: '16px', 
                  borderTopRightRadius: isUser ? '4px' : '16px',
                  borderTopLeftRadius: !isUser ? '4px' : '16px',
                  border: isUser ? 'none' : '1px solid var(--border-color)',
                  maxWidth: isFullscreen ? '75%' : '85%',
                  lineHeight: '1.6',
                  wordBreak: 'break-word'
                }}>
                  {parseMessageContent(msg.content)}
                </div>
              </div>
            );
          })}
          
          {isTyping && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)', flexShrink: 0 }}>
                <Bot size={18} />
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '16px', borderTopLeftRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <Loader size={18} className="spin" color="var(--accent-green)" />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Menganalisis data kelas...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <form 
            onSubmit={(e) => { e.preventDefault(); if (input.trim() && !isTyping) handleSend(input); }}
            style={{ display: 'flex', gap: '0.8rem' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya sesuatu tentang progres kelas..."
              disabled={isTyping}
              style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.8rem 1.2rem', borderRadius: '30px', outline: 'none' }}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isTyping}
              style={{ width: '45px', height: '45px', borderRadius: '50%', background: input.trim() && !isTyping ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)', border: 'none', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
            >
              <Send size={18} style={{ transform: 'translateX(2px)' }} />
            </button>
          </form>
        </div>
        
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes mascotPopIn {
          0% { transform: scale(0.5) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
