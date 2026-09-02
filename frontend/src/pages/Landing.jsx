import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useRive } from '@rive-app/react-canvas';
import { 
  BarChart3, Eye, MessageSquare, ArrowRight, Brain, Leaf, Bot, TrendingUp, AlertTriangle, MonitorX, Lightbulb,
  Network, Wand2, ShieldAlert, BrainCircuit
} from 'lucide-react';
import { 
  ReactFlow, 
  Background, 
  Handle, 
  Position, 
  useNodesState, 
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  Controls,
  addEdge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css'; 

import Navbar from '../components/Navbar'; // <-- IMPORT NAVBAR

const NODES_DATA = [
  { 
    id: 'analytics', 
    label: 'Analisis Nilai', 
    icon: 'analytics', 
    color: '#10B981', 
    outputHeader: 'Menganalisis 40 siswa...',
    outputLines: [
      { icon: <TrendingUp size={16} />, text: 'Rata-rata kelas: 82' },
      { icon: <AlertTriangle size={16} className="text-yellow-500" />, text: 'Ditemukan 5 siswa butuh pengayaan di materi Aljabar.' }
    ]
  },
  { 
    id: 'cheat', 
    label: 'Deteksi Nyontek', 
    icon: 'cheat', 
    color: '#EF4444', 
    outputHeader: 'Memindai aktivitas ujian...',
    outputLines: [
      { icon: <MonitorX size={16} />, text: 'PERINGATAN: 2 siswa terdeteksi berpindah tab (Alt-Tab) selama kuis berlangsung.' }
    ]
  },
  { 
    id: 'ai', 
    label: 'Mode Tanya AI', 
    icon: 'ai', 
    color: '#3B82F6', 
    outputHeader: 'Siswa bertanya: "Rumus Pythagoras apa ya?"',
    outputLines: [
      { icon: <Lightbulb size={16} />, text: 'Hint: Coba ingat kembali hubungan antara sisi miring (hipotenusa) dengan dua sisi siku-sikunya.' }
    ]
  }
];

const FEATURES_DATA = [
  {
    icon: <Network size={32} color="#10B981" />,
    title: 'Curriculum as a Skill Tree',
    desc: 'Tinggalkan modul belajar linier yang membosankan. Biarkan siswa membuka materi bagaikan game melalui sistem percabangan Skill Tree.',
    colorA: '#10B981', colorB: '#059669' // Emerald
  },
  {
    icon: <Wand2 size={32} color="#3B82F6" />,
    title: 'Auto-Generate Curriculum',
    desc: 'Guru tidak perlu pusing membuat Skill Tree dari nol. AI kami merancang struktur kurikulum satu semester hanya dalam hitungan detik.',
    colorA: '#3B82F6', colorB: '#1D4ED8' // Blue
  },
  {
    icon: <MessageSquare size={32} color="#F59E0B" />,
    title: 'Dual AI Assistant',
    desc: 'Asisten pintar yang stand-by membimbing murid saat kesulitan teori, dan memberikan insight analisis data sentral kepada guru.',
    colorA: '#F59E0B', colorB: '#B45309' // Amber
  },
  {
    icon: <ShieldAlert size={32} color="#EF4444" />,
    title: 'Smart Anti-Cheat System',
    desc: 'Mode ujian terintegrasi dengan deteksi kecurangan otomatis yang merekam aktivitas Alt-Tab atau hilangnya fokus layar.',
    colorA: '#EF4444', colorB: '#B91C1C' // Red
  }
];

// --- VARIAN ANIMASI CARD DARI REFERENSI USER ---
const cardVariants = {
  offscreen: { y: 300 },
  onscreen: {
    y: 40,
    rotate: -10,
    transition: { type: "spring", bounce: 0.4, duration: 0.8 }
  }
};

// --- KOMPONEN FITUR ZIG-ZAG ---
const AnimatedFeatureRow = ({ feature, index }) => {
  const isReversed = index % 2 !== 0;

  return (
    <div className="feature-row" style={{
      display: 'flex',
      flexDirection: isReversed ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: '4rem',
      marginBottom: '6rem',
    }}>
      {/* TEXT SIDE */}
      <div className="feature-text-side" style={{
        flex: 1,
        padding: '3rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        <h3 className="feature-title" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', color: '#fff', marginBottom: '1rem', fontWeight: 'bold' }}>
          {feature.title}
        </h3>
        <p className="feature-desc" style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.6' }}>
          {feature.desc}
        </p>
      </div>

      {/* ANIMATION SIDE (TEKNIK MASKING OVERFLOW USER) */}
      <motion.div
        className="feature-anim-side"
        initial="offscreen"
        whileInView="onscreen"
        viewport={{ once: false, amount: 0.5 }}
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          position: 'relative',
          height: '400px',
          width: '100%',
          overflow: 'hidden', // KUNCI UTAMA: Sembunyi di dalam batas div ini
          borderRadius: '24px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Decorative Pocket (Splash) di bagian bawah */}
        <div className="feature-pocket" style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '150px',
          background: `linear-gradient(135deg, ${feature.colorA}, ${feature.colorB})`,
          clipPath: 'polygon(0 30%, 100% 0, 100% 100%, 0% 100%)', // Slanted cut agar responsif
          zIndex: 2,
        }} />

        {/* Card yang meloncat keluar */}
        <motion.div
          className="feature-popup"
          variants={cardVariants}
          style={{
            width: '220px',
            height: '320px',
            background: '#fff',
            borderRadius: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
            transformOrigin: '10% 60%',
            zIndex: 1
          }}
        >
          {React.cloneElement(feature.icon, { size: 100 })}
        </motion.div>
      </motion.div>
    </div>
  );
};

