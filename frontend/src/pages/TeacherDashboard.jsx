import React, { useState, useCallback, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRoomHeartbeat } from '../hooks/useRoomHeartbeat';
import { ruanganGet, ruanganPost } from '../utils/api';
import { ROLE, isAllowed } from '../utils/roles';
import { ReactFlow, Background, applyNodeChanges, applyEdgeChanges, addEdge, Handle, Position, Panel, useReactFlow, useStore } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { mockSyllabus } from '../data/mockData';
import { BookOpen, Sparkles, Plus, Save, ArrowLeft, Undo2, Redo2 } from 'lucide-react';
import { TemplateSelectionModal } from '../components/TemplateSelectionModal';
import { TemplateGalleryModal } from '../components/TemplateGalleryModal';
import { AIGenerateModal } from '../components/AIGenerateModal';
import { QuizTypeModal } from '../components/QuizTypeModal';

// Bentuk node persis kayak StudentDashboard
const EditorNode = ({ data, selected }) => (
  <div style={{
    padding: '10px',
    borderRadius: '50%',
    border: `2px solid ${selected ? 'var(--accent-green)' : 'var(--border-color)'}`,
    background: 'var(--bg-dark)',
    width: '80px',
    height: '80px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: selected ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none',
    transition: 'all 0.3s'
  }}>
    <BookOpen size={24} color={selected ? "var(--accent-green)" : "var(--text-muted)"} />
    <div style={{ fontSize: '0.6rem', textAlign: 'center', marginTop: '5px', fontWeight: 'bold', color: 'var(--text-main)' }}>
      {data.label || 'Materi Baru'}
    </div>
    <Handle type="source" position={Position.Bottom} style={{ background: 'var(--accent-green)', width: '8px', height: '8px' }} />
    <Handle type="target" position={Position.Top} style={{ background: 'var(--accent-green)', width: '8px', height: '8px' }} />
  </div>
);

const nodeTypes = { editorNode: EditorNode };

const zoomSelector = (s) => s.transform[2];

const AutoCenterNode = ({ targetNodeId, nodes }) => {
  const { fitView } = useReactFlow();
  const [hasCentered, setHasCentered] = useState(false);
  
  useEffect(() => {
    if (!targetNodeId || nodes.length === 0 || hasCentered) return;
    const targetNode = nodes.find(n => n.id === targetNodeId);
    if (targetNode) {
      // Step 1: fit view immediately to see the whole tree
      fitView({ duration: 600, padding: 0.2 });
      
      // Step 2: zoom in to the target node
      setTimeout(() => {
        try {
          const audio = new Audio(`${import.meta.env.BASE_URL}sounds/swoosh.wav`);
          audio.volume = 0.5;
          audio.play().catch(e => {});
        } catch(e) {}
        fitView({ nodes: [{ id: targetNodeId }], duration: 1200, maxZoom: 2.0 });
        setHasCentered(true);
      }, 700);
    }
  }, [targetNodeId, nodes, fitView, hasCentered]);
  
  return null;
};

