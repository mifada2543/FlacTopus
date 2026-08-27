import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockSyllabus } from '../data/mockData';
import { ruanganGet, quizPost } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { useRoomHeartbeat } from '../hooks/useRoomHeartbeat';
import { ROLE, isAllowed } from '../utils/roles';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useRive } from '@rive-app/react-canvas';
import { Sparkles, Send, Bot, User, Loader } from 'lucide-react';
import StudentAIAssistantModal from '../components/StudentAIAssistantModal';
import { chatWithStudentAssistant } from '../utils/aiService';

// Web Audio API Retro Sound Generator (Tidak butuh koneksi internet atau file wav)
const playRetroSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'hit') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'punch') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);

      const noise = ctx.createOscillator();
      const noiseGain = ctx.createGain();
      noise.type = 'square';
      noise.frequency.setValueAtTime(200, ctx.currentTime);
      noise.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
      noiseGain.gain.setValueAtTime(0.5, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(ctx.currentTime);
      noise.stop(ctx.currentTime + 0.15);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'select') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'swoosh') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'victory') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'bossdeath') {
      try {
        const audio = new Audio(`${import.meta.env.BASE_URL}boss-death.mp3`);
        audio.play().catch(e => console.warn('Audio play prevented:', e));
      } catch (e) {}
    }
  } catch (err) {
    console.error("Web Audio API error:", err);
  }
};

const BossBackground = ({ riveRef, isWaitingForBossClick, handleBossClick, isShaking }) => {
  const { rive, RiveComponent } = useRive({
    src: `${import.meta.env.BASE_URL}boss.riv`,
    stateMachines: 'State Machine 1',
    autoplay: true,
  });

  useEffect(() => {
    if (rive && riveRef) {
      riveRef.current = rive;
    }
  }, [rive, riveRef]);

  return (
    <div 
      className={isShaking ? "shake-screen" : ""}
      style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundColor: '#fcd34d', cursor: isWaitingForBossClick ? 'crosshair' : 'default' }}
      onClickCapture={(e) => {
        if (isWaitingForBossClick) {
          handleBossClick();
        }
      }}
    >
      <RiveComponent style={{ width: '100vw', height: '100vh' }} />
      {isWaitingForBossClick && (
        <div className="attack-text">
          KLIK UNTUK MENYERANG!
        </div>
      )}
    </div>
  );
};
  
const AiMascotInner = ({ artboardName }) => {
  const { rive, RiveComponent } = useRive({
    src: `${import.meta.env.BASE_URL}animojis.riv`,
    artboard: artboardName,
    stateMachines: 'State Machine 1',
    autoplay: true,
  });

  return (
    <div style={{ width: '120px', height: '120px', margin: '0 auto 1rem auto' }}>
      <RiveComponent />
    </div>
  );
};

const AiMascot = ({ quizState }) => {
  let artboardName = 'Animoji-Wizard';
  if (quizState === 'wrong') artboardName = 'Animoji-Exhausted';
  if (quizState === 'correct') artboardName = 'Animoji-Stakeholder';

  return <AiMascotInner key={artboardName} artboardName={artboardName} />;
};

const playCappedAudio = (url) => {
  const audio = new Audio(url);
  audio.play().catch(e => console.warn(e));
  setTimeout(() => {
    audio.pause();
    audio.currentTime = 0;
  }, 5000);
};

const fadeOutAudio = (audio, durationSec) => {
  if (!audio) return;
  const step = 0.05;
  const interval = (durationSec * 1000 * step);
  const fade = setInterval(() => {
    if (audio.volume > step) {
      audio.volume -= step;
    } else {
      audio.volume = 0;
      audio.pause();
      clearInterval(fade);
    }
  }, interval);
};

const IceBreakingCharacter = ({ artboardName, soundUrl, onInteract, disabled, hidden }) => {
  const { rive, RiveComponent } = useRive({
    src: `${import.meta.env.BASE_URL}animojis.riv`,
    artboard: artboardName,
    stateMachines: 'State Machine 1',
    autoplay: true,
  });

  const playSound = () => {
    if (!soundUrl) return;
    playCappedAudio(soundUrl);
  };

  const handleInteract = () => {
    if (disabled) return;
    if (onInteract) onInteract();
    playSound();
    if (rive) {
      try {
        const inputs = rive.stateMachineInputs('State Machine 1');
        const pressedInput = inputs.find(i => i.name.toLowerCase().includes('press') || i.name.toLowerCase().includes('click'));
        if (pressedInput) pressedInput.fire();
      } catch (e) {}
    }
    if (onInteract) onInteract();
  };
  
  const handleHover = (isHover) => {
    if (disabled || !rive) return;
    try {
      const inputs = rive.stateMachineInputs('State Machine 1');
      const hoverInput = inputs.find(i => i.name.toLowerCase().includes('hover'));
      if (hoverInput && hoverInput.type === 0) hoverInput.value = isHover;
    } catch (e) {}
  };

  return (
    <div 
      style={{ 
        width: 'clamp(80px, 25vw, 150px)', 
        height: 'clamp(80px, 25vw, 150px)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: hidden ? 0 : 1,
        transition: 'opacity 0.3s'
      }}
      onClick={handleInteract}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
    >
      <RiveComponent />
    </div>
  );
};

