import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IceBreakingCharacter from './IceBreakingCharacter';
import { playRetroSound, playCappedAudio, fadeOutAudio } from '../../utils/sounds';

const allCharacters = [
  { id: 0, artboard: 'animoji-InTheWorks AE', sound: `${import.meta.env.BASE_URL}ice_breaking_sfx/memasak.mp3` },
  { id: 1, artboard: 'animoji-sprint', sound: `${import.meta.env.BASE_URL}ice_breaking_sfx/sprint.mp3` },
  { id: 2, artboard: 'Animoji-SillyRequest', sound: `${import.meta.env.BASE_URL}ice_breaking_sfx/badut.mp3` },
  { id: 3, artboard: 'animoji-expressions', sound: `${import.meta.env.BASE_URL}ice_breaking_sfx/ngoding.mp3` },
  { id: 4, artboard: 'Animoji-Understood', sound: `${import.meta.env.BASE_URL}ice_breaking_sfx/check.mp3` }
];

export default function IceBreakingView({ currentItemIndex, isLastItem, handleNext, handlePrev, submitQuizToApi, setIsVictory }) {
  const [phase, setPhase] = useState('intro');
  const [targetId, setTargetId] = useState(null);
  const [result, setResult] = useState(null);
  const [showCurtain, setShowCurtain] = useState(false);
  
  const [activeChars, setActiveChars] = useState([]);
  const [bgMusic, setBgMusic] = useState(null);
  const [bgmFaded, setBgmFaded] = useState(false);

  useEffect(() => {
    const shuffled = [...allCharacters].sort(() => 0.5 - Math.random());
    setActiveChars(shuffled.slice(0, 3));
    
    const audio = new Audio(`${import.meta.env.BASE_URL}ice_breaking_sfx/bg_music.mp3`);
    audio.loop = true;
    audio.volume = 0.5;
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => console.warn(e));
    }
    setBgMusic(audio);
    
    return () => {
      if (playPromise !== undefined) {
        playPromise.then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => {});
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => {
        setPhase('learning');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleAnyInteract = () => {
    if (bgMusic && !bgmFaded) {
      fadeOutAudio(bgMusic, 1);
      setBgmFaded(true);
    }
  };

  const handleStartTesting = () => {
    if (bgMusic && !bgmFaded) {
      fadeOutAudio(bgMusic, 1);
      setBgmFaded(true);
    }
    setShowCurtain(true);
    setPhase('testing');
    const randomIdx = Math.floor(Math.random() * activeChars.length);
    setTargetId(activeChars[randomIdx].id);
    
    setTimeout(() => {
      playCappedAudio(activeChars[randomIdx].sound);
    }, 1000);
  };

  const handleGuess = (id) => {
    if (result === 'correct') return;
    if (id === targetId) {
      setResult('correct');
      setShowCurtain(false);
      playRetroSound('victory');
    } else {
      setResult('wrong');
      playRetroSound('error');
      setTimeout(() => setResult(null), 1000);
    }
  };

  const onNext = async () => {
    if (isLastItem) {
      await submitQuizToApi();
      setIsVictory(true);
      playRetroSound('victory');
    } else {
      handleNext();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="quiz-card"
      style={{ position: 'relative', width: '100%', maxWidth: '800px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '24px', padding: '3rem 2rem', overflow: 'hidden' }}
    >
      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: '#0f172a',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}
          >
            <span style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎮</span>
            <h2 style={{ fontSize: '1.8rem', margin: 0, color: '#3b82f6' }}>Mini Games Dimulai!</h2>
            <p style={{ color: 'var(--text-muted)' }}>Bersiaplah mendengarkan dengan saksama...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <h2 style={{ color: '#3b82f6', fontSize: '1.8rem', marginBottom: '1rem', marginTop: 0 }}>🧊 Ice Breaking: Tebak Suara!</h2>
      
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        {phase === 'learning' 
          ? "Klik dan hafalkan suara dari masing-masing maskot di bawah ini. Jika sudah siap, klik Lanjut!"
          : "Suara siapakah barusan? Tebak maskot di balik tirai!"}
      </p>

      <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto', minHeight: '250px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        <AnimatePresence>
          {showCurtain && (
            <motion.div 
              initial={{ y: -200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -200, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.3 }}
              style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #1e293b, #0f172a)', borderRadius: '16px', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #3b82f6', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
            >
              <span style={{ fontSize: '5rem', color: '#3b82f6', filter: 'drop-shadow(0 0 10px #3b82f6)' }}>❓</span>
            </motion.div>
          )}
        </AnimatePresence>

        {activeChars.map((char, idx) => (
          <div key={char.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1, maxWidth: '180px' }}>
            <IceBreakingCharacter 
              artboardName={char.artboard} 
              soundUrl={phase === 'learning' ? char.sound : null} 
              disabled={phase === 'testing'}
              onInteract={handleAnyInteract}
            />
            {phase === 'learning' && <div style={{ marginTop: '0.5rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>#{idx + 1}</div>}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '3rem', minHeight: '60px' }}>
        {phase === 'learning' ? (
          <button 
            onClick={handleStartTesting}
            style={{ padding: '1rem 3rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 5px 15px rgba(59, 130, 246, 0.4)' }}
          >
            Lanjut (Mulai Ujian)
          </button>
        ) : result === 'correct' ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <p style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '1rem' }}>Tebakan Benar!</p>
            <button 
              onClick={onNext}
              style={{ padding: '1rem 3rem', background: 'var(--accent-green)', color: '#000', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
            >
              {isLastItem ? 'Selesai' : 'Lanjut ke Materi'}
            </button>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            {[1, 2, 3].map(num => (
              <motion.button
                key={num}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleGuess(activeChars[num - 1].id)}
                style={{ 
                  width: '60px', height: '60px', borderRadius: '50%', background: result === 'wrong' ? '#ef4444' : '#1e293b', 
                  color: 'white', fontSize: '1.5rem', fontWeight: 'bold', border: result === 'wrong' ? 'none' : '2px solid #3b82f6',
                  cursor: 'pointer', transition: 'background 0.3s'
                }}
              >
                {num}
              </motion.button>
            ))}
          </div>
        )}
      </div>
      
      {phase === 'testing' && result !== 'correct' && (
        <button onClick={() => {
           const char = activeChars.find(c => c.id === targetId);
           if (char) playCappedAudio(char.sound);
        }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', marginTop: '1.5rem', cursor: 'pointer', textDecoration: 'underline' }}>
          🔊 Ulangi Suara Acak
        </button>
      )}
    </motion.div>
  );
}