const ZoomControls = () => {
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();
  const zoom = useStore(zoomSelector);
  const zoomPercentage = Math.round(zoom * 100);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(zoomPercentage.toString());

  useEffect(() => {
    if (!isEditing) {
      setInputValue(zoomPercentage.toString());
    }
  }, [zoomPercentage, isEditing]);

  const handleZoomSubmit = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      const parsed = parseInt(inputValue, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 500) {
        zoomTo(parsed / 100, { duration: 800 });
      } else {
        setInputValue(zoomPercentage.toString());
      }
      setIsEditing(false);
    }
  };

  return (
    <Panel position="bottom-left" style={{ background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '30px', display: 'flex', gap: '1rem', alignItems: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', margin: '1rem', border: '1px solid var(--border-color)' }}>
      <button onClick={() => zoomOut({ duration: 800 })} style={{ background: 'transparent', color: 'var(--text-main)', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>-</button>
      
      {isEditing ? (
        <input
          type="number"
          className="hide-arrows"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleZoomSubmit}
          onBlur={handleZoomSubmit}
          autoFocus
          style={{ width: '45px', background: 'transparent', border: '1px solid var(--accent-green)', color: 'var(--text-main)', textAlign: 'center', borderRadius: '4px', outline: 'none', fontSize: '0.9rem', fontWeight: 'bold', padding: '0.2rem' }}
        />
      ) : (
        <span 
          onClick={() => setIsEditing(true)} 
          style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', minWidth: '40px', textAlign: 'center' }} 
          title="Klik untuk mengubah persentase zoom manual"
        >
          {zoomPercentage}%
        </span>
      )}

      <button onClick={() => zoomIn({ duration: 800 })} style={{ background: 'transparent', color: 'var(--text-main)', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>+</button>
      <div style={{ width: '1px', height: '15px', background: 'var(--border-color)' }}></div>
      <button onClick={() => fitView({ duration: 800 })} style={{ background: 'transparent', color: 'var(--accent-green)', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>Fit</button>
    </Panel>
  );
};

export default function TeacherDashboard() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nodeIdFromUrl = searchParams.get('nodeId');
  // Kontrol akses: wajib login sebagai guru (session PHP)
  const { user: authUser, loading: authLoading, csrfToken } = useAuth();

  // "Ada orang disini?" — guru yang sedang mengedit ruangan ini menjawab "Ya"
  useRoomHeartbeat(classId);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showQuizTypeModal, setShowQuizTypeModal] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(nodeIdFromUrl || null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const takeSnapshot = useCallback(() => {
    setPast(p => {
      const newPast = [...p, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }];
      if (newPast.length > 30) newPast.shift();
      return newPast;
    });
    setFuture([]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (past.length > 0) {
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      
      setFuture(f => [{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }, ...f]);
      setPast(newPast);
      
      setNodes(previous.nodes);
      setEdges(previous.edges);
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges, past]);

  const redo = useCallback(() => {
    if (future.length > 0) {
      const next = future[0];
      const newFuture = future.slice(1);
      
      setPast(p => [...p, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
      setFuture(newFuture);
      
      setNodes(next.nodes);
      setEdges(next.edges);
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges, future]);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      navigate('/login');
      return;
    }
    // Kita biarkan backend yang menolak (403) jika user bukan guru pembuat / ketua kelas
  }, [authLoading, authUser, navigate]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Load silabus dari DB (API PHP) — sumber kebenaran kini di server
  useEffect(() => {
    if (!csrfToken) return;
    let cancelled = false;

    const fetchClassData = async () => {
      try {
        const data = await ruanganGet('syllabus', { id: classId });
        if (cancelled) return;
        const cls = { nodes: data.nodes || [], edges: data.edges || [] };

        if (cls.nodes.length > 0) {
          // Auto-migrate: pastikan tiap node punya type editorNode, posisi,
          // dan items (kalau data lama/uji tidak menyertakannya — tanpa ini
          // node bisa menumpuk di titik (0,0) atau tidak terlihat).
          const migratedNodes = cls.nodes.map((n, i) => {
            const items = n.data.items || [{
              id: `item-${n.id}-1`,
              type: n.data.nodeType || 'materi',
              content: n.data.content || '',
              quiz: n.data.quiz || { type: 'multiple_choice', question: '', options: ['', '', '', ''], correctAnswer: '', aiPromptContext: '', media: '' }
            }];
            return {
                ...n,
                type: n.type || 'editorNode',
                position: n.position || { x: 250, y: i * 150 + 50 },
                data: { ...n.data, items },
                selected: nodeIdFromUrl ? n.id === nodeIdFromUrl : !!n.selected
              };
          });
          setNodes(migratedNodes);
          setEdges(cls.edges || []);
        } else {
          // Kanvas kosong, tampilkan Pop-up Template
          setNodes([]);
          setEdges([]);
          setShowTemplateModal(true);
        }
      } catch (err) {
        if (cancelled) return;
        alert(err.message);
        navigate('/classes');
        return;
      }
    };

    fetchClassData();
    return () => { cancelled = true; };
  }, [classId, navigate, csrfToken]);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    setHasUnsavedChanges(true);
  }, []);
  
  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    setHasUnsavedChanges(true);
  }, []);
  
  const handleTemplateSelect = (type) => {
    if (type === 'blank') {
      setShowTemplateModal(false);
    } else if (type === 'template') {
      setShowTemplateModal(false);
      setShowGalleryModal(true);
    } else if (type === 'ai') {
      setShowTemplateModal(false);
      setShowAIModal(true);
    } else if (type === 'clear') {
      setShowTemplateModal(false);
      takeSnapshot();
      setNodes([]);
      setEdges([]);
      setHasUnsavedChanges(true);
    }
  };

    const handleInjectAI = (aiData) => {
    takeSnapshot();
    setShowAIModal(false);
    
    let startY = 50;
    if (nodes.length > 0) {
      startY = Math.max(...nodes.map(n => n.position.y)) + 200;
    }
    
    const timestamp = Date.now();
    // Auto layout vertikal
    const newNodes = aiData.nodes.map((n, index) => ({
      id: `ai_${timestamp}_${n.id}`,
      type: 'editorNode',
      position: { x: 250, y: startY + (index * 150) },
      data: n.data
    }));

    const newEdges = aiData.edges.map(e => ({
      id: `ai_edge_${timestamp}_${e.id}`,
      source: `ai_${timestamp}_${e.source}`,
      target: `ai_${timestamp}_${e.target}`,
      animated: true,
      style: { stroke: 'var(--accent-green)', strokeWidth: 2 }
    }));

    setNodes((nds) => [...nds, ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
  };

  const handleInjectTemplate = (template) => {
    takeSnapshot();
    let maxY = 50;
    if (nodes.length > 0) {
      maxY = Math.max(...nodes.map(n => n.position.y)) + 200;
    }
    
    const timeId = Date.now();
    const newNodes = template.nodes.map(node => {
      const layoutData = template.layout.find(l => l.id === node.id);
      return {
        id: `t_${timeId}_${node.id}`, 
        type: 'editorNode', 
        position: { x: layoutData ? layoutData.x : 250, y: maxY + (layoutData ? layoutData.y : 0) }, 
        data: { 
          label: node.title,
          description: '',
          items: [{
             id: `item-${timeId}-${node.id}-1`,
             type: node.type,
             content: '',
             quiz: { type: 'multiple_choice', question: '', options: ['', '', '', ''], correctAnswer: '', aiPromptContext: '', media: '' }
          }]
        }
      };
    });
    
    const newEdges = template.edges.map(edge => {
      return { 
        id: `e_t_${timeId}_${edge.source}-${edge.target}`, 
        source: `t_${timeId}_${edge.source}`, 
        target: `t_${timeId}_${edge.target}`,
        style: { stroke: 'var(--accent-green)', strokeWidth: 2 }
      };
    });
    
    setNodes(prev => [...prev, ...newNodes]);
    setEdges(prev => [...prev, ...newEdges]);
    setHasUnsavedChanges(true);
    setShowGalleryModal(false);
  };

  const onConnect = useCallback((params) => {
    takeSnapshot();
    setEdges((eds) => addEdge({ ...params, style: { stroke: 'var(--accent-green)', strokeWidth: 2 } }, eds));
    setHasUnsavedChanges(true);
  }, [takeSnapshot]);

  const [selectedEdgeId, setSelectedEdgeId] = useState(null);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
    setSelectedItemIndex(0); // Reset to first item
    setSelectedEdgeId(null);
  }, []);

  const onEdgeClick = useCallback((_, edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const handleChangeEdgeColor = (color) => {
    takeSnapshot();
    setEdges(eds => eds.map(e => {
      if (e.id === selectedEdgeId) {
        return { ...e, style: { ...e.style, stroke: color, strokeWidth: 2 } };
      }
      return e;
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddNode = () => {
    takeSnapshot();
    const newId = `node-${Date.now()}`;
    const newNode = { 
      id: newId, 
      type: 'editorNode', 
      position: { x: 250, y: nodes.length > 0 ? nodes[nodes.length - 1].position.y + 150 : 50 }, 
      data: { 
        label: 'Materi Baru',
        description: '',
        items: [{
          id: `item-${Date.now()}`,
          type: 'kuis',
          content: '',
          quiz: { type: 'multiple_choice', question: '', options: ['', '', '', ''], correctAnswer: '', aiPromptContext: '', media: '' }
        }]
      } 
    };
    setNodes(nds => [...nds, newNode]);
    setSelectedNodeId(newId);
    setSelectedItemIndex(0);
    setSelectedEdgeId(null);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);

  const updateNodeData = (field, value) => {
    setHasUnsavedChanges(true);
    setNodes(nds => nds.map(node => {
      if (node.id === selectedNodeId) {
        return { ...node, data: { ...node.data, [field]: value } };
      }
      return node;
    }));
  };

  const updateItemData = (field, value) => {
    setHasUnsavedChanges(true);
    setNodes(nds => nds.map(node => {
      if (node.id === selectedNodeId && node.data.items) {
        const newItems = [...node.data.items];
        if (newItems[selectedItemIndex]) {
          newItems[selectedItemIndex] = { ...newItems[selectedItemIndex], [field]: value };
        }
        return { ...node, data: { ...node.data, items: newItems } };
      }
      return node;
    }));
  };

  const updateItemQuizData = (field, value) => {
    setHasUnsavedChanges(true);
    setNodes(nds => nds.map(node => {
      if (node.id === selectedNodeId && node.data.items) {
        const newItems = [...node.data.items];
        if (newItems[selectedItemIndex]) {
          newItems[selectedItemIndex] = {
            ...newItems[selectedItemIndex],
            quiz: { ...newItems[selectedItemIndex].quiz, [field]: value }
          };
        }
        return { ...node, data: { ...node.data, items: newItems } };
      }
      return node;
    }));
  };

  const updateItemQuizOption = (index, value) => {
    setHasUnsavedChanges(true);
    setNodes(nds => nds.map(node => {
      if (node.id === selectedNodeId && node.data.items) {
        const newItems = [...node.data.items];
        if (newItems[selectedItemIndex]) {
          const newOptions = [...(newItems[selectedItemIndex].quiz?.options || ['', '', '', ''])];
          newOptions[index] = value;
          newItems[selectedItemIndex] = {
            ...newItems[selectedItemIndex],
            quiz: { ...newItems[selectedItemIndex].quiz, options: newOptions }
          };
        }
        return { ...node, data: { ...node.data, items: newItems } };
      }
      return node;
    }));
  };

  const handleAddItem = () => {
    setHasUnsavedChanges(true);
    setNodes(nds => nds.map(node => {
      if (node.id === selectedNodeId) {
        const currentItems = node.data.items || [];
        const newItems = [...currentItems, {
          id: `item-${Date.now()}`,
          type: 'kuis',
          content: '',
          quiz: { type: 'multiple_choice', question: '', options: ['', '', '', ''], correctAnswer: '', aiPromptContext: '', media: '' }
        }];
        return { ...node, data: { ...node.data, items: newItems } };
      }
      return node;
    }));
    setSelectedItemIndex(selectedNode.data.items ? selectedNode.data.items.length : 0);
  };


  const handleImageUpload = (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran gambar melebihi 2MB! Silakan kompres gambar Anda terlebih dahulu agar aplikasi tetap ringan.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      updateItemQuizData('media', event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran audio melebihi 2MB! Silakan kompres audio Anda terlebih dahulu agar aplikasi tetap ringan.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      updateItemQuizData('audio', event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTree = async () => {
    try {
      await ruanganPost(csrfToken, { action: 'syllabus', id: classId, nodes, edges });
      setHasUnsavedChanges(false);
      alert("Skill Tree berhasil disimpan! Murid sekarang bisa melihat versi terbaru di ruangan ini.");
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    }
  };

  const handleDuplicateNode = () => {
    if (!selectedNodeId) return;
    const nodeToCopy = nodes.find(n => n.id === selectedNodeId);
    if (!nodeToCopy) return;

    takeSnapshot();
    setHasUnsavedChanges(true);
    const newId = `node-${Date.now()}`;
    const duplicatedNode = {
      ...nodeToCopy,
      id: newId,
      position: { x: nodeToCopy.position.x + 50, y: nodeToCopy.position.y + 50 } // offset slightly
    };
    
    // Create an edge from the parent of the original node (if any)
    const incomingEdge = edges.find(e => e.target === selectedNodeId);
    if (incomingEdge) {
      const newEdge = {
        id: `e${incomingEdge.source}-${newId}`,
        source: incomingEdge.source,
        target: newId,
        style: incomingEdge.style
      };
      setEdges(eds => [...eds, newEdge]);
    }

    setNodes(nds => [...nds, duplicatedNode]);
    setSelectedNodeId(newId);
    setSelectedEdgeId(null);
  };

  const handleDeleteNode = () => {
    takeSnapshot();
    setHasUnsavedChanges(true);
    setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const handleDeleteEdge = () => {
    takeSnapshot();
    setEdges(eds => eds.filter(e => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  };

  // Hitung Level tiap Node (Topological Sort / Max Depth) untuk penomoran Langkah yang sejajar
  const nodeLevels = {};
  const inDegree = {};
  nodes.forEach(n => inDegree[n.id] = 0);
  edges.forEach(e => {
    if (inDegree[e.target] !== undefined) inDegree[e.target]++;
  });

  // Node yang gak punya induk mulai dari Level 1
  const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
  queue.forEach(id => nodeLevels[id] = 1);

  let iterations = 0;
  while(queue.length > 0 && iterations < 1000) {
    iterations++;
    const currentId = queue.shift();
    const currentLevel = nodeLevels[currentId];
    
    // Cari semua anak dari node ini
    edges.filter(e => e.source === currentId).forEach(e => {
      const targetId = e.target;
      // Kalo nemu jalur yang lebih panjang/dalam, update level si anak
      if (!nodeLevels[targetId] || nodeLevels[targetId] < currentLevel + 1) {
        nodeLevels[targetId] = currentLevel + 1;
        queue.push(targetId);
      }
    });
  }

  // Terapkan penomoran Langkah berdasarkan Level tujuan, dan hapus mata panah (minimalis)
  const displayEdges = edges.map((e) => {
    const isSelected = e.id === selectedEdgeId;
    const targetLevel = nodeLevels[e.target] || 2; 
    const strokeColor = e.style?.stroke || 'var(--accent-green)';
    
    return {
      ...e,
      label: `Langkah ${targetLevel}`,
      labelStyle: { fill: 'var(--accent-green)', fontWeight: 'bold', fontSize: 12 },
      labelBgStyle: { fill: 'var(--bg-card)', stroke: 'var(--border-color)' },
      animated: isSelected, // Animasi ngalir kalo lagi dipilih
      // Menghapus markerEnd (mata panah) biar lebih minimalis/gak heboh
      style: { 
        stroke: strokeColor, 
        strokeWidth: isSelected ? 4 : 2,
        filter: isSelected ? `drop-shadow(0 0 5px ${strokeColor})` : 'none'
      }
    };
  });

  return (
    <div style={{ padding: '0', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="teacher-header">
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ color: 'var(--accent-green)', fontSize: '1.5rem', margin: 0 }}>Visual Builder (Guru)</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={undo} 
              disabled={past.length === 0}
              title="Undo"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: past.length === 0 ? 'var(--text-muted)' : 'var(--text-main)', padding: '0.5rem', borderRadius: '6px', cursor: past.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s', opacity: past.length === 0 ? 0.5 : 1 }}
            >
              <Undo2 size={18} />
            </button>
            <button 
              onClick={redo} 
              disabled={future.length === 0}
              title="Redo"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: future.length === 0 ? 'var(--text-muted)' : 'var(--text-main)', padding: '0.5rem', borderRadius: '6px', cursor: future.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s', opacity: future.length === 0 ? 0.5 : 1 }}
            >
              <Redo2 size={18} />
            </button>
          </div>

          {hasUnsavedChanges && (
            <span style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
              ⚠️ Terdapat perubahan belum disimpan
            </span>
          )}
        </div>

        <div className="teacher-header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="main-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button onClick={() => setShowTemplateModal(true)} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', border: '1px solid var(--accent-green)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
              <Sparkles size={16} /> <span className="hide-on-mobile">Opsi </span>Pembuatan
            </button>
            <button onClick={handleAddNode} style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Plus size={16} /> <span className="hide-on-mobile">Tambah Node</span>
            </button>
            <button onClick={handleSaveTree} style={{ background: 'var(--accent-green)', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', boxShadow: hasUnsavedChanges ? '0 0 15px rgba(234, 179, 8, 0.5)' : '0 0 10px rgba(16, 185, 129, 0.3)', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Save size={16} /> Simpan <span className="hide-on-mobile">Silabus</span>
            </button>
          </div>
          <Link to={`/analytics/${classId}`} onClick={(e) => {
            if (hasUnsavedChanges) {
              if (!window.confirm("Terdapat perubahan yang belum disimpan. Apakah Anda yakin ingin keluar? Perubahan yang belum disimpan akan hilang.")) {
                e.preventDefault();
              }
            }
          }} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
            <ArrowLeft size={16} /> <span className="hide-on-mobile">Kembali</span>
          </Link>
        </div>
      </header>

      <div className="editor-layout">
        {/* Canvas Area */}
        <div style={{ flex: 1, background: '#0f172a' }}>
          <ReactFlow 
            nodes={nodes} 
            edges={displayEdges} 
            onNodesChange={onNodesChange} 
            onEdgesChange={onEdgesChange}
            onNodeDragStart={takeSnapshot}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            proOptions={{ hideAttribution: true }}
            nodeTypes={nodeTypes} 
            fitView={!nodeIdFromUrl}
            panOnScroll={false}
          >
            <Background color="#334155" gap={20} />
            <ZoomControls />
            {nodeIdFromUrl && <AutoCenterNode targetNodeId={nodeIdFromUrl} nodes={nodes} />}
          </ReactFlow>
        </div>

        {/* Side Panel Edit Garis */}
        {selectedEdge && (
          <div className="glass-panel side-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 style={{ color: '#ef4444', margin: 0 }}>Edit Garis</h3>
              <button onClick={() => setSelectedEdgeId(null)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '0.2rem 0.5rem' }}>✕</button>
            </div>
            <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Garis ini menghubungkan dua materi. Jika dihapus, materi tujuan tidak akan lagi mewajibkan materi asal.
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '0.8rem', fontWeight: 'bold' }}>Warna Garis</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['var(--accent-green)', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#94a3b8', '#fff'].map(color => (
                  <button 
                    key={color} 
                    onClick={() => handleChangeEdgeColor(color)}
                    style={{ 
                      width: '30px', height: '30px', borderRadius: '50%', background: color, border: '2px solid', 
                      borderColor: (selectedEdge.style?.stroke || 'var(--accent-green)') === color ? '#fff' : 'transparent',
                      cursor: 'pointer' 
                    }} 
                    title="Ubah Warna"
                  />
                ))}
              </div>
            </div>

            <button onClick={handleDeleteEdge} style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', padding: '1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>Hapus Garis Ini</button>
          </div>
        )}

        {/* Side Panel Edit Node */}
        {selectedNode && (
          <div className="glass-panel side-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 style={{ color: 'var(--accent-green)', margin: 0 }}>Edit Node</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleDeleteNode} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Hapus</button>
                <button onClick={() => setSelectedNodeId(null)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '0.2rem 0.5rem' }}>✕</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>Judul Materi</label>
                <input value={selectedNode.data.label || ''} onChange={(e) => updateNodeData('label', e.target.value)} style={{ width: '100%', padding: '0.8rem', background: '#0f172a', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>Deskripsi Singkat</label>
                <input value={selectedNode.data.description || ''} onChange={(e) => updateNodeData('description', e.target.value)} style={{ width: '100%', padding: '0.8rem', background: '#0f172a', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px' }} />
              </div>

              <div style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ height: '1px', background: 'var(--border-color)', flex: 1 }}></div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Halaman / Nomor</span>
                <div style={{ height: '1px', background: 'var(--border-color)', flex: 1 }}></div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {selectedNode.data.items?.map((item, idx) => (
                  <button 
                    key={item.id || idx}
                    onClick={() => setSelectedItemIndex(idx)}
                    style={{ 
                      padding: '0.4rem 0.8rem', 
                      background: selectedItemIndex === idx ? 'var(--accent-green)' : '#1e293b', 
                      color: selectedItemIndex === idx ? '#000' : 'white', 
                      border: `1px solid ${selectedItemIndex === idx ? 'var(--accent-green)' : 'var(--border-color)'}`, 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    No. {idx + 1}
                  </button>
                ))}
                <button 
                  onClick={handleAddItem}
                  style={{ 
                    padding: '0.4rem 0.8rem', 
                    background: 'transparent', 
                    color: 'var(--text-muted)', 
                    border: '1px dashed var(--border-color)', 
                    borderRadius: '4px', 
                    cursor: 'pointer'
                  }}
                >
                  + Tambah Hal
                </button>
              </div>

              {selectedNode.data.items && selectedNode.data.items[selectedItemIndex] && (
                <>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => updateItemData('type', 'materi')}
                      style={{ flex: 1, minWidth: '100px', padding: '0.8rem', background: selectedNode.data.items[selectedItemIndex].type === 'materi' ? 'var(--accent-green)' : 'transparent', color: selectedNode.data.items[selectedItemIndex].type === 'materi' ? '#000' : 'var(--text-main)', border: `1px solid ${selectedNode.data.items[selectedItemIndex].type === 'materi' ? 'var(--accent-green)' : 'var(--border-color)'}`, borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      📖 Teori/Materi
                    </button>
                    <button 
                      onClick={() => updateItemData('type', 'kuis')}
                      style={{ flex: 1, minWidth: '100px', padding: '0.8rem', background: selectedNode.data.items[selectedItemIndex].type === 'kuis' ? 'var(--accent-green)' : 'transparent', color: selectedNode.data.items[selectedItemIndex].type === 'kuis' ? '#000' : 'var(--text-main)', border: `1px solid ${selectedNode.data.items[selectedItemIndex].type === 'kuis' ? 'var(--accent-green)' : 'var(--border-color)'}`, borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      🎯 Kuis
                    </button>
                    <button 
                      onClick={() => updateItemData('type', 'ice_breaking')}
                      style={{ flex: 1, minWidth: '120px', padding: '0.8rem', background: selectedNode.data.items[selectedItemIndex].type === 'ice_breaking' ? 'var(--accent-blue, #3b82f6)' : 'transparent', color: selectedNode.data.items[selectedItemIndex].type === 'ice_breaking' ? '#fff' : 'var(--text-main)', border: `1px solid ${selectedNode.data.items[selectedItemIndex].type === 'ice_breaking' ? 'var(--accent-blue, #3b82f6)' : 'var(--border-color)'}`, borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      🧊 Ice Breaking
                    </button>
                  </div>

                  {selectedNode.data.items[selectedItemIndex].type === 'materi' ? (
                    <>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>URL Video (YouTube, MP4, dll)</label>
                        <input type="text" value={selectedNode.data.items[selectedItemIndex].quiz?.video || ''} onChange={(e) => updateItemQuizData('video', e.target.value)} placeholder="Masukkan link video..." style={{ width: '100%', padding: '0.8rem', background: '#0f172a', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>Media Gambar (Maks 2MB)</label>
                        <div 
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => { e.preventDefault(); handleImageUpload(e); }}
                          style={{ border: '2px dashed var(--border-color)', padding: '1.5rem', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', position: 'relative' }}
                        >
                          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                          {selectedNode.data.items[selectedItemIndex].quiz?.media ? (
                            <div>
                              <button type="button" onClick={(e) => { e.stopPropagation(); updateItemQuizData('media', ''); }} style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', zIndex: 10 }}>X</button>
                              <img src={selectedNode.data.items[selectedItemIndex].quiz.media} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '6px' }} />
                              <p style={{ fontSize: '0.8rem', color: 'var(--accent-green)', marginTop: '0.5rem' }}>Gambar tersimpan. Klik/Drop untuk mengganti.</p>
                            </div>
                          ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tarik & Lepas gambar di sini,<br/>Atau klik untuk memilih (Max: 2MB)</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>Konten Materi / Teori</label>
                        <textarea value={selectedNode.data.items[selectedItemIndex].content || ''} onChange={(e) => updateItemData('content', e.target.value)} rows="8" placeholder="Tuliskan materi atau penjelasan di sini..." style={{ width: '100%', padding: '0.8rem', background: '#0f172a', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px', resize: 'vertical' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>Tautan / Link Tambahan</label>
                        <input type="text" value={selectedNode.data.items[selectedItemIndex].quiz?.link || ''} onChange={(e) => updateItemQuizData('link', e.target.value)} placeholder="Masukkan link referensi..." style={{ width: '100%', padding: '0.8rem', background: '#0f172a', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px' }} />
                      </div>
                    </>
                  ) : selectedNode.data.items[selectedItemIndex].type === 'ice_breaking' ? (
                    <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px dashed #3b82f6', marginBottom: '1rem' }}>
                      <h4 style={{ color: '#3b82f6', marginBottom: '0.5rem' }}>🧊 Mode Ice Breaking (Auditori)</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        Mode ini murni untuk hiburan dan melatih pendengaran.<br/>
                        Sistem akan memuat 3 karakter animasi Rive secara acak di sisi murid.<br/>
                        Tidak perlu pengaturan konten.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>Tipe Kuis</label>
                        <button 
                          onClick={() => setShowQuizTypeModal(true)}
                          style={{ 
                            width: '100%', 
                            padding: '0.8rem 1rem', 
                            background: '#0f172a', 
                            border: '1px solid var(--border-color)', 
                            color: 'white', 
                            borderRadius: '6px', 
                            marginBottom: '1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <span>{
                            selectedNode.data.items[selectedItemIndex].quiz?.type === 'fill_in_the_blank' ? 'Isi Rumpang (Interaktif)' :
                            selectedNode.data.items[selectedItemIndex].quiz?.type === 'boss_fight' ? 'Boss Fight (Pilihan Ganda)' :
                            selectedNode.data.items[selectedItemIndex].quiz?.type === 'auditory' ? 'Auditori (Mendengar)' :
                            'Pilihan Ganda Biasa'
                          }</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ubah ▼</span>
                        </button>
                      </div>

                      {selectedNode.data.items[selectedItemIndex].quiz?.type === 'auditory' && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>Media Audio (Maks 2MB)</label>
                          <div 
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); handleAudioUpload(e); }}
                            style={{ border: '2px dashed var(--border-color)', padding: '1.5rem', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', position: 'relative', marginBottom: '1rem' }}
                          >
                            <input type="file" accept="audio/*" onChange={handleAudioUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                            {selectedNode.data.items[selectedItemIndex].quiz?.audio ? (
                              <div>
                                <button type="button" onClick={(e) => { e.stopPropagation(); updateItemQuizData('audio', ''); }} style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', zIndex: 10 }}>X</button>
                                <div style={{ fontSize: '3rem' }}>🎵</div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--accent-green)', marginTop: '0.5rem' }}>Audio tersimpan. Klik/Drop untuk mengganti.</p>
                              </div>
                            ) : (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tarik & Lepas audio di sini,<br/>Atau klik untuk memilih (Max: 2MB)</p>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>Media Gambar (Maks 2MB)</label>
                        <div 
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => { e.preventDefault(); handleImageUpload(e); }}
                          style={{ border: '2px dashed var(--border-color)', padding: '1.5rem', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', position: 'relative' }}
                        >
                          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                          {selectedNode.data.items[selectedItemIndex].quiz?.media ? (
                            <div>
                              <button type="button" onClick={(e) => { e.stopPropagation(); updateItemQuizData('media', ''); }} style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', zIndex: 10 }}>X</button>
                              <img src={selectedNode.data.items[selectedItemIndex].quiz.media} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '6px' }} />
                              <p style={{ fontSize: '0.8rem', color: 'var(--accent-green)', marginTop: '0.5rem' }}>Gambar tersimpan. Klik/Drop untuk mengganti.</p>
                            </div>
                          ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tarik & Lepas gambar di sini,<br/>Atau klik untuk memilih (Max: 2MB)</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          {selectedNode.data.items[selectedItemIndex].quiz?.type === 'fill_in_the_blank' ? 'Teks dengan Rumpang (gunakan "[_]" untuk rumpang)' : 'Pertanyaan'}
                        </label>
                        <textarea value={selectedNode.data.items[selectedItemIndex].quiz?.question || ''} onChange={(e) => updateItemQuizData('question', e.target.value)} rows="8" placeholder={selectedNode.data.items[selectedItemIndex].quiz?.type === 'fill_in_the_blank' ? 'Contoh: print([_]) "Hello";' : 'Tulis pertanyaan...'} style={{ width: '100%', padding: '0.8rem', background: '#0f172a', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px', resize: 'vertical' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>Pilihan Opsi / Kata Rumpang</label>
                        <div className="editor-options-grid">
                          {[0, 1, 2, 3].map(i => (
                            <input key={i} placeholder={`Opsi ${i+1}`} value={selectedNode.data.items[selectedItemIndex].quiz?.options?.[i] || ''} onChange={(e) => updateItemQuizOption(i, e.target.value)} style={{ padding: '0.6rem', background: '#0f172a', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px' }} />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '0.9rem' }}>Kunci Jawaban yang Benar</label>
                        <input value={selectedNode.data.items[selectedItemIndex].quiz?.correctAnswer || ''} onChange={(e) => updateItemQuizData('correctAnswer', e.target.value)} placeholder="Tulis opsi yang benar secara presisi" style={{ width: '100%', padding: '0.8rem', background: '#0f172a', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', borderRadius: '6px', fontWeight: 'bold' }} />
                      </div>

                      {selectedNode.data.items[selectedItemIndex].quiz?.type !== 'auditory' && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#eab308', fontWeight: 'bold', fontSize: '0.9rem' }}>Prompt Khusus AI (Opsional)</label>
                          <textarea value={selectedNode.data.items[selectedItemIndex].quiz?.aiPromptContext || ''} onChange={(e) => updateItemQuizData('aiPromptContext', e.target.value)} rows="3" placeholder="Biarkan kosong untuk prompt bawaan AI..." style={{ width: '100%', padding: '0.8rem', background: 'rgba(234, 179, 8, 0.05)', border: '1px solid #eab308', color: 'white', borderRadius: '6px', resize: 'vertical' }} />
                        </div>
                      )}
                    </>
                  )}
                  
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={handleDuplicateNode}
                      style={{ flex: 1, padding: '0.8rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      + Duplikasi Node (Utuh)
                    </button>
                    {selectedNode.data.items.length > 1 && (
                      <button 
                        onClick={() => {
                          if (!confirm("Hapus nomor ini?")) return;
                          const newItems = [...selectedNode.data.items];
                          newItems.splice(selectedItemIndex, 1);
                          updateNodeData('items', newItems);
                          setSelectedItemIndex(Math.max(0, selectedItemIndex - 1));
                        }}
                        style={{ flex: 1, padding: '0.8rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Hapus Nomor
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      {showTemplateModal && (
        <TemplateSelectionModal 
          onSelect={handleTemplateSelect} 
          onClose={() => setShowTemplateModal(false)}
          hasNodes={nodes.length > 0} 
        />
      )}

            {showGalleryModal && (
        <TemplateGalleryModal 
          onSelectTemplate={handleInjectTemplate} 
          onClose={() => setShowGalleryModal(false)}
        />
      )}

      {showAIModal && (
        <AIGenerateModal
          onGenerate={handleInjectAI}
          onClose={() => setShowAIModal(false)}
        />
      )}

      {showQuizTypeModal && selectedNode && (
        <QuizTypeModal 
          currentType={selectedNode.data.items[selectedItemIndex].quiz?.type || 'multiple_choice'}
          onSelect={(type) => {
            updateItemQuizData('type', type);
            setShowQuizTypeModal(false);
          }}
          onClose={() => setShowQuizTypeModal(false)}
        />
      )}
    </div>
  );
}