const allCharacters = [
  { id: 0, artboard: 'animoji-InTheWorks AE', sound: `${import.meta.env.BASE_URL}ice_breaking_sfx/memasak.mp3` },
  { id: 1, artboard: 'animoji-sprint', sound: `${import.meta.env.BASE_URL}ice_breaking_sfx/sprint.mp3` },
  { id: 2, artboard: 'Animoji-SillyRequest', sound: `${import.meta.env.BASE_URL}ice_breaking_sfx/badut.mp3` },
  { id: 3, artboard: 'animoji-expressions', sound: `${import.meta.env.BASE_URL}ice_breaking_sfx/ngoding.mp3` },
  { id: 4, artboard: 'Animoji-Understood', sound: `${import.meta.env.BASE_URL}ice_breaking_sfx/check.mp3` }
];

const IceBreakingView = ({ currentItemIndex, isLastItem, handleNext, handlePrev, submitQuizToApi, setIsVictory }) => {
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
};

export default function Quiz() {
  const { classId, nodeId } = useParams();
  const navigate = useNavigate();
  const { user, loading, csrfToken } = useAuth();

  useRoomHeartbeat(classId);

  const [node, setNode] = useState(null);
  const [isLoadingNode, setIsLoadingNode] = useState(true);

  // Gamification States
  const [studentHP, setStudentHP] = useState(3);
  const [aiHP, setAiHP] = useState(100);
  const [streak, setStreak] = useState(0); 
  const [isShaking, setIsShaking] = useState(false);
  const [flashColor, setFlashColor] = useState(null);
  const [isVictory, setIsVictory] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isAllowed(user.role, [ROLE.STUDENT, ROLE.ADMIN])) {
      navigate('/classes');
      return;
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    const fetchNode = async () => {
      if (!classId) {
        setIsLoadingNode(false);
        return;
      }
      try {
        const data = await ruanganGet('syllabus', { id: classId });
        const nodes = data.nodes || [];
        const localNode = nodes.find(n => n.id === nodeId);
        if (localNode) {
          setNode({
            ...localNode,
            ...localNode.data, 
            title: localNode.data.label,
            items: localNode.data.items || [{
              id: `item-fallback`,
              type: localNode.data.nodeType || 'materi',
              content: localNode.data.content || '',
              quiz: localNode.data.quiz
            }]
          });
        } else {
          const mock = mockSyllabus.find(n => n.id === nodeId);
          if (mock) setNode(mock);
        }
      } catch (err) {
        alert(err.message);
        navigate('/classes');
      }
      setIsLoadingNode(false);
    };
    fetchNode();
  }, [classId, nodeId, navigate]);
  
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showAiTutor, setShowAiTutor] = useState(false);
  const [inlineChatHistory, setInlineChatHistory] = useState([]);
  const [inlineChatInput, setInlineChatInput] = useState('');
  const [isInlineChatTyping, setIsInlineChatTyping] = useState(false);
  const [quizState, setQuizState] = useState('neutral');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [clearedIndices, setClearedIndices] = useState([]);
  const [wrongQuestions, setWrongQuestions] = useState([]);
  const aiTutorRef = useRef(null);
  const bossRiveRef = useRef(null);
  const bossAudioRef = useRef(null);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [bossDefeated, setBossDefeated] = useState(false);
  const [isWaitingForBossClick, setIsWaitingForBossClick] = useState(false);
  const [isBossHitAnimating, setIsBossHitAnimating] = useState(false);
  const [isBossDying, setIsBossDying] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showStudentAI, setShowStudentAI] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isBossFightNode = node?.items?.some(item => item.quiz?.type === 'boss_fight') || false;

  useEffect(() => {
    if (isBossFightNode && !bossDefeated && !bossAudioRef.current) {
      try {
        const audio = new Audio(`${import.meta.env.BASE_URL}boss_fight_sfx/bg_music_boss.mp3`);
        audio.loop = true;
        audio.volume = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.warn(e));
        }
        bossAudioRef.current = audio;
      } catch(e) {}
    } else if ((!isBossFightNode || bossDefeated) && bossAudioRef.current) {
      bossAudioRef.current.pause();
      bossAudioRef.current.currentTime = 0;
      bossAudioRef.current = null;
    }
    
    return () => {
      if (bossAudioRef.current) {
        bossAudioRef.current.pause();
        bossAudioRef.current.currentTime = 0;
        bossAudioRef.current = null;
      }
    }
  }, [isBossFightNode, bossDefeated]);

  useEffect(() => {
    if (showAiTutor && aiTutorRef.current) {
      if (window.innerWidth <= 900) {
        setTimeout(() => {
          aiTutorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
      }
    }
  }, [showAiTutor]);

  const isMobile = Math.min(window.innerWidth, window.innerHeight) < 600;
  useEffect(() => {
    if (isVictory) {
      confetti({
        particleCount: 200,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isVictory]);

  if (isLoadingNode) {
    return <div style={{ padding: '2rem', color: 'white', textAlign: 'center' }}>Memuat data kuis...</div>;
  }

  if (!node || !node.items || node.items.length === 0) {
    return <div style={{ padding: '2rem', color: 'white', textAlign: 'center' }}>Materi / Kuis tidak ditemukan.</div>;
  }

  const currentItem = node.items[currentItemIndex] || {};
  const isMateri = currentItem.type === 'materi';
  const isIceBreaking = currentItem.type === 'ice_breaking';
  const isFillInTheBlank = currentItem.quiz?.type === 'fill_in_the_blank';
  const isBossFight = isBossFightNode; // All items in the node share the boss mode layout
  const isEmptyQuiz = !isMateri && !currentItem.quiz?.question?.trim();
  const isLastItem = currentItemIndex === node.items.length - 1;

  const totalQ = (node.items || []).filter(it => it.type === 'kuis' && it.quiz?.question?.trim()).length;
  const hpPerHit = totalQ > 0 ? 100 / totalQ : 100;
  const progressText = `${currentItemIndex + 1} / ${node.items.length}`;

  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      const vId = new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${vId}`;
    }
    if (url.includes('youtu.be/')) {
      const vId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${vId}`;
    }
    return url;
  };

  const submitQuizToApi = async () => {
      const quizItems = (node.items || []).filter(it => it.type === 'kuis' && it.quiz?.question?.trim());
      const totalQ = quizItems.length;
      if (csrfToken) {
        const finalScore = totalQ > 0 ? Math.max(0, Math.round(((totalQ - wrongQuestions.length) / totalQ) * 100)) : 100;
        try {
          await quizPost(csrfToken, {
            action: 'submit',
            ruangan_id: parseInt(classId),
            node_id: nodeId,
            node_label: node.title || nodeId,
            score: finalScore,
            total_questions: totalQ,
            correct_answers: totalQ > 0 ? totalQ - wrongQuestions.length : 0,
            wrong_answers: wrongQuestions,
          });
        } catch (err) {
          console.error('Gagal menyimpan hasil kuis:', err);
        }
      }
  };

  const handleSubmit = async () => {
    const hasBeenCleared = clearedIndices.includes(currentItemIndex);
    
    if (selectedAnswer === currentItem.quiz.correctAnswer) {
      setQuizState('correct');
      if (currentItem.quiz.type !== 'auditory') {
        setShowAiTutor(true);
        setInlineChatHistory([{ role: 'model', content: "Benar sekali! Pemahaman lu udah mantap. Lu berhak lanjut ke materi berikutnya." }]);
      }
      
      playRetroSound('hit');
      setFlashColor('rgba(16, 185, 129, 0.15)'); 
      setTimeout(() => setFlashColor(null), 300);

      if (!hasBeenCleared) {
        setClearedIndices(prev => [...prev, currentItemIndex]);
        setCorrectCount(prev => prev + 1);
        setAiHP(prev => Math.max(0, prev - hpPerHit));
        setStreak(prev => prev + 1);
      }

      if (isBossFight) {
        setShowAiTutor(false); setInlineChatHistory([]); setInlineChatInput('');
        // Jika belum pernah diselesaikan, masuk fase serang
        if (!hasBeenCleared) {
          setIsWaitingForBossClick(true);
        }
        return; 
      }

    } else {
        setQuizState('wrong');
        if (currentItem.quiz.type !== 'auditory') {
          setShowAiTutor(true);
          setIsLoadingAi(true);
          setInlineChatHistory([{ role: 'model', content: "Otak AI sedang merangkai kata..." }]);
        }
        
        playRetroSound('error');
      setFlashColor('rgba(239, 68, 68, 0.15)'); 
      setIsShaking(true);
      setStreak(0);
      setTimeout(() => {
        setFlashColor(null);
        setIsShaking(false);
      }, 500);

      if (!hasBeenCleared) {
        const newStudentHP = studentHP - 1;
        setStudentHP(newStudentHP);

        if (newStudentHP <= 0) {
            setTimeout(() => {
                setIsGameOver(true);
                playRetroSound('gameover');
            }, 1000);
        }
      }

      setWrongQuestions(prev => {
        if (!prev.find(q => q.question === currentItem.quiz.question)) {
          return [...prev, { question: currentItem.quiz.question, selectedAnswer }];
        }
        return prev;
      });
      
      if (currentItem.quiz.type === 'auditory') {
        setInlineChatHistory([{ role: 'model', content: "Sayang sekali, jawaban lu masih kurang tepat. Coba dengerin audionya lagi dengan lebih teliti ya!" }]);
        setIsLoadingAi(false);
      } else {
        const { getSocraticFeedback } = await import('../utils/aiService');
        const responseText = await getSocraticFeedback(currentItem.quiz.question, selectedAnswer, currentItem.quiz.aiPromptContext);
        
        setInlineChatHistory([{ role: 'model', content: responseText }]);
        setIsLoadingAi(false);
      }
    }
  };

  const handleBossClick = () => {
    if (!isWaitingForBossClick && !isBossHitAnimating && !isBossDying) return;
    
    if (bossRiveRef.current) {
      try {
        const inputs = bossRiveRef.current.stateMachineInputs('State Machine 1');
        const hitboxInput = inputs.find(i => i.name === 'hitbox clicked' || i.name === 'hitbox click');
        if (hitboxInput) hitboxInput.fire();
      } catch (e) {}
    }
    
    playRetroSound('punch'); 
    
    // Tiny shake on every hit, but don't interrupt death shake
    if (!isBossDying) {
      setIsShaking(true);
      setTimeout(() => {
         setIsShaking(prev => {
            // Only turn off if we haven't started dying
            return false;
         });
      }, 200);
    }
    
    if (isWaitingForBossClick) {
      setIsWaitingForBossClick(false);
      setIsBossHitAnimating(true);
      
      setTimeout(() => {
          if (isLastItem) {
            playRetroSound('bossdeath');
            setIsBossDying(true);
            setIsShaking(true); // Full screen shake!
            setTimeout(() => {
              setIsShaking(false);
              setBossDefeated(true);
              setIsBossHitAnimating(false);
              handleNext();
            }, 3000);
          } else {
            setIsBossHitAnimating(false);
            handleNext();
          }
        }, 1500);
    }
  };

  const handleInlineChatSend = async (text) => {
    if (!text.trim()) return;
    
    const userMessage = { role: 'user', content: text };
    const newMessages = [...inlineChatHistory, userMessage];
    
    setInlineChatHistory(newMessages);
    setInlineChatInput('');
    setIsInlineChatTyping(true);
    
    try {
      const ctx = {
        tipe: 'Kuis',
        topik: currentItem?.title || '',
        konten: currentItem?.quiz?.question || '',
        status: quizState,
        jawaban_benar: currentItem?.quiz?.correctAnswer || '',
      };
      const aiResponse = await chatWithStudentAssistant(newMessages, JSON.stringify(ctx), user?.nama || "Siswa");
      setInlineChatHistory([...newMessages, { role: 'model', content: aiResponse }]);
    } catch (err) {
      setInlineChatHistory([...newMessages, { role: 'model', content: `[ERROR] Wah, asisten sedang sibuk. Coba lagi sebentar ya!` }]);
    } finally {
      setIsInlineChatTyping(false);
    }
  };

  const parseInlineMessage = (content) => {
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

  const handleNext = async () => {
    if (isLastItem) {
      await submitQuizToApi();
      setIsVictory(true);
      playRetroSound('victory');
    } else {
      setCurrentItemIndex(prev => prev + 1);
      setSelectedAnswer('');
      setQuizState('neutral');
      setShowAiTutor(false); setInlineChatHistory([]); setInlineChatInput('');
      playRetroSound('swoosh');
    }
  };

  const handlePrev = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
      setSelectedAnswer('');
      setQuizState('neutral');
      setShowAiTutor(false); setInlineChatHistory([]); setInlineChatInput('');
      playRetroSound('swoosh');
    }
  };

  const handleOptionSelect = (opt) => {
    playRetroSound('select');
    setSelectedAnswer(opt);
    setQuizState('neutral');
    setShowAiTutor(false); setInlineChatHistory([]); setInlineChatInput('');
  };

  const handleBlankClick = () => {
    if (quizState !== 'correct') {
      setSelectedAnswer('');
      setQuizState('neutral');
    }
  };

  const renderQuestionText = () => {
    if (!isFillInTheBlank) return currentItem.quiz.question;
    
    const parts = currentItem.quiz.question.split(/\[_\]|\[\]/);
    if (parts.length === 1) return <div style={{ whiteSpace: 'pre-wrap' }}>{parts[0]}</div>;

    return (
      <div className="fill-blank-container">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            <span>{part}</span>
            {i < parts.length - 1 && (
              <span 
                className={`blank-spot ${selectedAnswer ? 'filled' : ''}`} 
                onClick={handleBlankClick}
              >
                {selectedAnswer || '?'}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  if (isGameOver) {
      return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', textAlign: 'center', position: 'fixed', inset: 0, zIndex: 100 }}>
              <h1 style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '1rem' }}>Game Over</h1>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>Nyawa kamu habis. Coba lagi dari awal materi ini.</p>
              <button 
                  onClick={() => {
                      setIsGameOver(false);
                      setStudentHP(3);
                      setAiHP(100);
                      setStreak(0);
                      setCurrentItemIndex(0);
                      setSelectedAnswer('');
                      setQuizState('neutral');
                      setShowAiTutor(false); setInlineChatHistory([]); setInlineChatInput('');
                      playRetroSound('swoosh');
                  }}
                  style={{ padding: '1rem 2rem', background: '#ef4444', color: '#fff', borderRadius: '30px', fontSize: '1.2rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                  Coba Lagi
              </button>
              <button onClick={() => navigate(`/student/${classId}`)} style={{ marginTop: '1rem', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                  Kembali ke Skill Tree
              </button>
          </motion.div>
      )
  }

  if (isVictory) {
      return (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring' }} style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', textAlign: 'center', position: 'fixed', inset: 0, zIndex: 100, overflowY: 'auto', padding: '2rem' }}>
              <AiMascotInner artboardName="Animoji-Wizard" />
              <h1 style={{ fontSize: '3rem', color: 'var(--accent-green)', marginBottom: '1rem', zIndex: 2, marginTop: 'auto' }}>Node Cleared!</h1>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '2rem', zIndex: 2 }}>
                  Kerja bagus! Socratic AI berhasil kamu kalahkan.
              </p>
              <button 
                  onClick={() => navigate(`/student/${classId}`)}
                  style={{ padding: '1rem 3rem', background: 'var(--accent-green)', color: '#000', borderRadius: '30px', fontSize: '1.2rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', zIndex: 2, marginBottom: 'auto' }}
              >
                  Lanjut ke Peta
              </button>
          </motion.div>
      )
  }

  const HPRenderer = () => (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '0.9rem' }}>Murid</span>
          <div style={{ display: 'flex', gap: '0.2rem' }}>
              {[...Array(3)].map((_, i) => (
                  <span key={i} style={{ fontSize: '1.2rem', opacity: i < studentHP ? 1 : 0.3, transition: 'opacity 0.3s' }}>❤️</span>
              ))}
          </div>
      </div>
      
      <div className="boss-hp-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, justifyContent: 'flex-end', width: '100%', maxWidth: isMobile ? '100%' : '300px' }}>
          <span style={{ fontWeight: 'bold', color: '#eab308', fontSize: '0.9rem' }}>AI Boss</span>
          <div style={{ flex: 1, height: '10px', background: '#334155', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${aiHP}%`, height: '100%', background: '#eab308', transition: 'width 0.5s ease-out' }}></div>
          </div>
      </div>
    </>
  );

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
      <style>{`
        @keyframes pulse {
          0% { transform: translateX(-50%) scale(1); }
          100% { transform: translateX(-50%) scale(1.1); }
        }
        @keyframes shake-screen {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-10px, -10px) rotate(-1deg); }
          20% { transform: translate(10px, -10px) rotate(1deg); }
          30% { transform: translate(-10px, 10px) rotate(0deg); }
          40% { transform: translate(10px, 10px) rotate(1deg); }
          50% { transform: translate(-10px, -10px) rotate(-1deg); }
          60% { transform: translate(10px, -10px) rotate(0deg); }
          70% { transform: translate(-10px, 10px) rotate(-1deg); }
          80% { transform: translate(-10px, -10px) rotate(1deg); }
          90% { transform: translate(10px, -10px) rotate(0deg); }
        }
        @keyframes fadeInRed {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .shake-screen {
          animation: shake-screen 0.4s cubic-bezier(.36,.07,.19,.97) both infinite;
        }
        .attack-text {
          position: absolute;
          bottom: 20%;
          left: 50%;
          transform: translateX(-50%);
          color: #ef4444;
          font-size: 2rem;
          font-weight: 900;
          text-shadow: 0 4px 10px rgba(0,0,0,0.5);
          animation: pulse 0.5s infinite alternate;
          pointer-events: none;
          z-index: 10;
          text-align: center;
          width: 100%;
        }
        @media (max-width: 900px) {
          .attack-text {
            font-size: 1.5rem;
            bottom: 15%;
          }
        }
        .hp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          z-index: 10;
          width: 100%;
          box-sizing: border-box;
          margin: 0;
        }
        .hp-header.boss-header {
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .hp-header-content {
          display: flex;
          flex: 1;
          justify-content: space-between;
          align-items: center;
        }
        /* Menyembunyikan HP Panel secara default jika bukan Boss Mode */
        .mobile-hp-panel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          background: rgba(15, 23, 42, 0.5);
          padding: 0.5rem 1rem;
          border-radius: 30px;
        }

        /* Boss Mode Normal Layout (Glassmorphism) */
        .boss-mode {
          background-color: rgba(15, 23, 42, 0.9) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 24px !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          padding: 2.5rem !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5) !important;
        }
        
        .boss-mode h2 {
           color: #fcd34d !important;
        }

        /* Layout untuk Flex Centering and Sliding di Desktop */
        .quiz-content-wrapper {
          display: flex;
          justify-content: center;
          align-items: center; /* Changed from flex-start to perfectly center vertically */
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          min-height: calc(100vh - 100px); /* Fill the screen to perfectly center */
          position: relative;
          z-index: 10;
        }
        
        .ai-panel-wrapper {
          flex-shrink: 0;
          width: 400px;
          margin-left: 2rem;
        }

        .fill-blank-container {
          width: 100%;
          font-size: 1.2rem;
          padding: 1.5rem;
          background: #0f172a;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          text-align: left;
          line-height: 1.8;
          color: white;
          white-space: pre-wrap;
        }
        .boss-mode .fill-blank-container {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .blank-space {
          display: inline-block;
          min-width: 80px;
          height: 30px;
          border-bottom: 2px solid var(--accent-blue);
          margin: 0 10px;
          vertical-align: middle;
          text-align: center;
          font-weight: bold;
          color: var(--accent-yellow);
          cursor: pointer;
        }
        .word-bank-container {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
          margin-top: 2rem;
        }
        .word-block {
          background: #1e293b;
          border: 1px solid var(--accent-green);
          padding: 0.8rem 1.5rem;
          border-radius: 30px;
          cursor: pointer;
          font-weight: bold;
          color: white;
          transition: all 0.2s;
        }
        .word-block:hover {
          background: var(--accent-green);
          color: #000;
        }
        .word-block.selected {
          background: var(--accent-green);
          color: #000;
          transform: scale(1.05);
        }

        /* Portrait Warning for Boss Fight on Mobile */
        .portrait-warning {
          position: fixed;
          inset: 0;
          background: #0f172a;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          text-align: center;
          padding: 2rem;
        }
        .portrait-warning h2 {
          color: #ef4444;
          margin-bottom: 1rem;
        }

        @media (max-width: 900px) {
          .quiz-content-wrapper {
            flex-direction: column;
            align-items: center;
            padding: 1rem;
            padding-top: 4rem;
          }
          .quiz-content-wrapper.boss-wrapper {
            padding-top: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .ai-panel-wrapper {
            width: 100% !important;
            margin-left: 0 !important;
            margin-top: 2rem;
          }
          
          .quiz-card:not(.boss-mode) {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          
          .quiz-card.boss-mode {
            background-color: rgba(15, 23, 42, 0.9) !important;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding: 5rem 1.5rem 2rem 1.5rem !important; /* Clear header at the top */
            min-height: 100vh;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
            border: none !important;
            max-height: none !important; /* allow natural scrolling */
          }
          
          .quiz-card h2 {
            font-size: 1.3rem !important;
            margin-bottom: 1.5rem !important;
          }
          
          .fill-blank-container {
            font-size: 1.1rem;
            padding: 1rem;
          }
          
          .mobile-only {
            display: block !important;
          }
          
          .hp-header {
            padding: 0.5rem 1rem;
            background: transparent;
            border-bottom: none;
            position: absolute;
          }
          .hp-header-content {
            display: none !important;
          }
          .mobile-hp-panel {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            background: rgba(15, 23, 42, 0.5);
            padding: 0.5rem 1rem;
            border-radius: 30px;
          }
        }

        .x-button {
          background: transparent;
          color: var(--text-muted);
          border: none;
          cursor: pointer;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          transition: background 0.2s, color 0.2s;
        }
        .x-button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .streak-indicator {
          font-weight: bold;
          color: #eab308;
          display: flex;
          align-items: center;
          gap: 0.2rem;
          text-shadow: 0 0 10px rgba(234, 179, 8, 0.5);
        }
        
        .mobile-only { display: none; }
        .desktop-only { display: flex; }

        /* MOBILE RESPONSIVE TWEAKS */
        @media (max-width: 900px) {
          .mobile-only { display: flex; }
          .desktop-only { display: none; }
          
          .hp-header {
            padding: 0.5rem 1rem;
            background: transparent;
            border-bottom: none;
            position: absolute;
          }
          .hp-header-content {
            display: none !important;
          }
          .mobile-hp-panel {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          /* Pindahkan Streak ke Pojok Kanan di Mobile */
          .streak-indicator.mobile-only {
            position: absolute;
            top: 1rem;
            right: 1.5rem;
            z-index: 20;
          }

          .quiz-content-wrapper {
            flex-direction: column;
            align-items: center;
            padding: 1rem;
            padding-top: 4rem;
          }
          .ai-panel-wrapper {
            width: 100% !important;
            margin-left: 0 !important;
            margin-top: 2rem;
          }
        }
      `}</style>
        {isBossFightNode && !bossDefeated ? (
          <>
            <BossBackground riveRef={bossRiveRef} isWaitingForBossClick={isWaitingForBossClick} handleBossClick={handleBossClick} isShaking={isShaking || isBossDying} />
            {isBossDying && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 50, 
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              animation: 'fadeInRed 3s forwards',
              pointerEvents: 'none'
            }}></div>
          )}
        </>
      ) : (
        <div className="brilliant-bg"></div>
      )}

      {/* Landscape Warning Lock */}
      {isBossFightNode && isPortrait && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <span style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔄</span>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', lineHeight: '1.4' }}>Boss Fight butuh layar yang luas!</h2>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8' }}>Silakan putar HP kamu menjadi Landscape (mendatar) untuk melanjutkan pertempuran.</p>
        </div>
      )}
      
      <div className={`quiz-page ${(isShaking || isBossDying) ? "shake-screen" : ""}`} style={{ background: flashColor || 'transparent', transition: 'background 0.2s ease-out', padding: 0, pointerEvents: isBossFightNode ? 'none' : 'auto' }}>
        
        <div className={`hp-header ${isBossFightNode ? 'boss-header' : ''}`} style={{ position: 'relative', pointerEvents: 'auto' }}>
            <button className="x-button" onClick={() => navigate(`/student/${classId}`)} title="Tinggalkan Pertarungan">
                ✕
            </button>
            
            {/* PROGRESS (Tengah di Desktop & Mobile) */}
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                 {progressText}
               </span>
               {/* Streak di Desktop (Tengah) */}
               <AnimatePresence>
                 {streak > 0 && (
                   <motion.div 
                     initial={{ scale: 0, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     exit={{ scale: 0, opacity: 0 }}
                     className="streak-indicator desktop-only"
                   >
                     ⚡ {streak}
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {/* Streak di Mobile (Dipindah via CSS absolute relative to header) */}
            <AnimatePresence>
              {streak > 0 && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="streak-indicator mobile-only"
                >
                  ⚡ {streak}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="hp-header-content">
                <HPRenderer />
            </div>
        </div>

        <div className={`quiz-content-wrapper ${isBossFightNode ? 'boss-wrapper' : ''}`}>
            {isIceBreaking ? (
              <IceBreakingView 
                 currentItemIndex={currentItemIndex} 
                 isLastItem={isLastItem} 
                 handleNext={handleNext} 
                 handlePrev={handlePrev} 
                 submitQuizToApi={submitQuizToApi}
                 setIsVictory={setIsVictory}
              />
            ) : (
            <motion.div 
               layout
               initial={{ y: 50, opacity: 0 }}
               animate={{ 
                 y: (isWaitingForBossClick || isBossHitAnimating) ? 100 : 0, 
                 opacity: (isWaitingForBossClick || isBossHitAnimating) ? 0 : 1, 
                 x: isShaking ? [-10, 10, -10, 10, 0] : 0 
               }}
               transition={{ duration: isShaking ? 0.4 : 0.5, layout: { type: "spring", bounce: 0.2, duration: 0.6 } }}
               className={`quiz-card state-${isMateri ? 'neutral' : quizState} ${isBossFight ? 'boss-mode' : ''}`}
               style={{ width: '100%', maxWidth: '800px', pointerEvents: (isWaitingForBossClick || isBossHitAnimating) ? 'none' : 'auto' }}
            >
              <h2 style={{ color: 'var(--text-main)', marginBottom: '2rem', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                {isMateri ? node.title : (isFillInTheBlank ? "Lengkapi bagian yang rumpang." : "Uji Pemahaman")}
              </h2>

              {/* VIDEO */}
              {currentItem.quiz?.video && (
                <div className="media-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                  {currentItem.quiz.video.includes('youtube') || currentItem.quiz.video.includes('youtu.be') ? (
                    <iframe
                      width="100%"
                      height="350"
                      src={getEmbedUrl(currentItem.quiz.video)}
                      title="Video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
                    ></iframe>
                  ) : (
                    <video 
                      controls 
                      style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
                      src={currentItem.quiz.video}
                    />
                  )}
                </div>
              )}

              {(currentItem.quiz?.media || currentItem.media) && (
                <div className="media-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                  <img src={currentItem.quiz?.media || currentItem.media} alt="Ilustrasi" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} />
                </div>
              )}

              {currentItem.quiz?.type === 'auditory' && currentItem.quiz?.audio && (
                <div className="media-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                  <audio 
                    controls 
                    src={currentItem.quiz.audio} 
                    style={{ width: '100%', maxWidth: '400px', borderRadius: '30px' }} 
                    onPlay={() => setIsPlayingAudio(true)}
                    onPause={() => setIsPlayingAudio(false)}
                    onEnded={() => setIsPlayingAudio(false)}
                  />
                  <AnimatePresence>
                    {isPlayingAudio && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 150 }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden', marginTop: '1rem' }}
                      >
                        <AiMascotInner artboardName="animoji-playback" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              
              {isMateri ? (
                <>
                  <div style={{ fontSize: '1.1rem', lineHeight: '1.8', whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>
                    {currentItem.content}
                  </div>
                  {currentItem.quiz?.link && (
                    <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                      <a href={currentItem.quiz.link.startsWith('http') ? currentItem.quiz.link : `https://${currentItem.quiz.link}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-green)', color: '#000', padding: '0.8rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}>
                        Lihat Tautan Tambahan ➔
                      </a>
                    </div>
                  )}
                </>
              ) : isEmptyQuiz ? (
                <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '12px', marginTop: '2rem' }}>
                  <h3 style={{ color: '#eab308', marginBottom: '1rem', fontSize: '1.2rem' }}>Materi Sedang Disiapkan</h3>
                  <p style={{ color: 'var(--text-main)', lineHeight: '1.6', fontSize: '1rem' }}>
                    Belum ada soal kuis yang ditambahkan oleh guru untuk bagian ini.<br/>
                    Silakan lanjut ke materi berikutnya!
                  </p>
                </div>
              ) : (
                <>
                  {!isFillInTheBlank && (
                    <div className="question-container fill-blank-container" style={{ marginBottom: '2rem' }}>
                      {currentItem.quiz?.question}
                    </div>
                  )}

                  {isFillInTheBlank && (
                    <div className="question-container">
                       {renderQuestionText()}
                    </div>
                  )}

                  {isFillInTheBlank ? (
                    <motion.div 
                      initial="hidden" animate="show"
                      variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
                      className="options-container word-bank-container"
                      style={{ marginTop: '2rem' }}
                    >
                      {currentItem.quiz?.options?.filter(Boolean).map((opt, i) => (
                        <motion.button 
                          variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1 } }}
                          key={i}
                          className={`word-block ${selectedAnswer === opt ? 'selected' : ''}`}
                          onClick={() => handleOptionSelect(opt)}
                        >
                          {opt}
                        </motion.button>
                      ))}
                    </motion.div>
                  ) : (
                <motion.div 
                   initial="hidden" animate="show"
                   variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
                   className="options-container word-bank-container"
                   style={{ marginTop: '2rem' }}
                >
                  {currentItem.quiz?.options?.filter(Boolean).map((opt, i) => (
                    <motion.button 
                      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                      key={i}
                      className={`word-block ${selectedAnswer === opt ? 'selected' : ''}`}
                      onClick={() => handleOptionSelect(opt)}
                    >
                      {opt}
                    </motion.button>
                  ))}
                </motion.div>
              )}
                </>
              )}

              <div className="button-container" style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {currentItemIndex > 0 && (
                  <button 
                    onClick={handlePrev}
                    style={{ 
                      padding: '1rem 2rem', background: 'transparent', color: 'var(--text-main)', 
                      border: '1px solid rgba(255,255,255,0.2)', borderRadius: '30px', fontWeight: 'bold', 
                      cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.3s' 
                    }}
                  >
                    Kembali
                  </button>
                )}
                {isMateri || quizState === 'correct' || isEmptyQuiz ? (
                  <button 
                    onClick={handleNext}
                    style={{ 
                      width: '100%', maxWidth: '300px', padding: '1rem', background: 'var(--accent-green)', 
                      color: '#000', border: 'none', borderRadius: '30px', fontWeight: 'bold', 
                      cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.3s'
                    }}
                  >
                    {isLastItem ? 'Akhiri Pertarungan' : 'Lanjut'}
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmit}
                    disabled={!selectedAnswer}
                    style={{ 
                      width: '100%', maxWidth: '300px', padding: '1rem', 
                      background: selectedAnswer ? (quizState === 'wrong' ? '#eab308' : 'var(--accent-green)') : 'var(--border-color)', 
                      color: selectedAnswer ? '#000' : 'var(--text-muted)', 
                      border: 'none', borderRadius: '30px', fontWeight: 'bold', 
                      cursor: selectedAnswer ? 'pointer' : 'not-allowed', 
                      fontSize: '1.1rem', transition: 'all 0.3s'
                    }}
                  >
                    {quizState === 'wrong' ? 'Serang Balik' : 'Serang'}
                  </button>
                )}
              </div>
            </motion.div>
            )}

            {/* AI TUTOR PANEL (Samping Kanan, Masuk dari luar layar) */}
            <AnimatePresence>
            {!isMateri && showAiTutor && (
              <motion.div 
                  layout
                  initial={{ opacity: 0, x: 50, width: 0, marginLeft: 0 }}
                  animate={{ opacity: 1, x: 0, width: window.innerWidth > 900 ? '400px' : '100%', marginLeft: window.innerWidth > 900 ? '2rem' : 0 }}
                  exit={{ opacity: 0, x: 50, width: 0, marginLeft: 0 }}
                  transition={{ layout: { type: "spring", bounce: 0.2, duration: 0.6 } }}
                  className="ai-panel-wrapper"
                  style={{ pointerEvents: 'auto' }}
                  ref={aiTutorRef}
              >
                <div className="glass-panel" style={{ padding: '2rem', border: `1px solid ${quizState === 'correct' ? 'var(--accent-green)' : '#eab308'}`, background: isBossFightNode ? 'rgba(15, 23, 42, 0.9)' : '#0f172a', backdropFilter: isBossFightNode ? 'blur(12px)' : 'none', WebkitBackdropFilter: isBossFightNode ? 'blur(12px)' : 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', width: '100%' }}>
                  
                  <div className="mobile-hp-panel">
                     <HPRenderer />
                  </div>

                  <AiMascot quizState={quizState} />

                  <h3 style={{ color: quizState === 'correct' ? 'var(--accent-green)' : '#eab308', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', justifyContent: 'center' }}>
                    {quizState === 'correct' ? "Sempurna!" : "Serangan Balik AI"}
                  </h3>

                  <div style={{ color: 'var(--text-main)', lineHeight: '1.6', fontSize: '1.05rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="no-scrollbar">
                    {isLoadingAi && inlineChatHistory.length === 0 ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#eab308' }}>
                        <div className="dot-pulse"></div> Berpikir...
                      </div>
                    ) : (
                      inlineChatHistory.map((msg, idx) => (
                        <div key={idx} style={{ 
                          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          background: msg.role === 'user' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                          color: msg.role === 'user' ? 'white' : (quizState === 'correct' ? 'var(--accent-green)' : 'rgba(255,255,255,0.9)'),
                          padding: '0.8rem 1rem',
                          borderRadius: '12px',
                          borderTopRightRadius: msg.role === 'user' ? '4px' : '12px',
                          borderTopLeftRadius: msg.role === 'user' ? '12px' : '4px',
                          maxWidth: '90%',
                          fontSize: '0.95rem'
                        }}>
                          {msg.role === 'user' ? msg.content : parseInlineMessage(msg.content)}
                        </div>
                      ))
                    )}
                    {isInlineChatTyping && (
                      <div style={{ alignSelf: 'flex-start', color: '#eab308', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontStyle: 'italic' }}>
                        <div className="dot-pulse"></div> AI membalas...
                      </div>
                    )}
                  </div>
                  
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleInlineChatSend(inlineChatInput); }}
                    style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}
                  >
                    <input 
                      type="text" 
                      value={inlineChatInput}
                      onChange={(e) => setInlineChatInput(e.target.value)}
                      placeholder="Tanya soal ini..."
                      disabled={isInlineChatTyping || isLoadingAi}
                      style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', padding: '0.6rem 1rem', borderRadius: '30px', outline: 'none', fontSize: '0.9rem' }}
                    />
                    <button 
                      type="submit"
                      disabled={!inlineChatInput.trim() || isInlineChatTyping || isLoadingAi}
                      style={{ width: '38px', height: '38px', borderRadius: '50%', background: inlineChatInput.trim() && !isInlineChatTyping ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', cursor: inlineChatInput.trim() && !isInlineChatTyping ? 'pointer' : 'not-allowed' }}
                    >
                      <Send size={16} style={{ transform: 'translateX(2px)' }} />
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
        </div>

        {/* Floating AI Button for Student */}
        {(!isIceBreaking && currentItem.quiz?.type !== 'auditory' && isMateri) && (
          <button 
             onClick={() => setShowStudentAI(true)}
             style={{ 
               position: 'fixed', 
               bottom: '2rem', 
               right: '2rem', 
               background: 'linear-gradient(135deg, var(--accent-green), #3b82f6)', 
               color: '#000', 
               border: 'none', 
               borderRadius: '50px', 
               padding: isMobile ? '1rem' : '1rem 1.5rem', 
               display: 'flex', 
               alignItems: 'center', 
               gap: '0.5rem', 
               fontWeight: 'bold',
               boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
               cursor: 'pointer',
               zIndex: 99
             }}
          >
             <Sparkles size={20} />
             {!isMobile && "Tanya AI"}
          </button>
        )}

        {showStudentAI && (
          <StudentAIAssistantModal 
            onClose={() => setShowStudentAI(false)}
            currentItem={currentItem}
            quizState={quizState}
            studentName={user?.nama || "Siswa"} 
          />
        )}
      </div>
    </div>
  );
}


