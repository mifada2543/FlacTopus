import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap } from 'lucide-react';

export default function QuizVictory({ score, streak, onContinue }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
        style={{ fontSize: '6rem', marginBottom: '1rem' }}
      >
        🏆
      </motion.div>

      <h2 style={{ color: '#fbbf24', fontFamily: 'Press Start 2P, monospace', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
        VICTORY!
      </h2>
      <p style={{ color: '#a78bfa', fontSize: '1.1rem', marginBottom: '2rem', textAlign: 'center' }}>
        Kamu berhasil menyelesaikan kuis!
      </p>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '1rem 1.5rem', background: 'rgba(251,191,36,0.1)', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.3)' }}>
          <Star size={24} color="#fbbf24" style={{ marginBottom: '0.5rem' }} />
          <div style={{ color: '#fbbf24', fontFamily: 'Press Start 2P, monospace', fontSize: '1.5rem' }}>{score}</div>
          <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.25rem' }}>Skor</div>
        </div>
        <div style={{ textAlign: 'center', padding: '1rem 1.5rem', background: 'rgba(168,85,247,0.1)', borderRadius: '12px', border: '1px solid rgba(168,85,247,0.3)' }}>
          <Zap size={24} color="#a855f7" style={{ marginBottom: '0.5rem' }} />
          <div style={{ color: '#a855f7', fontFamily: 'Press Start 2P, monospace', fontSize: '1.5rem' }}>{streak}</div>
          <div style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.25rem' }}>Best Streak</div>
        </div>
      </div>

      <button
        onClick={onContinue}
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: '#fff',
          border: 'none',
          padding: '1rem 2rem',
          borderRadius: '12px',
          fontSize: '1rem',
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 25px rgba(168,85,247,0.4)'; }}
        onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'none'; }}
      >
        Lanjutkan →
      </button>
    </motion.div>
  );
}
