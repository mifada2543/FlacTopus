const zoomSelector = (s) => s.transform[2];

const AutoCenterNode = ({ targetNodeId, nodes }) => {
  const { fitView } = useReactFlow();
  const [hasCentered, setHasCentered] = useState(false);
  
  useEffect(() => {
    if (!targetNodeId || nodes.length === 0 || hasCentered) return;
    const targetNode = nodes.find(n => n.id === targetNodeId);
    if (targetNode) {
      fitView({ duration: 600, padding: 0.2 });
      setTimeout(() => {
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
          title="Klik untuk mengubah persentase zoom"
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
