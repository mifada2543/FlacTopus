const AutoCenter = ({ nodeId, nodes }) => {
  const { setCenter, getZoom } = useReactFlow();
  
  useEffect(() => {
    if (!nodeId || nodes.length === 0) return;
    const targetNode = nodes.find(n => n.id === nodeId);
    if (targetNode) {
      // Zoom with an animation
      const x = targetNode.position.x + (targetNode.measured?.width || 80) / 2;
      const y = targetNode.position.y + (targetNode.measured?.height || 80) / 2;
      
      // Delay slightly to ensure React Flow has measured nodes
      setTimeout(() => {
        setCenter(x, y, { zoom: 1.5, duration: 1000 });
      }, 100);
    }
  }, [nodeId, nodes, setCenter]);
  
  return null;
};
