import React, { useState, useRef, useEffect } from 'react';
import { 
  MousePointer, 
  PlusCircle, 
  GitCommit, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  RotateCcw,
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';
import { GraphNode, GraphEdge, DijkstraStep } from '../types';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onChangeNodes: (nodes: GraphNode[]) => void;
  onChangeEdges: (edges: GraphEdge[]) => void;
  startNodeId: string;
  endNodeId: string | null;
  setStartNodeId: (id: string) => void;
  setEndNodeId: (id: string | null) => void;
  activeStep: DijkstraStep | null;
  isPlaying: boolean;
  isDirected: boolean;
  setIsDirected: (directed: boolean) => void;
}

type CanvasMode = 'select' | 'add_node' | 'add_edge' | 'delete';

export default function GraphCanvas({
  nodes,
  edges,
  onChangeNodes,
  onChangeEdges,
  startNodeId,
  endNodeId,
  setStartNodeId,
  setEndNodeId,
  activeStep,
  isPlaying,
  isDirected,
  setIsDirected
}: GraphCanvasProps) {
  const [mode, setMode] = useState<CanvasMode>('select');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  
  // Edge building state
  const [edgeSourceId, setEdgeSourceId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Dialog overlay for editing weights or node names
  const [editingEdge, setEditingEdge] = useState<GraphEdge | null>(null);
  const [tempWeight, setTempWeight] = useState<string>('5');
  const [editingNode, setEditingNode] = useState<GraphNode | null>(null);
  const [tempLabel, setTempLabel] = useState<string>('');

  const svgRef = useRef<SVGSVGElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Reset edge source if mode changes
  useEffect(() => {
    setEdgeSourceId(null);
  }, [mode]);

  // Handle zoom and pan with a non-passive native wheel listener to block secondary page scrolling
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1.08;
      const scrollDir = e.deltaY < 0 ? 1 : -1;
      
      const rect = svgElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const scale = scrollDir > 0 ? zoomFactor : 1 / zoomFactor;
      const newZoom = Math.min(Math.max(zoom * scale, 0.2), 4.0);
      
      if (newZoom !== zoom) {
        setPan((prevPan) => ({
          x: mouseX - (mouseX - prevPan.x) * (newZoom / zoom),
          y: mouseY - (mouseY - prevPan.y) * (newZoom / zoom)
        }));
        setZoom(newZoom);
      }
    };

    svgElement.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      svgElement.removeEventListener('wheel', handleWheelNative);
    };
  }, [zoom]);

  // Convert screen coordinates to SVG viewport coordinates taking pan & zoom into account
  const getSVGCoords = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  // Drag node or Pan canvas start
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (editingEdge || editingNode) return;
    
    const target = e.target as SVGElement;
    const nodeId = target.getAttribute('data-node-id');

    if (nodeId) {
      if (isPlaying) return; // Prevent edits while playing visualizer
      
      if (mode === 'select') {
        setDraggedNodeId(nodeId);
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          // Store raw mouse position to prevent jump
          const coords = getSVGCoords(e.clientX, e.clientY);
          panStartRef.current = {
            x: coords.x - node.x,
            y: coords.y - node.y
          };
        }
      } else if (mode === 'add_edge') {
        if (!edgeSourceId) {
          setEdgeSourceId(nodeId);
          const coords = getSVGCoords(e.clientX, e.clientY);
          setMousePosition(coords);
        } else {
          // Connect edges
          if (edgeSourceId !== nodeId) {
            // Check if edge already exists
            const exists = edges.some(
              (ed) => (ed.source === edgeSourceId && ed.target === nodeId) ||
                      (ed.source === nodeId && ed.target === edgeSourceId)
            );
            if (!exists) {
              const newEdge: GraphEdge = {
                id: `e-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                source: edgeSourceId,
                target: nodeId,
                weight: 5
              };
              onChangeEdges([...edges, newEdge]);
              // Open weight editing immediately
              setEditingEdge(newEdge);
              setTempWeight('5');
            }
          }
          setEdgeSourceId(null);
        }
      } else if (mode === 'delete') {
        // Delete Node
        handleDeleteNode(nodeId);
      }
    } else {
      // Clicked on empty background
      if (mode === 'select') {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      } else if (mode === 'add_node') {
        if (isPlaying) return;
        const coords = getSVGCoords(e.clientX, e.clientY);
        handleAddNode(coords.x, coords.y);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    } else if (draggedNodeId) {
      const coords = getSVGCoords(e.clientX, e.clientY);
      // New node coords
      const newX = coords.x - panStartRef.current.x;
      const newY = coords.y - panStartRef.current.y;

      onChangeNodes(
        nodes.map((n) => (n.id === draggedNodeId ? { ...n, x: Math.round(newX), y: Math.round(newY) } : n))
      );
    } else if (edgeSourceId) {
      const coords = getSVGCoords(e.clientX, e.clientY);
      setMousePosition(coords);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  // Zoom controls (using Left Mouse Click)
  const triggerZoom = (factor: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newZoom = Math.min(Math.max(zoom * factor, 0.2), 4.0);

    setPan((prevPan) => ({
      x: centerX - (centerX - prevPan.x) * (newZoom / zoom),
      y: centerY - (centerY - prevPan.y) * (newZoom / zoom)
    }));
    setZoom(newZoom);
  };

  const autoFitGraph = () => {
    if (nodes.length === 0) return;

    // Find bounding box of nodes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y;
      if (node.y > maxY) maxY = node.y;
    });

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    // Get current SVG dimensions or default to standard container sizes
    const containerWidth = svgRef.current ? svgRef.current.clientWidth : 750;
    const containerHeight = svgRef.current ? svgRef.current.clientHeight : 450;

    // Add padding to fit nicely
    const padding = 70;
    
    // Compute best scale factors for width and height
    const scaleX = containerWidth / (graphWidth + padding * 2);
    const scaleY = containerHeight / (graphHeight + padding * 2);
    
    // Choose the minimum scale factor to ensure everything fits
    let newZoom = Math.min(scaleX, scaleY);
    // Bind zoom between 0.35 and 1.5 to keep nodes clear and readable
    newZoom = Math.min(Math.max(newZoom, 0.45), 1.3);

    // Compute necessary pan translation to center the graph bounding box in the SVG container
    const graphCenterX = minX + graphWidth / 2;
    const graphCenterY = minY + graphHeight / 2;
    
    const newPanX = containerWidth / 2 - graphCenterX * newZoom;
    const newPanY = containerHeight / 2 - graphCenterY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const prevNodesLengthRef = React.useRef(0);
  const prevFirstNodeIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (nodes.length > 0) {
      const firstNode = nodes[0];
      if (nodes.length !== prevNodesLengthRef.current || firstNode.id !== prevFirstNodeIdRef.current) {
        const timer = setTimeout(() => {
          autoFitGraph();
        }, 120);
        prevNodesLengthRef.current = nodes.length;
        prevFirstNodeIdRef.current = firstNode.id;
        return () => clearTimeout(timer);
      }
    } else {
      prevNodesLengthRef.current = 0;
      prevFirstNodeIdRef.current = null;
    }
  }, [nodes]);

  const resetPanZoom = () => {
    autoFitGraph();
  };

  // Delete Node and all its attached edges
  const handleDeleteNode = (nodeId: string) => {
    onChangeNodes(nodes.filter((n) => n.id !== nodeId));
    onChangeEdges(edges.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (startNodeId === nodeId) {
      const remaining = nodes.filter((n) => n.id !== nodeId);
      setStartNodeId(remaining[0]?.id || '');
    }
    if (endNodeId === nodeId) {
      setEndNodeId(null);
    }
  };

  // Delete Edge
  const handleDeleteEdge = (edgeId: string) => {
    onChangeEdges(edges.filter((e) => e.id !== edgeId));
  };

  // Add Edge trigger
  const handleAddNode = (x: number, y: number) => {
    // Generate label based on alphabet or numbers
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let nextLabel = '';
    
    // Try alphabetical names first
    if (nodes.length < 26) {
      nextLabel = alphabet[nodes.length];
    } else {
      nextLabel = `N${nodes.length + 1}`;
    }

    const newNode: GraphNode = {
      id: `n-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      label: nextLabel,
      x: Math.round(x),
      y: Math.round(y)
    };

    onChangeNodes([...nodes, newNode]);

    // If there was no starting node, make this the starting node
    if (!startNodeId) {
      setStartNodeId(newNode.id);
    }
  };

  // Edit node name dialog
  const handleNodeDoubleClick = (node: GraphNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) return;
    setEditingNode(node);
    setTempLabel(node.label);
  };

  const saveNodeName = () => {
    if (editingNode && tempLabel.trim()) {
      onChangeNodes(
        nodes.map((n) => (n.id === editingNode.id ? { ...n, label: tempLabel.trim() } : n))
      );
    }
    setEditingNode(null);
  };

  // Edit Edge Weight
  const handleEdgeClick = (edge: GraphEdge, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) return;
    if (mode === 'delete') {
      handleDeleteEdge(edge.id);
    } else {
      setEditingEdge(edge);
      setTempWeight(edge.weight.toString());
    }
  };

  const saveEdgeWeight = () => {
    if (editingEdge) {
      const parsed = parseInt(tempWeight, 10);
      const val = isNaN(parsed) || parsed < 0 ? 1 : parsed;
      onChangeEdges(
        edges.map((e) => (e.id === editingEdge.id ? { ...e, weight: val } : e))
      );
    }
    setEditingEdge(null);
  };

  // Status variables from active visualizer step
  const activeCurrentNode = activeStep ? activeStep.currentNode : null;
  const activeNeighborNode = activeStep ? activeStep.neighborNode : null;
  const visitedSet = new Set(activeStep ? activeStep.visitedNodes : []);
  const stepDistances = activeStep ? activeStep.distances : {};
  const highlightedEdgesSet = new Set(activeStep ? activeStep.highlightedEdges : []);
  const shortestPathEdgesSet = new Set(activeStep ? activeStep.shortestPathEdges : []);

  return (
    <div id="graph-panel-main" className="relative flex flex-col h-full bg-[#0d0d10] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* Dynamic Header Toolbar */}
      <div id="graph-toolbar" className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950/80 border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-1.5">
          <button
            id="tool-select"
            onClick={() => setMode('select')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              mode === 'select'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
            title="Chế độ chọn và di chuyển vật thể, kéo thả nền để dịch chuyển đồ thị"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Di chuyển</span>
          </button>

          <button
            id="tool-add-node"
            onClick={() => setMode('add_node')}
            disabled={isPlaying}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer ${
              mode === 'add_node'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
            title="Click vào nền để tạo nút mới"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Đỉnh</span>
          </button>

          <button
            id="tool-add-edge"
            onClick={() => setMode('add_edge')}
            disabled={isPlaying}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer ${
              mode === 'add_edge'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
            title="Sử dụng: Click đỉnh đầu, rồi click đỉnh thứ hai để tạo cạnh hoặc chỉnh sửa"
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Thêm Cạnh</span>
          </button>

          <button
            id="tool-delete"
            onClick={() => setMode('delete')}
            disabled={isPlaying}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer ${
              mode === 'delete'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
            title="Click vào nút hoặc cạnh để xóa"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa</span>
          </button>

          <div className="w-[1px] h-5 bg-slate-800 mx-1"></div>

          <button
            id="tool-toggle-directed"
            onClick={() => setIsDirected(!isDirected)}
            disabled={isPlaying}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer border ${
              isDirected
                ? 'bg-indigo-600/25 text-indigo-300 border-indigo-500/40 shadow-md ring-1 ring-indigo-500/10'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
            title="Bật/Tắt hướng của đồ thị (Đồ thị có hướng/vô hướng)"
          >
            <span>{isDirected ? 'Có hướng' : 'Vô hướng'}</span>
          </button>
        </div>

        {/* View Controls & Configs */}
        <div className="flex items-center gap-1.5">
          <button
            id="zoom-in"
            onClick={() => triggerZoom(1.15)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer transition-all border border-slate-800"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            id="zoom-out"
            onClick={() => triggerZoom(0.85)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer transition-all border border-slate-800"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            id="zoom-reset"
            onClick={resetPanZoom}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg cursor-pointer transition-all border border-slate-800"
            title="Đặt lại khung nhìn"
          >
            <Maximize className="w-4 h-4" />
          </button>
          <button
            id="toggle-instructions"
            onClick={() => setShowInstructions(!showInstructions)}
            className={`p-1.5 rounded-lg cursor-pointer transition-all border ${
              showInstructions 
                ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/30' 
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
            }`}
            title="Bật/Tắt hướng dẫn thao tác"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Instructions */}
      {showInstructions && (
        <div id="graph-instructions" className="text-[11px] px-3 py-1.5 bg-blue-950/15 text-blue-300 border-b border-blue-900/30 flex items-center justify-between gap-1.5 font-medium animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 shrink-0 text-blue-450" />
            <span>
              {mode === 'select' && 'Kéo thả đỉnh để di chuyển. Đúp click vào đỉnh đổi tên. Cuộn chuột để Thu phóng. Giữ chuột trái kéo ở vùng trống để Pan dịch canvas.'}
              {mode === 'add_node' && 'Mẹo: Click vào bất kỳ vị trí trống nào trên khung này để THÊM MỘT ĐỈNH mới.'}
              {mode === 'add_edge' && (edgeSourceId ? `Click đỉnh THỨ HAI để tạo cạnh với đỉnh nguồn: "${nodes.find(n => n.id === edgeSourceId)?.label}"` : 'Thao tác: Click vào một đỉnh bắt đầu (Nguồn), sau đó Click chọn đỉnh kết thúc (Đích) để tạo liên kết cạnh.')}
              {mode === 'delete' && 'Mẹo: Click trực tiếp vào một Đỉnh cũ hoặc Đường nối cạnh bất kỳ để Xóa nhanh khỏi đồ thị.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowInstructions(false)}
            className="p-0.5 hover:bg-blue-500/15 text-blue-400 hover:text-white rounded transition-colors cursor-pointer inline-flex items-center justify-center"
            title="Đóng hướng dẫn"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Custom Graphic Canvas */}
      <div className="flex-1 min-h-[350px] relative select-none overflow-hidden cursor-crosshair">
        <svg
          ref={svgRef}
          id="svg-graph-canvas"
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Defs block for glow filters and markers */}
          <defs>
            {/* Grid background for technical blueprint feeling */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(148, 163, 184, 0.08)" strokeWidth="1" />
            </pattern>
            
            {/* Edge highlights */}
            <filter id="glow-visited" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Arrow markers for directed edges */}
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="1"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#64748b" className="dark:fill-slate-500" />
            </marker>

            <marker
              id="arrow-highlight"
              viewBox="0 0 10 10"
              refX="1"
              refY="5"
              markerWidth="5.5"
              markerHeight="5.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#6366f1" />
            </marker>

            <marker
              id="arrow-shortest"
              viewBox="0 0 10 10"
              refX="1"
              refY="5"
              markerWidth="5.5"
              markerHeight="5.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Grid pattern background */}
          <rect width="100%" height="100%" fill="url(#grid)" className="pointer-events-none" />

          {/* Wrapper Group for Pan & Zoom transforms */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            
            {/* Drawing Connections/Edges */}
            <g id="canvas-edges">
              {edges.map((edge) => {
                const sourceNode = nodes.find((n) => n.id === edge.source);
                const targetNode = nodes.find((n) => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                // Color of edges depends on algorithms simulation state
                const isHighlight = highlightedEdgesSet.has(edge.id);
                const isShortestPath = shortestPathEdgesSet.has(edge.id);
                
                let strokeColor = 'stroke-slate-350 dark:stroke-slate-700';
                let strokeWidth = 3;
                let strokeDash = undefined;

                if (isShortestPath) {
                  strokeColor = 'stroke-amber-400 dark:stroke-amber-500';
                  strokeWidth = 5.5;
                } else if (isHighlight) {
                  strokeColor = 'stroke-indigo-500 dark:stroke-indigo-400';
                  strokeWidth = 4.5;
                }

                // Node radius offset calculation (so SVG arrow tip is drawn exactly at node circumference)
                const dx = targetNode.x - sourceNode.x;
                const dy = targetNode.y - sourceNode.y;
                const dist = Math.hypot(dx, dy);

                const radius = 22;
                const arrowOffset = 8; // Extra padding so arrow head visual fits cleanly outside circle border

                let x1 = sourceNode.x;
                let y1 = sourceNode.y;
                let x2 = targetNode.x;
                let y2 = targetNode.y;

                if (dist > 0) {
                  const ux = dx / dist;
                  const uy = dy / dist;
                  x1 = sourceNode.x + ux * radius;
                  y1 = sourceNode.y + uy * radius;
                  x2 = targetNode.x - ux * (radius + (isDirected ? arrowOffset : 1));
                  y2 = targetNode.y - uy * (radius + (isDirected ? arrowOffset : 1));
                }

                const midX = (sourceNode.x + targetNode.x) / 2;
                const midY = (sourceNode.y + targetNode.y) / 2;

                // Determine arrowhead color marker ID based on edge highlight state
                let markerId = 'arrow-default';
                if (isShortestPath) {
                  markerId = 'arrow-shortest';
                } else if (isHighlight) {
                  markerId = 'arrow-highlight';
                }
                const markerAttr = isDirected ? `url(#${markerId})` : undefined;

                return (
                  <g key={edge.id} className="group cursor-pointer">
                    {/* Interactive thick hover-zone line */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      className="stroke-transparent"
                      strokeWidth={15}
                      onClick={(e) => handleEdgeClick(edge, e)}
                    />
                    
                    {/* Visual line representation */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      className={`${strokeColor} transition-all duration-300`}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDash}
                      markerEnd={markerAttr}
                      id={`line-${edge.id}`}
                    />

                    {/* Weight Label Overlay inside a compact group */}
                    <g 
                      transform={`translate(${midX}, ${midY})`}
                      onClick={(e) => handleEdgeClick(edge, e)}
                    >
                      <rect
                        x="-18"
                        y="-10"
                        width="36"
                        height="20"
                        rx="4"
                        className="fill-white dark:fill-slate-950 stroke-slate-200 dark:stroke-slate-800 shadow-sm"
                        strokeWidth="1"
                      />
                      <text
                        className="fill-slate-700 dark:fill-slate-300 text-[11px] font-bold font-mono text-center select-none"
                        textAnchor="middle"
                        dominantBaseline="central"
                        y="0.5"
                      >
                        {edge.weight}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Temporary edge drawing when constructing edges */}
              {edgeSourceId && (
                (() => {
                  const srcNode = nodes.find((n) => n.id === edgeSourceId);
                  if (!srcNode) return null;
                  return (
                    <line
                      x1={srcNode.x}
                      y1={srcNode.y}
                      x2={mousePosition.x}
                      y2={mousePosition.y}
                      className="stroke-amber-500/80"
                      strokeWidth={2}
                      strokeDasharray="4,4"
                    />
                  );
                })()
              )}
            </g>

            {/* Drawing Nodes */}
            <g id="canvas-nodes">
              {nodes.map((node) => {
                const isStart = node.id === startNodeId;
                const isEnd = node.id === endNodeId;
                const isCurrent = node.id === activeCurrentNode;
                const isNeighbor = node.id === activeNeighborNode;
                const isVisited = visitedSet.has(node.id);

                // Determine styling classes based on role
                let fillClass = 'fill-white dark:fill-slate-900';
                let strokeClass = 'stroke-slate-400 dark:stroke-slate-600';
                let ringStroke = undefined;
                let strokeW = 2;

                if (isVisited) {
                  fillClass = 'fill-emerald-50 dark:fill-emerald-950/40';
                  strokeClass = 'stroke-emerald-500 dark:stroke-emerald-400';
                  strokeW = 2.5;
                }

                if (isNeighbor) {
                  fillClass = 'fill-violet-50 dark:fill-violet-950/40';
                  strokeClass = 'stroke-violet-500 dark:stroke-violet-400';
                  strokeW = 3;
                }

                if (isCurrent) {
                  fillClass = 'fill-blue-50 dark:fill-blue-950/40';
                  strokeClass = 'stroke-blue-600 dark:stroke-blue-400';
                  strokeW = 3.5;
                  ringStroke = (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="29"
                      fill="none"
                      className="stroke-blue-400/50 dark:stroke-blue-500/30 animate-ping pointer-events-none"
                      strokeWidth="2"
                    />
                  );
                }

                // Check Special Roles (Start, End take high visual cues)
                if (isStart) {
                  strokeClass = 'stroke-amber-500 dark:stroke-amber-400';
                  strokeW = 4;
                } else if (isEnd) {
                  strokeClass = 'stroke-rose-500 dark:stroke-rose-400';
                  strokeW = 4;
                }

                // Find step distance value for labels
                const nodeDist = stepDistances[node.id];
                const distanceLabel = nodeDist === undefined 
                  ? '∞' 
                  : (nodeDist === Infinity ? '∞' : nodeDist.toString());

                return (
                  <g
                    key={node.id}
                    transform={`translate(0, 0)`}
                    className="group"
                    id={`node-group-${node.id}`}
                  >
                    {/* Ring highlight helper */}
                    {ringStroke}

                    {/* Extra Outer Glow indicators for start / end nodes */}
                    {isStart && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="27"
                        fill="none"
                        className="stroke-amber-500/20"
                        strokeWidth="4"
                      />
                    )}
                    {isEnd && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="27"
                        fill="none"
                        className="stroke-rose-500/20"
                        strokeWidth="4"
                      />
                    )}

                    {/* Main Interactive Node Circle */}
                    <circle
                      data-node-id={node.id}
                      cx={node.x}
                      cy={node.y}
                      r="22"
                      className={`${fillClass} ${strokeClass} cursor-grab transition-colors duration-300`}
                      strokeWidth={strokeW}
                      onDoubleClick={(e) => handleNodeDoubleClick(node, e)}
                    />

                    {/* Node Text Label */}
                    <text
                      data-node-id={node.id}
                      x={node.x}
                      y={node.y}
                      className="fill-slate-800 dark:fill-slate-100 text-xs font-bold pointer-events-none select-none"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {node.label}
                    </text>

                    {/* Compact Distance Badges dynamically shown above nodes */}
                    <g transform={`translate(${node.x}, ${node.y - 33})`}>
                      <rect
                        x="-18"
                        y="-7.5"
                        width="36"
                        height="15"
                        rx="3"
                        className={`fill-slate-900/90 dark:fill-slate-950/95 stroke-none shadow-xs pointer-events-none`}
                      />
                      <text
                        className={`${
                          nodeDist === 0 ? 'fill-amber-400' : 'fill-slate-300'
                        } text-[9px] font-bold font-mono pointer-events-none select-none`}
                        textAnchor="middle"
                        dominantBaseline="central"
                        y="0.5"
                      >
                        {distanceLabel === '∞' ? '∞' : `d=${distanceLabel}`}
                      </text>
                    </g>

                    {/* Context Specific Quick Role Indicator Labels */}
                    {(isStart || isEnd) && (
                      <g transform={`translate(${node.x}, ${node.y + 33})`}>
                        <rect
                          x="-22"
                          y="-7"
                          width="44"
                          height="14"
                          rx="3"
                          className={`${
                            isStart 
                              ? 'fill-amber-500/10 stroke-amber-500/30' 
                              : 'fill-rose-500/10 stroke-rose-500/30'
                          } stroke`}
                          strokeWidth="0.5"
                        />
                        <text
                          className={`${
                            isStart ? 'fill-amber-600 dark:fill-amber-400' : 'fill-rose-600 dark:fill-rose-400'
                          } text-[8px] font-bold text-center pointer-events-none`}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {isStart ? 'BẮT ĐẦU' : 'ĐÍCH'}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Legend Overlay Block */}
        <div id="canvas-legend" className="absolute bottom-3 left-3 bg-[#0d0d10]/95 p-3 rounded-xl border border-slate-800/80 text-[10px] space-y-1.5 shadow-2xl text-slate-400 backdrop-blur-md">
          <div className="font-bold text-xs text-slate-100 border-b border-slate-800/80 pb-1 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Chú giải đồ thị</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950 border-2 border-amber-500 inline-block"></span>
              <span>Điểm đầu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950 border-2 border-rose-500 inline-block"></span>
              <span>Điểm cuối</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-400 inline-block shadow-[0_0_5px_rgba(59,130,246,0.5)] animate-pulse"></span>
              <span>Đang xét</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-600 border border-violet-400 inline-block"></span>
              <span>Láng giềng</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-emerald-400 inline-block"></span>
              <span>Đã duyệt</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-1 bg-amber-400 rounded inline-block"></span>
              <span>Đường tối ưu</span>
            </div>
          </div>
        </div>
      </div>

      {/* Editing Overlay Modal for Edge Weight */}
      {editingEdge && (
        <div id="modal-edge-weight" className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f13] rounded-2xl p-5 w-full max-w-sm border border-slate-800/80 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-base text-slate-100 mb-2">Chỉnh sửa trọng số cạnh</h3>
            <p className="text-xs text-slate-400 mb-4">
              Nhập trọng số (chi phí từ đại diện cho khoảng cách) giữa {nodes.find(n => n.id === editingEdge.source)?.label} và {nodes.find(n => n.id === editingEdge.target)?.label}:
            </p>
            <div className="flex gap-2 items-center mb-4">
              <button
                type="button"
                onClick={() => setTempWeight(Math.max(1, parseInt(tempWeight, 10) - 1).toString())}
                className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-bold text-lg"
              >
                -
              </button>
              <input
                id="input-weight-field"
                type="number"
                min="1"
                value={tempWeight}
                onChange={(e) => setTempWeight(e.target.value)}
                className="flex-1 text-center font-bold text-lg px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setTempWeight((parseInt(tempWeight, 10) + 1 || 1).toString())}
                className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-bold text-lg"
              >
                +
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditingEdge(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={saveEdgeWeight}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editing Overlay Modal for Node Label */}
      {editingNode && (
        <div id="modal-node-rename" className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-2">Đổi tên đỉnh</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Nhập tên nhãn đại diện ngắn gọn cho đỉnh:
            </p>
            <input
              id="input-node-label"
              type="text"
              maxLength={15}
              value={tempLabel}
              onChange={(e) => setTempLabel(e.target.value)}
              className="w-full text-center font-bold px-3 py-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4 text-slate-900 dark:text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditingNode(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={saveNodeName}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
