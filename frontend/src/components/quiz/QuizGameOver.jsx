import { motion } from 'framer-motion';

export default function QuizGameOver({ onRetry, onBackToMap, classId }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      style={{ 
        height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
        background: '#0f172a', color: 'white', textAlign: 'center', position: 'fixed', inset: 0, zIndex: 100 
      }}
    >
      <h1 style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '1rem' }}>Game Over</h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Nyawa kamu habis. Coba lagi dari awal materi ini.
      </p>
      <button 
        onClick={onRetry}
        style={{ padding: '1rem 2rem', background: '#ef4444', color: '#fff', borderRadius: '30px', fontSize: '1.2rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
      >
        Coba Lagi
      </button>
      <button 
        onClick={onBackToMap} 
        style={{ marginTop: '1rem', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
      >
        Kembali ke Skill Tree
      </button>
    </motion.div>
  );
}
