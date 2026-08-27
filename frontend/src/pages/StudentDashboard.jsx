import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ReactFlow, Background, Handle, Position, Panel, useReactFlow, useStore } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { BookOpen, CheckCircle, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRoomHeartbeat } from '../hooks/useRoomHeartbeat';
import { ruanganGet, quizGet } from '../utils/api';
import { ROLE, isAllowed } from '../utils/roles';

// Custom Node Component to look like RPG Skill
const SkillNode = ({ data }) => {
  const isCompleted = data.status === 'completed';
  const isLocked = data.status === 'locked';
  const isInProgress = data.status === 'in-progress';

  let borderColor = 'var(--border-color)';
  let glow = 'none';
  if (isCompleted) {
    borderColor = 'var(--accent-green)';
    glow = '0 0 15px rgba(16, 185, 129, 0.4)';
  } else if (isInProgress) {
    borderColor = '#eab308';
    glow = '0 0 15px rgba(234, 179, 8, 0.4)';
  }

  return (
    <div style={{
      padding: '10px',
      borderRadius: '50%',
      border: `2px solid ${borderColor}`,
      background: 'var(--bg-dark)',
      width: '80px',
      height: '80px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: glow,
      opacity: isLocked ? 0.5 : 1,
      cursor: isLocked ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s'
    }}>
      {isCompleted && <CheckCircle size={24} color="var(--accent-green)" />}
      {isInProgress && <BookOpen size={24} color="#eab308" />}
      {isLocked && <Lock size={24} color="var(--text-muted)" />}
      <div style={{ fontSize: '0.6rem', textAlign: 'center', marginTop: '5px', fontWeight: 'bold', color: 'var(--text-main)' }}>
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: 'transparent', border: 'none' }} />
      <Handle type="target" position={Position.Top} style={{ background: 'transparent', border: 'none' }} />
    </div>
  );
};

const nodeTypes = {
  skill: SkillNode,
};

const zoomSelector = (s) => s.transform[2];

const ZoomControls = () => {
  const { zoomIn, zoomOut, fitView, setViewport } = useReactFlow();
  const zoom = useStore(zoomSelector);
  const zoomPercentage = Math.round(zoom * 100);
  
  return (
    <Panel position="bottom-left" style={{ background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '30px', display: 'flex', gap: '1rem', alignItems: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', margin: '1rem', border: '1px solid var(--border-color)' }}>
      <button onClick={() => zoomOut({ duration: 800 })} style={{ background: 'transparent', color: 'var(--text-main)', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>-</button>
      <span onClick={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 800 })} style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', minWidth: '40px', textAlign: 'center' }} title="Reset ke 100%">
        {zoomPercentage}%
      </span>
      <button onClick={() => zoomIn({ duration: 800 })} style={{ background: 'transparent', color: 'var(--text-main)', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>+</button>
      <div style={{ width: '1px', height: '15px', background: 'var(--border-color)' }}></div>
      <button onClick={() => fitView({ duration: 800 })} style={{ background: 'transparent', color: 'var(--accent-green)', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>Fit</button>
    </Panel>
  );
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { classId } = useParams();
  // Kontrol akses: wajib login sebagai murid (session PHP)
  const { user, loading } = useAuth();

  // "Ada orang disini?" — murid yang sedang belajar di ruangan ini menjawab "Ya"
  useRoomHeartbeat(classId);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [className, setClassName] = useState('');

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

    let cancelled = false;

    // Terapkan silabus dari server ke tampilan skill tree murid
    const applySyllabus = (data, attempts = []) => {
      setClassName(data.nama || '');
      const rawNodes = data.nodes || [];

      if (rawNodes.length > 0) {
        const isNodeCompleted = (nodeId) => attempts.some(a => a.node_id === nodeId);

        // Transform teacher nodes to student skill nodes
        const studentNodes = rawNodes.map((n, idx) => {
          let status = 'locked';

          if (isNodeCompleted(n.id)) {
            status = 'completed';
          } else {
            // Cari edge yang target-nya adalah node ini
            const incomingEdges = (data.edges || []).filter(e => e.target === n.id);
            if (incomingEdges.length === 0) {
              // Jika tidak ada edge yang masuk, ini node awal
              status = 'in-progress';
            } else {
              // Jika semua node prasyarat (source dari edge masuk) sudah completed
              const allPrereqsCompleted = incomingEdges.every(e => isNodeCompleted(e.source));
              if (allPrereqsCompleted) {
                status = 'in-progress';
              }
            }
          }

          return {
            ...n,
            type: 'skill',
            position: n.position || { x: idx * 220, y: 100 },
            data: {
              ...n.data,
              status
            }
          };
        });
        setNodes(studentNodes);

        const studentEdges = (data.edges || []).map(e => {
          const isSourceDone = isNodeCompleted(e.source);
          const isTargetDone = isNodeCompleted(e.target);

          return {
            ...e,
            style: {
              ...e.style,
              // Jika sumber belum selesai (terkunci), garis berwarna redup/abu-abu.
              // Jika sudah selesai, garis menyala sesuai warna yang diset guru atau default hijau.
              stroke: isSourceDone ? (e.style?.stroke || 'var(--accent-green)') : 'rgba(255, 255, 255, 0.2)',
              strokeWidth: e.style?.strokeWidth || 2
            },
            animated: isSourceDone && !isTargetDone,
          };
        });
        setEdges(studentEdges);
      } else {
        setNodes([]);
        setEdges([]);
      }
    };

    // Baca silabus dan progres dari DB (API PHP) + polling agar update terlihat
    const poll = async () => {
      try {
        const [syllabusData, progressData] = await Promise.all([
          ruanganGet('syllabus', { id: classId }),
          quizGet('student_progress', { ruangan_id: classId })
        ]);
        if (!cancelled) applySyllabus(syllabusData, progressData.attempts || []);
      } catch (err) {
        // Ruangan kedaluwarsa / dihapus / akses hilang → kembali ke daftar
        if (!cancelled) {
          alert(err.message);
          navigate('/classes');
        }
      }
    };

    poll();
    const iv = setInterval(poll, 10000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [loading, user, classId, navigate]);

  const onNodeClick = useCallback((event, clickedNode) => {
    // Cari data node dari state 'nodes' (bukan mockSyllabus)
    const nodeData = nodes.find(n => n.id === clickedNode.id);
    if (nodeData && nodeData.data.status !== 'locked') {
      navigate(`/quiz/${classId}/${nodeData.id}`);
    }
  }, [navigate, nodes, classId]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', zIndex: 10 }}>
        <h1 style={{ color: 'var(--accent-green)', fontSize: '1.5rem' }}>{className || 'Skill Tree'} (Murid)</h1>
        <Link to="/classes" style={{ color: 'var(--text-muted)' }}>Kembali</Link>
      </header>
      
      <div style={{ flex: 1, background: '#0f172a' }}>
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background color="#334155" gap={20} />
          <ZoomControls />
        </ReactFlow>
      </div>
    </div>
  );
}
