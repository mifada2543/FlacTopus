import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Send, Loader, Bot, User, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { chatWithStudentAssistant } from '../utils/aiService';
import { useRive } from '@rive-app/react-canvas';
import { QUIZ_API, RUANGAN_API } from '../utils/api';

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

export default function StudentAIAssistantModal({ onClose, currentItem, quizState, studentName, ruanganId, csrfToken }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef(null);

  const isMateri = currentItem?.type === 'materi';
  // Context ID could be based on the question/material so history resets per question
  const storageKey = `ai_chat_student_${currentItem?.title || 'quiz'}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

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

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  const handleClearHistory = () => {
    if (window.confirm("Yakin ingin menghapus riwayat obrolan ini?")) {
      localStorage.removeItem(storageKey);
      setMessages([]);
    }
  };

  const buildContext = () => {
    const ctx = {
      tipe: isMateri ? 'Materi Pembelajaran' : 'Kuis',
      topik: currentItem?.title || '',
      konten: currentItem?.content || currentItem?.quiz?.question || '',
      status: isMateri ? 'Sedang Membaca' : quizState,
      jawaban_benar: currentItem?.quiz?.answer || currentItem?.quiz?.options?.find(o => o.isCorrect)?.text || '',
    };
    return JSON.stringify(ctx);
  };

  const handleSend = async (text) => {
    if (!text.trim()) return;
    
    const userMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);
    
    try {
      const aiResponse = await chatWithStudentAssistant(newMessages, buildContext(), studentName, csrfToken);
      const finalMessages = [...newMessages, { role: 'model', content: aiResponse }];
      setMessages(finalMessages);
      // Simpan chat ke backend
      if (ruanganId) {
        fetch(QUIZ_API, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify({
            action: 'save_chat',
            ruangan_id: ruanganId,
            node_id: currentItem?.id || '',
            node_label: currentItem?.title || '',
            messages: finalMessages,
          }),
        }).catch(() => {}); // fire-and-forget
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'model', content: `[ERROR] Wah, asisten sedang sibuk. Coba lagi sebentar ya!` }]);
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
    
    const parts = content.split('```');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {parts.map((part, index) => {
          if (index % 2 === 1) {
            const firstNewline = part.indexOf('\n');
            const code = firstNewline > -1 ? part.substring(firstNewline + 1) : part;
            return (
              <pre key={index} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <code style={{ fontFamily: 'monospace', color: '#eab308' }}>{code}</code>
              </pre>
            );
          } else {
            const lines = part.split('\n');
            return lines.map((line, lineIndex) => {
              if (!line.trim()) return <br key={`${index}-${lineIndex}`} />;
              
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

              const boldRegex = /\*\*(.*?)\*\*/g;
              const textParts = textLine.split(boldRegex);
              const renderedLine = textParts.map((t, i) => i % 2 === 1 ? <strong key={i}>{t}</strong> : <span key={i}>{t}</span>);

              if (isHeading) {
                return <h3 key={`${index}-${lineIndex}`} style={{ fontSize: '1rem', marginTop: '0.5rem', marginBottom: '0', color: 'var(--accent-green)' }}>{renderedLine}</h3>;
              }
              if (isList) {
                return <li key={`${index}-${lineIndex}`} style={{ marginLeft: '1rem', marginBottom: '0.2rem' }}>{renderedLine}</li>;
              }
              return <p key={`${index}-${lineIndex}`} style={{ margin: 0 }}>{renderedLine}</p>;
            });
          }
        })}
      </div>
    );
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
              <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'white' }}>Asisten Belajar AI</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Topik: {currentItem?.title || 'Kuis'}</p>
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
              <p style={{ maxWidth: '400px', margin: '0 auto' }}>Hai {studentName}! Ada materi atau soal yang bikin bingung? Tanya aku aja yuk!</p>
            </div>
          )}
          
          {messages.map((msg, i) => {
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
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Sedang berpikir...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            style={{ display: 'flex', gap: '0.8rem' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya soal materi ini..."
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes mascotPopIn {
          0% { transform: scale(0.5) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
