import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Loader, UploadCloud, FileText } from 'lucide-react';
import { generateSkillTree } from '../utils/aiService';
import * as pdfjsLib from 'pdfjs-dist';

// Menggunakan CDN untuk worker PDF.js yang sesuai dengan versi yang diinstall
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const AIGenerateModal = ({ onGenerate, onClose }) => {
  const [topic, setTopic] = useState('');
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      if (droppedFile.size > MAX_FILE_SIZE) {
        setError("File PDF kegedean brok! Maksimal 10MB ya.");
        return;
      }
      setFile(droppedFile);
      setTopic(''); // Kosongkan teks kalau pake PDF
      setError(null);
    } else if (droppedFile) {
      setError("Hanya menerima file berformat PDF!");
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError("File PDF kegedean brok! Maksimal 10MB ya.");
        // reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setFile(selectedFile);
      setTopic('');
      setError(null);
    } else if (selectedFile) {
      setError("Hanya menerima file berformat PDF!");
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const extractTextFromPDF = async (pdfFile) => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\\n';
      }
      
      return fullText;
    } catch (err) {
      console.error("Error extracting PDF text:", err);
      throw new Error("Gagal mengekstrak teks dari PDF. Pastikan file tidak rusak atau dikunci.");
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim() && !file) return;
    setLoading(true);
    setError(null);
    
    try {
      if (file) {
        // Ekstrak teks dari PDF menggunakan pdf.js (Client-side)
        let extractedText = await extractTextFromPDF(file);
        
        // Batasi teks jika terlalu panjang agar tidak kena limit token Gemini
        const MAX_CHARS = 50000;
        if (extractedText.length > MAX_CHARS) {
            extractedText = extractedText.substring(0, MAX_CHARS) + '\\n\\n... [Teks dipotong karena terlalu panjang]';
        }
        
        // Kirim teks hasil ekstraksi ke AI
        const data = await generateSkillTree(extractedText, true);
        onGenerate(data);
      } else {
        const data = await generateSkillTree(topic, false);
        onGenerate(data);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
        <button 
          onClick={onClose}
          disabled={loading}
          style={{ float: 'right', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>
        
        <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={24} color="#a855f7" />
          Auto-Generate AI (Teks / PDF)
        </h2>
        <p className="modal-subtitle">
          Ketik topik manual ATAU cukup Drag & Drop file PDF RPP/Silabus lu. AI bakal ekstrak isinya jadi Skill Tree!
        </p>
        
        <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Opsi 1: Teks */}
          {!file && (
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={loading}
              placeholder="Contoh: Belajar Python Dasar..."
              style={{
                width: '100%', minHeight: '100px', padding: '12px',
                borderRadius: '8px', border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                fontFamily: 'inherit', resize: 'vertical'
              }}
            />
          )}

          {/* Opsi 2: Drag & Drop PDF */}
          {!topic.trim() && (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current.click()}
              style={{
                border: `2px dashed ${isDragging ? '#a855f7' : 'var(--border-color)'}`,
                background: isDragging ? 'rgba(168, 85, 247, 0.1)' : (file ? 'var(--bg-secondary)' : 'transparent'),
                borderRadius: '8px', padding: '1.5rem', textAlign: 'center',
                cursor: file ? 'default' : 'pointer', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
              }}
            >
              <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
              
              {file ? (
                <>
                  <FileText size={40} color="#10b981" />
                  <div style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{file.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  <button onClick={(e) => { e.stopPropagation(); removeFile(); }} disabled={loading} style={{ marginTop: '10px', padding: '4px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    Hapus File
                  </button>
                </>
              ) : (
                <>
                  <UploadCloud size={40} color="var(--text-muted)" />
                  <div style={{ color: 'var(--text-muted)' }}>Atau Drag & Drop file PDF materi di sini (Max 10MB)</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Klik untuk mencari file</div>
                </>
              )}
            </div>
          )}

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
              ?? {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button 
            onClick={onClose} 
            disabled={loading}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            Batal
          </button>
          <button 
            onClick={handleGenerate}
            disabled={(!topic.trim() && !file) || loading}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '6px', border: 'none', 
              background: loading ? '#4b5563' : '#a855f7', 
              color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold', transition: 'background 0.3s'
            }}
          >
            {loading ? <Loader size={18} className="spin" /> : <Sparkles size={18} />}
            {loading ? 'Mengekstrak PDF & Membaca...' : 'Generate Skill Tree'}
          </button>
        </div>
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

