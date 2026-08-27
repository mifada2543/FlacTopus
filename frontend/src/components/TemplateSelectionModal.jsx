import React, { useState, useEffect } from 'react';
import { FilePlus, LayoutTemplate, Sparkles, X, Trash2, AlertTriangle } from 'lucide-react';

export const TemplateSelectionModal = ({ onSelect, onClose, hasNodes }) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let timer;
    if (confirmClear && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [confirmClear, countdown]);

  if (confirmClear) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 className="modal-title" style={{ color: '#ef4444' }}>Hapus Semua Node?</h2>
          <p className="modal-subtitle" style={{ marginBottom: '1.5rem' }}>
            Apakah Anda benar-benar ingin menghapus semua node? Tindakan ini akan mengosongkan kanvas saat ini.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => { setConfirmClear(false); setCountdown(5); }}
              style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Batal
            </button>
            <button 
              onClick={() => onSelect('clear')}
              disabled={countdown > 0}
              style={{ flex: 1, padding: '0.8rem', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', cursor: countdown > 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: countdown > 0 ? 0.5 : 1 }}
            >
              {countdown > 0 ? `Hapus (${countdown}s)` : 'Ya, Hapus!'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderTemplateCard = () => (
    <div className="option-card" onClick={() => onSelect('template')} key="template">
      <div className="option-icon">
        <LayoutTemplate size={32} color="var(--accent-green)" />
      </div>
      <div className="option-text-group">
        <h3 className="option-title">Gunakan Template</h3>
        <p className="option-desc">Pilih dari struktur silabus yang sudah dirancang oleh ahli pendidikan.</p>
      </div>
    </div>
  );

  const renderAICard = () => (
    <div className="option-card ai-card" onClick={() => onSelect('ai')} key="ai">
      <div className="option-icon">
        <Sparkles size={32} color="#a855f7" />
      </div>
      <div className="option-text-group">
        <h3 className="option-title">Auto-Generate AI</h3>
        <p className="option-desc">Cukup ketik topik atau paste materi, AI kami akan membuatkan struktur lengkapnya.</p>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {hasNodes && (
          <button 
            onClick={onClose}
            style={{ float: 'right', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
        )}
        
        <h2 className="modal-title">{hasNodes ? "Opsi Pembuatan Silabus" : "Mulai Silabus Baru"}</h2>
        <p className="modal-subtitle">{hasNodes ? "Pilih metode untuk menambahkan materi atau hapus semua node saat ini." : "Pilih bagaimana Anda ingin menyusun peta belajar ini."}</p>
        
        <div className="modal-options">
          {hasNodes ? (
            <>
              {renderTemplateCard()}
              {renderAICard()}
              <div className="option-card" onClick={() => setConfirmClear(true)} style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }} key="clear">
                <div className="option-icon">
                  <Trash2 size={32} color="#ef4444" />
                </div>
                <div className="option-text-group">
                  <h3 className="option-title" style={{ color: '#ef4444' }}>Hapus Semua Node</h3>
                  <p className="option-desc">Kosongkan kanvas sepenuhnya. Anda masih bisa membatalkan ini nanti dengan fitur Undo.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="option-card" onClick={() => onSelect('blank')} key="blank">
                <div className="option-icon">
                  <FilePlus size={32} color="var(--text-main)" />
                </div>
                <div className="option-text-group">
                  <h3 className="option-title">Mulai dari Kosong</h3>
                  <p className="option-desc">Kanvas bersih. Susun materi dan kuis satu per satu sesuai gaya Anda sendiri.</p>
                </div>
              </div>
              {renderTemplateCard()}
              {renderAICard()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