// --- HELPER COMPONENT UNTUK RESIZE OTOMATIS ---
const FlowResizer = () => {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const handleResize = () => {
      fitView({ padding: 0.2, duration: 300 });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitView]);
  return null;
};

// --- CUSTOM NODES UNTUK REACT FLOW ---

const FeatureNode = ({ data, selected }) => {
  const IconRender = () => {
    if (data.icon === 'analytics') return <BarChart3 size={18} />;
    if (data.icon === 'cheat') return <Eye size={18} />;
    if (data.icon === 'ai') return <MessageSquare size={18} />;
    return null;
  };

  return (
    <div className="feature-node-container" style={{
      background: selected ? `${data.color}22` : 'var(--bg-card)',
      border: `2px solid ${selected ? data.color : 'var(--border-color)'}`,
      padding: '12px 20px',
        borderRadius: '12px',
      color: selected ? data.color : 'var(--text-main)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      boxShadow: selected ? `0 0 20px ${data.color}44` : '0 4px 6px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      width: '200px',
      touchAction: 'none'
    }}>
      <div className="feature-node-icon" style={{ display: 'flex', alignItems: 'center' }}>
        <IconRender />
      </div>
      <span className="feature-node-text" style={{ fontWeight: 'bold', fontSize: '11px', lineHeight: '1.2' }}>{data.label}</span>
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ 
          background: data.color, 
          width: '16px', 
          height: '16px', 
          border: `4px solid ${selected ? `${data.color}22` : 'var(--bg-card)'}`, 
          right: '-8px',
          zIndex: 100 
        }} 
      />
    </div>
  );
};

const OctopusNode = ({ data }) => {
  const { rive, RiveComponent } = useRive({
    src: `${import.meta.env.BASE_URL}assets/4974-10065-octopus-loop.riv`,
    animations: 'Idle',
    autoplay: true,
  });

  return (
    <div style={{ 
      position: 'relative', 
      width: '200px', 
      height: '200px',
      background: 'rgba(30, 41, 59, 0.4)',
      backdropFilter: 'blur(10px)',
      border: `2px solid ${data.activeColor || 'rgba(255,255,255,0.1)'}`,
      borderRadius: '24px',
      boxShadow: data.activeColor ? `0 0 30px ${data.activeColor}44` : 'none',
      transition: 'all 0.4s ease',
      overflow: 'hidden',
      touchAction: 'none'
    }}>
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ 
          background: 'rgba(255,255,255,0.1)', 
          border: '3px solid rgba(30, 41, 59, 0.8)', 
          width: '18px', 
          height: '18px', 
          left: '-9px', 
          zIndex: 100 
        }} 
      />
      
      <div style={{ 
        width: '100%', 
        height: '100%', 
        mixBlendMode: 'screen', 
      }}>
        <RiveComponent style={{ width: '200px', height: '200px' }} />
      </div>
    </div>
  );
};

