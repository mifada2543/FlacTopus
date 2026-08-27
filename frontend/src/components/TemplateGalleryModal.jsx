import React, { useState } from 'react';
import { X, GitCommit, GitMerge, Swords, PlusCircle, Eye } from 'lucide-react';
import { templates } from '../data/templateLibrary';

export const TemplateGalleryModal = ({ onSelectTemplate, onClose }) => {
  
  const renderPreviewIcon = (type) => {
    switch (type) {
      case 'linear':
        return <GitCommit size={54} color="var(--accent-green)" />;
      case 'branching':
        return <GitMerge size={54} color="#3b82f6" style={{ transform: 'rotate(180deg)' }} />;
      case 'boss':
        return <Swords size={54} color="#ef4444" />;
      default:
        return <PlusCircle size={54} color="var(--text-muted)" />;
    }
  };

  const GalleryCard = ({ tpl, onSelect }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [imgError, setImgError] = useState(false);

    return (
      <div 
        className="gallery-card" 
        onClick={() => onSelect(tpl)}
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

          {/* Gambar Asli (Screenshot) - Dikembalikan ke cover */}
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
          <h3 className="gallery-title">{tpl.name}</h3>
          <p className="gallery-desc">{tpl.description}</p>
        </div>
        
        <div className="gallery-card-footer">
          <span className="gallery-badge">{tpl.nodes.length} Node</span>
          <span className="gallery-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>{tpl.edges.length} Garis</span>
          
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
      <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
        <button 
          onClick={onClose}
          style={{ float: 'right', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
        
        <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          Library Template
          <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-green)', borderRadius: '4px', verticalAlign: 'middle' }}>Terbaru</span>
        </h2>
        <p className="modal-subtitle">Pilih kerangka struktur silabus yang sesuai dengan rencana pembelajaran Anda. Node akan otomatis ditambahkan ke area kanvas yang kosong.</p>
        
        <div className="gallery-grid">
          {templates.map(tpl => (
            <GalleryCard key={tpl.id} tpl={tpl} onSelect={onSelectTemplate} />
          ))}
        </div>
      </div>
    </div>
  );
};
