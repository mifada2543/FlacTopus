import React, { useState } from 'react';
import { X, CheckSquare, TextCursorInput, Skull, Headphones, Eye } from 'lucide-react';

const QUIZ_TYPES = [
  {
    id: 'multiple_choice',
    name: 'Pilihan Ganda Biasa',
    description: 'Format kuis standar dengan satu jawaban benar dari beberapa pilihan.',
    iconType: 'check',
    image: '/FlacTopus/quiz-pilihan-ganda.png'
  },
  {
    id: 'fill_in_the_blank',
    name: 'Isi Rumpang (Interaktif)',
    description: 'Murid menyusun blok kata untuk melengkapi kalimat yang kosong.',
    iconType: 'form',
    image: '/FlacTopus/quiz-isi-rumpang.png'
  },
  {
    id: 'boss_fight',
    name: 'Boss Fight (Pilihan Ganda)',
    description: 'Pertarungan kuis epik melawan monster. Cocok untuk ujian akhir.',
    iconType: 'boss',
    image: '/FlacTopus/quiz-boss-fight.png'
  },
  {
    id: 'auditory',
    name: 'Auditori (Mendengar)',
    description: 'Murid mendengarkan audio sebelum menjawab pertanyaan kuis.',
    iconType: 'audio',
    image: '/FlacTopus/quiz-auditori.png'
  }
];

export const QuizTypeModal = ({ onSelect, onClose, currentType }) => {
  
  const renderPreviewIcon = (type) => {
    switch (type) {
      case 'check':
        return <CheckSquare size={54} color="var(--accent-green)" />;
      case 'form':
        return <TextCursorInput size={54} color="#3b82f6" />;
      case 'boss':
        return <Skull size={54} color="#ef4444" />;
      case 'audio':
        return <Headphones size={54} color="#a855f7" />;
      default:
        return <CheckSquare size={54} color="var(--text-muted)" />;
    }
  };

  const TypeCard = ({ tpl }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [imgError, setImgError] = useState(false);
    const isSelected = currentType === tpl.id;

    return (
      <div 
        className="gallery-card" 
        onClick={() => onSelect(tpl.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="gallery-preview" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Poster (Lucide Icon) */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isHovered && !imgError && tpl.image ? 0 : 1,
            transition: 'opacity 0.3s ease',
            zIndex: 1
          }}>
            {renderPreviewIcon(tpl.iconType)}
          </div>

          {/* Gambar Asli (Screenshot) */}
          {!imgError && tpl.image && (
            <img 
              src={tpl.image} 
              alt={tpl.name} 
              onError={() => setImgError(true)} 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover', 
                borderRadius: '8px', 
                opacity: isHovered ? 1 : 0, 
                transition: 'opacity 0.3s ease',
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                zIndex: 2,
                position: 'relative'
              }} 
            />
          )}
        </div>
        
        <div>
          <h3 className="gallery-title" style={{ color: isSelected ? 'var(--accent-green)' : 'var(--text-main)' }}>{tpl.name}</h3>
          <p className="gallery-desc">{tpl.description}</p>
        </div>
        
        <div className="gallery-card-footer">
          {isSelected && (
            <span className="gallery-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-green)' }}>Dipilih</span>
          )}
          
          {/* Indikator "Intip" */}
          {!imgError && tpl.image && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsHovered(!isHovered);
              }}
              className="gallery-badge" 
              style={{ 
                border: 'none',
                cursor: 'pointer',
                marginLeft: 'auto', 
                background: isHovered ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)', 
                color: isHovered ? '#3b82f6' : 'var(--text-muted)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px', 
                transition: 'all 0.3s' 
              }}
            >
              <Eye size={12} /> Intip
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '900px', width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
        <button 
          onClick={onClose}
          style={{ float: 'right', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
        
        <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          Pilih Tipe Kuis
        </h2>
        <p className="modal-subtitle">Tentukan format pertanyaan yang akan diujikan kepada murid pada materi ini.</p>
        
        <div className="gallery-grid">
          {QUIZ_TYPES.map((tpl, i) => (
            <TypeCard key={i} tpl={tpl} />
          ))}
        </div>
      </div>
    </div>
  );
};