const nodeTypes = {
  featureNode: FeatureNode,
  octopusNode: OctopusNode
};

// --- KOMPONEN UTAMA ---

// --- DATA CARA KERJA ---
const HOW_IT_WORKS_DATA = [
  {
    step: '01',
    title: 'Mapping (Fase Guru)',
    desc: 'Guru memasukkan silabus atau tujuan pembelajaran. AI FlacTopus otomatis memecah dan memetakannya menjadi sistem percabangan Skill Tree yang saling terhubung.',
    color: '#3B82F6' // Blue
  },
  {
    step: '02',
    title: 'Exploring (Fase Murid)',
    desc: 'Siswa mulai belajar dari materi dasar (Root Node). Mereka harus menyelesaikan kuis atau misi untuk membuka (Unlock) materi cabang selanjutnya layaknya sebuah game.',
    color: '#10B981' // Green
  },
  {
    step: '03',
    title: 'Analyzing (Fase Sistem)',
    desc: 'Selama ujian, Smart Anti-Cheat aktif mengawasi layar. Sistem memberikan analitik instan ke dashboard guru untuk melihat Node materi mana yang paling sulit dipahami kelas.',
    color: '#F59E0B' // Amber
  }
];

const HowItWorksSection = () => {
  const containerRef = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 80%", "end 60%"]
  });

  return (
    <div ref={containerRef} style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 1rem 5rem' }}>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: '8rem' }}
      >
        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: '900', color: '#fff' }}>
          Mekanisme <span style={{ color: 'var(--accent-green)' }}>Sistem</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: '1rem', maxWidth: '600px', margin: '1rem auto 0' }}>
          Tiga langkah sederhana mengubah kelas tradisional menjadi ekosistem interaktif.
        </p>
      </motion.div>

      <div style={{ position: 'relative', paddingLeft: '1rem' }}>
        {/* BACKGROUND LINE */}
        <div style={{ position: 'absolute', left: '28px', top: '20px', bottom: '20px', width: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
        
        {/* GLOWING LASER LINE */}
        <motion.div style={{
          position: 'absolute', left: '28px', top: '20px', bottom: '20px', width: '4px',
          background: 'linear-gradient(to bottom, #3B82F6, #10B981, #F59E0B)',
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
          borderRadius: '4px',
          scaleY: scrollYProgress,
          transformOrigin: 'top'
        }} />

        {HOW_IT_WORKS_DATA.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '3rem', position: 'relative', marginBottom: idx !== HOW_IT_WORKS_DATA.length -1 ? '8rem' : 0 }}>
            
            {/* BULLET DOT CONTAINER */}
            <div style={{ position: 'relative', zIndex: 2, paddingTop: '10px' }}>
              <motion.div
                initial={{ scale: 0, borderColor: 'rgba(255,255,255,0.1)', background: 'var(--bg-card)' }}
                whileInView={{ scale: 1, borderColor: item.color, background: item.color }}
                viewport={{ margin: "-40% 0px -40% 0px" }}
                transition={{ duration: 0.4 }}
                style={{
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  border: '6px solid var(--bg-card)',
                  boxShadow: '0 0 0 4px rgba(255,255,255,0.1)',
                }}
              />
            </div>

            {/* CARD CONTENT */}
            <motion.div
              className="hiw-card"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ margin: "-30% 0px -30% 0px" }}
              transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
              style={{
                flex: 1,
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '24px',
                padding: '3rem',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute', top: '-1rem', right: '1rem',
                fontSize: '8rem', fontWeight: '900', color: 'rgba(255,255,255,0.03)',
                lineHeight: 1, userSelect: 'none'
              }}>
                {item.step}
              </div>
              
              <h3 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', color: '#fff', marginBottom: '1rem', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: '1.7', position: 'relative', zIndex: 1 }}>
                {item.desc}
              </p>
            </motion.div>
          </div>
        ))}
      </div>
      
      <style>{`
        @media (max-width: 768px) {
          .hiw-card { padding: 2rem !important; }
        }
      `}</style>
    </div>
  );
};

