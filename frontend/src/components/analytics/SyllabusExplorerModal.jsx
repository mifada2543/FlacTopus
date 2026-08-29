import React, { useState, useMemo } from 'react';
import { X, Maximize2, Minimize2, Search, BookOpen, HelpCircle, MapPin, Edit3 } from 'lucide-react';
import DOMPurify from 'dompurify';

export default function SyllabusExplorerModal({ isOpen, onClose, nodes, isBlackTheme, onNavigateToBuilder }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Minimal responsiveness check
  const isMobile = window.innerWidth <= 768;

  const filteredNodes = useMemo(() => {
    if (!nodes) return [];
    if (!searchQuery.trim()) return nodes;
    
    const query = searchQuery.toLowerCase();
    
    return nodes.filter(node => {
      const labelMatch = (node.data?.label || '').toLowerCase().includes(query);
      
      const itemMatch = (node.data?.items || []).some(item => {
        if (item.type === 'materi') {
          return (item.content || '').toLowerCase().includes(query);
        } else if (item.type === 'kuis') {
          const qText = item.quiz?.question || '';
          const optionsText = Object.values(item.quiz?.options || {}).join(' ');
          return qText.toLowerCase().includes(query) || optionsText.toLowerCase().includes(query);
        }
        return false;
      });
      
      return labelMatch || itemMatch;
    });
  }, [nodes, searchQuery]);

  if (!isOpen) return null;

  const modalBg = isBlackTheme ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)';
  const textColor = isBlackTheme ? '#f8fafc' : '#0f172a';
  const gridColor = isBlackTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const cardBg = isBlackTheme ? '#1e293b' : '#fff';
  const mutedText = isBlackTheme ? '#94a3b8' : '#64748b';

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
        border: `1px solid ${gridColor}`,
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          
          @keyframes highlightPulse {
            0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
            100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
          }
        `}</style>
        
        {/* Header */}
        <div style={{
          padding: isMobile ? '1rem 0.8rem' : '1.25rem 1.5rem',
          borderBottom: `1px solid ${gridColor}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          background: cardBg
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
              padding: isMobile ? '0.4rem' : '0.5rem', borderRadius: '10px', color: '#fff',
              boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)'
            }}>
              <Search size={isMobile ? 18 : 22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.25rem', color: textColor, fontWeight: 700 }}>
                Eksplorasi Silabus
              </h2>
              {!isMobile && (
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: mutedText }}>
                  Cari materi, pertanyaan kuis, atau nama node materi dengan cepat
                </p>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '1rem' }}>
            {!isMobile && (
              <button 
                onClick={() => setIsMaximized(!isMaximized)}
                style={{
                  background: 'transparent', border: 'none', color: mutedText,
                  cursor: 'pointer', padding: '0.5rem', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = gridColor; e.currentTarget.style.color = textColor; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = mutedText; }}
              >
                {isMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            )}
            <button 
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none', color: mutedText,
                cursor: 'pointer', padding: '0.5rem', borderRadius: '8px',
                display: 'flex', alignItems: 'center', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = mutedText; }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: `1px solid ${gridColor}`,
          background: isBlackTheme ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc',
          flexShrink: 0
        }}>
          <div style={{
            position: 'relative',
            width: '100%'
          }}>
            <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: mutedText }} />
            <input 
              type="text" 
              placeholder="Ketik kata kunci untuk mencari materi atau soal kuis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem 1rem 0.8rem 3rem',
                borderRadius: '12px',
                border: `1px solid ${gridColor}`,
                background: cardBg,
                color: textColor,
                fontSize: '1rem',
                outline: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2)'; }}
              onBlur={(e) => { e.target.style.borderColor = gridColor; e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; }}
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="hide-scrollbar" style={{ 
          flex: 1, 
          overflowY: 'auto',
          background: isBlackTheme ? '#0f172a' : '#f1f5f9',
          padding: isMobile ? '1rem' : '2rem'
        }}>
          {filteredNodes.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: mutedText, textAlign: 'center' }}>
              <Search size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <h3 style={{ margin: '0 0 0.5rem', color: textColor }}>Tidak Ditemukan</h3>
              <p style={{ margin: 0 }}>Coba gunakan kata kunci lain untuk mencari.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px', margin: '0 auto' }}>
              {filteredNodes.map((node, idx) => (
                <div 
                  key={node.id || idx}
                  style={{
                    background: cardBg,
                    borderRadius: '12px',
                    border: `1px solid ${gridColor}`,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    borderBottom: node.data?.items?.length ? `1px solid ${gridColor}` : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#3b82f6',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <MapPin size={20} />
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem', color: textColor, fontWeight: 700 }}>
                          {node.data?.label || 'Node Tanpa Nama'}
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: mutedText }}>
                          ID: {node.id} &bull; {node.data?.items?.length || 0} Item(s)
                        </p>
                      </div>
                    </div>

                    {onNavigateToBuilder && (
                      <button
                        onClick={() => onNavigateToBuilder(node.id)}
                        title="Edit Node ini di Visual Builder"
                        style={{
                          background: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
                      >
                        <Edit3 size={16} /> {!isMobile && 'Edit di Builder'}
                      </button>
                    )}
                  </div>

                  {node.data?.items && node.data.items.length > 0 && (
                    <div style={{ padding: '0.5rem 1.5rem 1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                        {node.data.items.map((item, itemIdx) => (
                          <div key={itemIdx} style={{
                            display: 'flex', gap: '0.8rem', alignItems: 'flex-start',
                            padding: '1rem',
                            background: isBlackTheme ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                            borderRadius: '8px',
                            border: `1px solid ${gridColor}`
                          }}>
                            {item.type === 'materi' ? (
                              <BookOpen size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                            ) : (
                              <HelpCircle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                            )}
                            
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ 
                                display: 'inline-block', 
                                fontSize: '0.75rem', 
                                fontWeight: 700, 
                                textTransform: 'uppercase',
                                color: item.type === 'materi' ? '#10b981' : (item.type === 'ice_breaking' ? '#3b82f6' : '#f59e0b'),
                                marginBottom: '0.3rem'
                              }}>
                                {item.type === 'ice_breaking' 
                                  ? 'Ice Breaking'
                                  : item.type === 'materi' 
                                    ? 'Materi Bacaan' 
                                    : (item.quiz?.type === 'fill_in_the_blank' 
                                        ? 'Kuis Isi Rumpang' 
                                        : item.quiz?.type === 'boss_fight'
                                            ? 'Kuis Boss Fight (Pilihan Ganda)'
                                            : item.quiz?.type === 'auditory'
                                                ? 'Kuis Auditori'
                                                : 'Kuis Pilihan Ganda')}
                              </span>
                              
                              <div style={{ color: textColor, fontSize: '0.95rem', lineHeight: 1.5 }}>
                                {item.type === 'ice_breaking' ? (
                                  <p style={{ fontStyle: 'italic', opacity: 0.8 }}>Sesi interaktif ice breaking.</p>
                                ) : item.type === 'materi' ? (
                                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content || '', { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'blockquote'] }) }} />
                                ) : (
                                  <div>
                                    <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>{item.quiz?.question}</p>
                                    {item.quiz?.options && (
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
                                        {Object.entries(item.quiz.options).map(([key, opt]) => (
                                          <div key={key} style={{
                                            fontSize: '0.8rem',
                                            padding: '0.3rem 0.5rem',
                                            background: isBlackTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                            borderRadius: '4px',
                                            color: mutedText,
                                            borderLeft: item.quiz.answer === opt ? '3px solid #22c55e' : '3px solid transparent'
                                          }}>
                                            {opt}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