// --- KOMPONEN PLAYGROUND TECH STACK ---
const PlaygroundNode = ({ data }) => {
  return (
    <div style={{ 
      width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', 
      background: 'rgba(30, 41, 59, 0.9)', 
      border: '2px solid ' + (data.color || 'var(--accent-green)'), 
      borderRadius: '50%', 
      color: '#fff', 
      fontWeight: 'bold',
      fontSize: '11px', lineHeight: '1.2', 
      textAlign: 'center', 
       
      boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(10px)'
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#fff', width: '10px', height: '10px' }} />
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ background: '#fff', width: '10px', height: '10px' }} />
    </div>
  );
};

const initialPlaygroundNodes = [
  { id: '1', type: 'playground', position: { x: 200, y: 50 }, data: { label: 'Dasar Pemrograman', color: '#10B981' } },
  { id: '2', type: 'playground', position: { x: 50, y: 200 }, data: { label: 'Struktur Data', color: '#3B82F6' } },
  { id: '3', type: 'playground', position: { x: 350, y: 200 }, data: { label: 'Algoritma', color: '#F59E0B' } },
];
const initialPlaygroundEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#10B981', strokeWidth: 2 } }
];
const playgroundNodeTypes = { playground: PlaygroundNode };

const TechStackSection = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialPlaygroundNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialPlaygroundEdges);
  const onConnect = React.useCallback((params) => setEdges((eds) => addEdge({...params, animated: true, style: { stroke: 'var(--accent-green)', strokeWidth: 2 }}, eds)), [setEdges]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '5rem 1rem 10rem', position: 'relative' }}>
      <div className="tech-stack-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
        
        {/* TEXT SIDE */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          style={{ flex: '1 1 400px' }}
        >
          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: '900', color: '#fff', marginBottom: '1.5rem' }}>
            Keunggulan <span style={{ color: 'var(--accent-green)' }}>Teknis</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '2rem' }}>
            Dibangun dengan *stack* modern untuk performa tinggi. Juri dapat langsung menguji fleksibilitas mesin <b>Skill Tree</b> interaktif kami di sebelah. Coba tarik garis antar titik!
          </p>
          
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: '#fff' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px', borderRadius: '50%' }}><Network size={28} color="#3B82F6" /></div>
              <div><b style={{ fontSize: '1.2rem' }}>React Flow Engine</b><br/><span style={{ color: 'var(--text-muted)' }}>Interactive node-based UI map</span></div>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: '#fff' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px', borderRadius: '50%' }}><Wand2 size={28} color="#10B981" /></div>
              <div><b style={{ fontSize: '1.2rem' }}>Framer Motion</b><br/><span style={{ color: 'var(--text-muted)' }}>60fps hardware-accelerated animations</span></div>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: '#fff' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '12px', borderRadius: '50%' }}><BrainCircuit size={28} color="#F59E0B" /></div>
              <div><b style={{ fontSize: '1.2rem' }}>AI Logic Prompting</b><br/><span style={{ color: 'var(--text-muted)' }}>Smart curriculum generation algorithm</span></div>
            </li>
          </ul>
        </motion.div>

        {/* INTERACTIVE CANVAS SIDE */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          style={{ flex: '1 1 500px', maxWidth: '100%', minWidth: '250px', height: '500px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
        >
          <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>Skill Tree Playground</span>
            <span style={{ color: 'var(--accent-green)', fontSize: '0.85rem' }}>● Drag, Connect, or Backspace</span>
          </div>
          <div style={{ height: 'calc(100% - 58px)' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={playgroundNodeTypes}
              fitView
              attributionPosition="bottom-right"
            >
              <Background color="#fff" gap={20} size={1} opacity={0.05} />
              <Controls style={{ filter: 'invert(90%) hue-rotate(180deg)' }} />
            </ReactFlow>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

// --- KOMPONEN FOOTER PENUTUP ---
const Footer = () => (
  <footer style={{ background: '#0B1121', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '5rem 1rem 2rem', marginTop: '6rem' }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '4rem', justifyContent: 'space-between' }}>
      
      {/* Kolom Brand */}
      <div style={{ flex: '1 1 300px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.2rem' }}>
          <img src={import.meta.env.BASE_URL + "assets/flactopus-logo.png"} alt="FlacTopus Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>Flac<span style={{ color: 'var(--accent-green)' }}>Topus</span></span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '350px', lineHeight: '1.6' }}>
          Platform manajemen kelas dan kurikulum berbasis <b>Skill Tree</b>. Mari ciptakan ekosistem belajar yang interaktif dan menyenangkan dengan bantuan AI.
        </p>
      </div>

      {/* Kolom Tech Stack */}
      <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.8rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <b style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '0.3rem' }}>Powered By Open Source</b>
        <a href="https://reactflow.dev/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>React Flow (Node UI)</a>
        <a href="https://motion.dev/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Framer Motion (Animations)</a>
        <a href="https://rive.app/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Rive (Interactive Assets)</a>
        <a href="https://recharts.github.io/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Recharts (Data Viz)</a>
        <a href="https://particles.js.org/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>tsParticles (Effects)</a>
        <a href="https://mozilla.github.io/pdf.js/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>PDF.js (Doc Reader)</a>
        <a href="https://lucide.dev/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Lucide Icons</a>
      </div>

      {/* Kolom Asset Rive */}
      <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '0.8rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <b style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '0.3rem' }}>Rive Assets (CC BY 4.0)</b>
        <a href="https://rive.app/community/files/4974-10065-octopus-loop/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
          &bull; Octopus Loop by <span style={{ color: 'var(--accent-green)' }}>pedroalpera</span>
        </a>
        <a href="https://rive.app/marketplace/16938-41043-smiley-stress-reliever/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
          &bull; Smiley Stress Reliever by <span style={{ color: 'var(--accent-green)' }}>jodunson</span>
        </a>
        <a href="https://rive.app/marketplace/27832-52591-animojis/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
          &bull; Animojis by <span style={{ color: 'var(--accent-green)' }}>very_true_story</span>
        </a>
      </div>
    </div>

    {/* Copyright */}
    <div style={{ maxWidth: '1200px', margin: '4rem auto 0', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      &copy; 2026 FlacTopus AI. All rights reserved.
    </div>
  </footer>
);

export default function Landing() {
  const navigate = useNavigate();
  const [activeNodeId, setActiveNodeId] = useState(null);

  const initialNodes = [
    { id: 'analytics', type: 'featureNode', position: { x: 0, y: 30 }, data: { ...NODES_DATA[0] }, style: { touchAction: 'none' } },
    { id: 'cheat', type: 'featureNode', position: { x: 0, y: 130 }, data: { ...NODES_DATA[1] }, style: { touchAction: 'none' } },
    { id: 'ai', type: 'featureNode', position: { x: 0, y: 230 }, data: { ...NODES_DATA[2] }, style: { touchAction: 'none' } },
    { id: 'octopus', type: 'octopusNode', position: { x: 300, y: 60 }, data: { activeColor: null }, draggable: true, style: { touchAction: 'none' } }
  ];

  const initialEdges = [
    { id: 'e-analytics', source: 'analytics', target: 'octopus', animated: false, style: { stroke: '#334155', strokeWidth: 2 }, focusable: false, interactionWidth: 0 },
    { id: 'e-cheat', source: 'cheat', target: 'octopus', animated: false, style: { stroke: '#334155', strokeWidth: 2 }, focusable: false, interactionWidth: 0 },
    { id: 'e-ai', source: 'ai', target: 'octopus', animated: false, style: { stroke: '#334155', strokeWidth: 2 }, focusable: false, interactionWidth: 0 },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setEdges((eds) => eds.map(edge => {
      const isTarget = edge.source === activeNodeId;
      const color = isTarget ? NODES_DATA.find(n => n.id === activeNodeId)?.color : '#334155';
      return {
        ...edge,
        animated: isTarget,
        style: { stroke: color, strokeWidth: isTarget ? 3 : 2 },
      };
    }));

    setNodes((nds) => nds.map(node => {
      if (node.id === 'octopus') {
        return { 
          ...node, 
          data: { ...node.data, activeColor: activeNodeId ? NODES_DATA.find(n => n.id === activeNodeId)?.color : null } 
        };
      }
      if (node.type === 'featureNode') {
        return { ...node, selected: node.id === activeNodeId };
      }
      return node;
    }));
  }, [activeNodeId, setEdges, setNodes]);

  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'featureNode') {
      setActiveNodeId(node.id);
    }
  }, []);

  const activeColor = activeNodeId ? NODES_DATA.find(n => n.id === activeNodeId)?.color : 'rgba(16, 185, 129, 0.2)';
  const activeNodeData = activeNodeId ? NODES_DATA.find(n => n.id === activeNodeId) : null;

  return (
    <div style={{ backgroundColor: 'var(--bg-dark)', position: 'relative', overflowX: 'hidden' }}>
      <Navbar />

      <style>{`
        /* FIX TOTAL UNTUK TOUCH DRAG REACT FLOW */
        .react-flow__node {
          touch-action: none !important;
        }
        
        @media (max-width: 768px) {
          .feature-node-text { display: none !important; }
          .feature-node-container { 
            width: 72px !important; 
            height: 72px !important; 
            padding: 0 !important; 
            justify-content: center !important; 
            border-radius: 20px !important;
          }
          .feature-node-icon svg { width: 36px !important; height: 36px !important; stroke-width: 2.2 !important; }
        }
      `}</style>

      {/* ================= HERO SECTION ================= */}
      <div style={{ minHeight: '100vh', position: 'relative', paddingTop: '8rem', paddingBottom: '4rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
        
        {/* Background Ambient Glow */}
        <motion.div 
          animate={{ background: `radial-gradient(circle, ${activeColor}1A 0%, transparent 60%)` }}
          transition={{ duration: 0.8 }}
          style={{
            position: 'absolute', width: '100vw', height: '100vw', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', filter: 'blur(80px)', zIndex: 0, pointerEvents: 'none'
          }}
        />

        {/* Main Content Wrapper */}
        <div style={{
          position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', display: 'flex',
          flexWrap: 'wrap', gap: '3rem', alignItems: 'center', justifyContent: 'space-between'
        }}>
          
          {/* LEFT COLUMN - TEXT */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ flex: '1 1 400px', minWidth: '300px' }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.5rem 1rem', borderRadius: '50px', marginBottom: '1.5rem', color: 'var(--accent-green)' }}>
              <Leaf size={16} />
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>OSCAR 3.0 Web Dev</span>
            </div>
            
            <h1 style={{ 
              fontSize: 'clamp(3rem, 6vw, 4.5rem)', fontWeight: '900', lineHeight: '1.1', marginBottom: '1.5rem',
              background: 'linear-gradient(to right, #fff, var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Eksplorasi Belajar <br/>
              Bersama <span style={{ color: 'var(--accent-green)', background: 'none', WebkitTextFillColor: 'var(--accent-green)' }}>FlacTopus AI</span>
            </h1>
            
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: '1.6', maxWidth: '500px' }}>
              Bukan sekadar platform ujian biasa. Rasakan pengalaman manajemen kelas berbasis <b>Skill Tree</b>. Dapatkan analisis instan, deteksi kecurangan otomatis, dan asisten AI pintar.
            </p>

            <button 
              onClick={() => navigate('/login')} className="btn-primary"
              style={{
                padding: '1rem 2rem', fontSize: '1.1rem', fontWeight: 'bold', background: 'var(--accent-green)', color: '#000',
                border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)', transition: 'all 0.3s'
              }}
            >
              Mulai Ekspedisi <ArrowRight size={20} />
            </button>
          </motion.div>

          {/* RIGHT COLUMN - REACT FLOW PLAYGROUND & OUTPUT */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
            style={{ flex: '1 1 550px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            {/* React Flow Container */}
            <div style={{ 
              height: '450px', width: '100%', position: 'relative', borderRadius: '20px', overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.15)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)'
            }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px', zIndex: 0, opacity: 0.5 }} />
              
              <ReactFlowProvider>
                <FlowResizer />
                <ReactFlow
                  nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={onNodeClick}
                  nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }}
                  zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false} panOnScroll={false} panOnDrag={false} 
                  preventScrolling={false} autoPanOnNodeDrag={false} nodesDraggable={true} elementsSelectable={false} elevateEdgesOnSelect={false}
                  proOptions={{ hideAttribution: true }} 
                />
              </ReactFlowProvider>
            </div>

            {/* Output Card */}
            <motion.div
              layout
              style={{
                background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${activeColor}`, borderRadius: '16px', padding: '1.5rem', minHeight: '140px',
                boxShadow: activeNodeId ? `0 10px 40px ${activeColor}22` : 'none', transition: 'all 0.5s ease', position: 'relative', zIndex: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: activeColor, transition: 'color 0.5s ease' }}>
                <Brain size={16} />
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {activeNodeId ? `Processing: ${activeNodeData.label}` : 'System Output'}
                </span>
              </div>
              
              <div style={{ minHeight: '60px' }}>
                <AnimatePresence mode="wait">
                  {!activeNodeId ? (
                    <motion.p 
                      key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ color: 'var(--text-muted)', fontFamily: 'monospace', margin: 0 }}
                    >
                      Hubungkan atau klik salah satu node data di layar untuk melihat simulasi pemrosesan AI FlacTopus...
                    </motion.p>
                  ) : (
                    <motion.div 
                      key={activeNodeId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
                      style={{ fontFamily: 'monospace', color: 'var(--text-main)', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                    >
                      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                        <Bot size={18} style={{ color: activeColor, marginTop: '2px' }} />
                        <div>
                          <span style={{ fontWeight: 'bold', color: activeColor }}>FlacTopus:</span>
                          <p style={{ margin: '0.3rem 0 0 0' }}>{activeNodeData.outputHeader}</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '2rem' }}>
                        {activeNodeData.outputLines.map((line, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                            <span style={{ opacity: 0.8 }}>{line.icon}</span>
                            <span>{line.text}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ================= FEATURES SECTION (Masking Overflow ZigZag) ================= */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '5rem 1rem 2rem', position: 'relative', zIndex: 10 }}>
        
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '6rem' }}
        >
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: '900', marginBottom: '1.5rem', color: '#fff' }}>
            Ekosistem Pendidikan <span style={{ color: 'var(--accent-green)' }}>Terpadu</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            Semua alat yang dibutuhkan guru dan murid, dirancang dengan sistem AI agar lebih personal dan terukur. Bukan sekadar janji, tapi nyata.
          </p>
        </motion.div>

        {/* Feature Rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {FEATURES_DATA.map((feature, idx) => (
            <AnimatedFeatureRow key={feature.title} feature={feature} index={idx} />
          ))}
        </div>

      </div>

      <HowItWorksSection />
      
      {/* SECTION KEUNGGULAN TEKNIS */}
      <TechStackSection />

      {/* CSS KHUSUS MOBILE UNTUK ZIG-ZAG HORIZONTAL (WARNING: SMALL UI) */}
      <style>{`
        @media (max-width: 768px) {
          .feature-row {
            /* TETAP HORIZONTAL, JANGAN COLUMN */
            gap: 1rem !important;
            margin-bottom: 3rem !important;
          }
          .feature-text-side {
            padding: 1rem !important;
            border-radius: 12px !important;
          }
          .feature-title {
            font-size: 1.1rem !important;
            margin-bottom: 0.5rem !important;
          }
          .feature-desc {
            font-size: 0.75rem !important;
            line-height: 1.4 !important;
          }
          .feature-anim-side {
            height: 220px !important;
            border-radius: 12px !important;
          }
          .feature-pocket {
            height: 80px !important;
          }
          .feature-popup {
            width: 110px !important;
            height: 150px !important;
            border-radius: 12px !important;
          }
          /* Lucide Icons override inside popup */
          .feature-popup > svg {
            width: 48px !important;
            height: 48px !important;
          }
        }
      `}</style>
    <Footer />
      </div>
  );
}

























