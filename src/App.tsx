import React, { useState, useMemo, useEffect } from 'react';
import { GraphNode, GraphEdge, CodeLanguage, SavedPreset } from './types';
import { runDijkstra } from './algorithms/dijkstra';
import { presets, travelMapPreset } from './data/presets';
import GraphCanvas from './components/GraphCanvas';
import CodeViewer from './components/CodeViewer';
import ControlPanel from './components/ControlPanel';
import StatsPanel from './components/StatsPanel';
import { 
  Network, 
  HelpCircle, 
  Settings, 
  Zap, 
  Code, 
  PlayCircle,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Github,
  Terminal,
  BookOpen
} from 'lucide-react';

export default function App() {
  // Graph States
  const [nodes, setNodes] = useState<GraphNode[]>(travelMapPreset.nodes);
  const [edges, setEdges] = useState<GraphEdge[]>(travelMapPreset.edges);
  const [startNodeId, setStartNodeId] = useState<string>('HN');
  const [endNodeId, setEndNodeId] = useState<string | null>('SG');
  const [isDirected, setIsDirected] = useState<boolean>(true); // Default to directed to show arrows clearly

  // Visualization Player States
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(800); // ms per step
  
  // Tracking Active Code Language
  const [language, setLanguage] = useState<CodeLanguage>('pseudo-c');

  // Tracking Active Tab ('stats' for hand-solved trace table, 'code' for code trace viewer)
  const [activeTab, setActiveTab] = useState<'stats' | 'code'>('stats');

  // Dialog / Help
  const [showTutorial, setShowTutorial] = useState<boolean>(true);

  // Auto-calculated Steps
  const steps = useMemo(() => {
    if (!startNodeId || nodes.length === 0) return [];
    return runDijkstra(nodes, edges, startNodeId, endNodeId, isDirected);
  }, [nodes, edges, startNodeId, endNodeId, isDirected]);

  // Adjust step index bound safety whenever step counts shrink/grow
  useEffect(() => {
    if (currentStepIndex >= steps.length) {
      setCurrentStepIndex(Math.max(0, steps.length - 1));
    }
  }, [steps.length]);

  const activeStep = steps.length > 0 ? steps[currentStepIndex] : null;

  // Handler for loaded presets
  const handleLoadPreset = (preset: SavedPreset) => {
    setIsPlaying(false);
    setNodes(preset.nodes);
    setEdges(preset.edges);
    
    // Choose start/end safely based on new nodes
    if (preset.nodes.length > 0) {
      setStartNodeId(preset.nodes[0].id);
      if (preset.nodes.length > 1) {
        setEndNodeId(preset.nodes[preset.nodes.length - 1].id);
      } else {
        setEndNodeId(null);
      }
    } else {
      setStartNodeId('');
      setEndNodeId(null);
    }
    setCurrentStepIndex(0);
  };

  // Handler for clearing graph entirely
  const handleClearGraph = () => {
    setIsPlaying(false);
    setNodes([]);
    setEdges([]);
    setStartNodeId('');
    setEndNodeId(null);
    setCurrentStepIndex(0);
  };

  // Generate random constellation
  const handleGenerateRandom = () => {
    setIsPlaying(false);
    
    const count = 7;
    const padding = 60;
    const width = 750;
    const height = 450;
    
    const newNodes: GraphNode[] = [];
    
    // Generate scattered points
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      // Scatter in a ring/diamond configuration to look structured
      const x = Math.round(width / 2 + Math.cos(angle) * (width / 3) + (Math.random() - 0.5) * 60);
      const y = Math.round(height / 2 + Math.sin(angle) * (height / 2.8) + (Math.random() - 0.5) * 40);
      
      newNodes.push({
        id: `node-${Date.now()}-${i}`,
        label: String.fromCharCode(65 + i), // A, B, C, D, E...
        x: Math.max(padding, Math.min(width - padding, x)),
        y: Math.max(padding, Math.min(height - padding, y))
      });
    }

    // Creating beautiful interconnected mesh with random weights
    const newEdges: GraphEdge[] = [];
    let edgeIdIdx = 1;
    
    // Nearest neighbor connections to avoid weird long crossings
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const n1 = newNodes[i];
        const n2 = newNodes[j];
        const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
        
        // Connect if close or with some random addition to guarantee connectivity
        if (dist < 320 || (i === j - 1)) {
          const randWeight = Math.floor(Math.random() * 12) + 2; // Weights between 2 and 14
          newEdges.push({
            id: `edge-${Date.now()}-${edgeIdIdx++}`,
            source: n1.id,
            target: n2.id,
            weight: randWeight
          });
        }
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
    setStartNodeId(newNodes[0].id);
    setEndNodeId(newNodes[newNodes.length - 1].id);
    setCurrentStepIndex(0);
  };

  return (
    <div id="root-layout" className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#070709] text-slate-300 flex flex-col font-sans selection:bg-blue-500/30 selection:text-white">
      
      {/* Bento Header Navigation */}
      <header id="app-header" className="bg-[#09090c]/90 border-b border-slate-900 shrink-0 z-30 shadow-md backdrop-blur-md px-6 py-2">
        <div className="max-w-[1850px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img 
              src="./favicon.ico" 
              alt="Logo" 
              className="w-11 h-11 rounded-md object-contain bg-slate-900/20 border border-slate-800/60 shadow-md shadow-blue-500/5 transition-transform duration-200 hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-xs font-black text-white tracking-wider flex items-center gap-2">
                DIJKSTRA VISUALIZE
                <span className="text-[8.5px] text-blue-400 font-mono tracking-wider bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-900/30 font-bold uppercase">
                  Trực quan hóa Thuật toán & Giải Tay
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Status Badges */}
            <div className="flex items-center bg-[#0d0d12] rounded-lg p-0.5 border border-slate-900 text-[9.5px] font-mono font-bold">
              <div className="px-2 py-0.5 text-slate-400">
                NGUỒN (S): <span className="text-blue-400">{nodes.find(n => n.id === startNodeId)?.label || 'Chưa chọn'}</span>
              </div>
              <div className="px-2 py-0.5 text-slate-400 border-l border-slate-900">
                ĐÍCH (T): <span className="text-emerald-400">{endNodeId ? (nodes.find(n => n.id === endNodeId)?.label || 'Duyệt hết') : 'Duyệt hết'}</span>
              </div>
            </div>

            <button
              onClick={() => setShowTutorial(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 text-slate-350 transition-all cursor-pointer shadow-sm"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Hướng Dẫn</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Wrapper - Optimized 50-50 Left/Right Workspace Split */}
      <main id="main-workspace-grid" className="flex-1 max-w-[1850px] w-full mx-auto p-3 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
        
        {/* LEFT PORTION: Main Graph Canvas Container Card (Takes 50% width on screen) */}
        <div className="flex-1 lg:h-full min-h-[380px] flex flex-col bg-[#0d0d10] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative">
          {/* Dynamic Overlay Warning if nodes count is 0 */}
          {nodes.length === 0 && (
            <div id="graph-empty-state-alert" className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/75 backdrop-blur-xs">
              <div className="bg-[#0f0f13] border border-amber-900/30 p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center flex flex-col items-center gap-3.5 animate-in zoom-in-95 duration-200 animate-pulse">
                <AlertTriangle className="w-9 h-9 text-amber-400" />
                <div className="space-y-1.5">
                  <h4 className="font-bold text-xs text-amber-200 uppercase tracking-wider">Đồ thị hiện trống!</h4>
                  <p className="text-[11px] text-slate-450 leading-relaxed">
                    Hãy nạp ngay đồ thị mẫu hoặc nhấp nút tạo ngẫu nhiên dưới thanh điều khiển để trải nghiệm.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 w-full pt-1.5">
                  <button
                    onClick={handleGenerateRandom}
                    className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer transition-all shadow-md"
                  >
                    Tạo Đồ Thị Ngẫu Nhiên
                  </button>
                  <button
                    onClick={() => handleLoadPreset(travelMapPreset)}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-[#1e293b] hover:bg-[#334155] text-slate-200 rounded-xl cursor-pointer border border-slate-805 transition-all"
                  >
                    Tải Đồ Thị Việt Nam Mẫu
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Graph Visual Canvas viewport */}
          <div className="flex-1 min-h-0 relative">
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              onChangeNodes={setNodes}
              onChangeEdges={setEdges}
              startNodeId={startNodeId}
              endNodeId={endNodeId}
              setStartNodeId={setStartNodeId}
              setEndNodeId={setEndNodeId}
              activeStep={activeStep}
              isPlaying={isPlaying}
              isDirected={isDirected}
              setIsDirected={setIsDirected}
            />
          </div>

          {/* INTEGRATED COMPACT TOOLBAR AT CANVAS BOTTOM */}
          <div className="bg-[#09090c]/98 border-t border-slate-900/80 px-4 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs shrink-0 select-none z-10 font-sans">
            
            {/* Preset & Setup controls Block */}
            <div className="flex items-center gap-2">
              {/* Presets load dropdown selector */}
              <select
                aria-label="Chọn đồ thị mẫu"
                value=""
                onChange={(e) => {
                  const preset = presets.find(p => p.name === e.target.value);
                  if (preset) handleLoadPreset(preset);
                }}
                className="bg-slate-950 border border-slate-800 text-[11px] font-bold py-1 px-2 rounded-lg cursor-pointer text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="" disabled>Tải Đồ Thị Mẫu...</option>
                {presets.map((preset, idx) => (
                  <option key={idx} value={preset.name}>
                    {preset.name} ({preset.nodes.length} đỉnh)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleGenerateRandom}
                className="p-1 px-1.5 rounded-lg bg-indigo-950/40 border border-indigo-900/60 text-indigo-300 hover:bg-indigo-900/40 cursor-pointer text-[10.5px] font-bold transition-all flex items-center gap-1"
                title="Tạo đồ thị ngẫu nhiên"
              >
                <span>Ngẫu nhiên</span>
              </button>

              <button
                type="button"
                onClick={handleClearGraph}
                className="p-1 px-1.5 rounded-lg bg-rose-950/20 border border-rose-900/40 text-rose-300 hover:bg-rose-900/30 cursor-pointer text-[10.5px] font-bold transition-all flex items-center gap-1"
                title="Xóa đồ thị để tự vẽ"
              >
                <span>↺ Xóa</span>
              </button>
            </div>

            {/* Start & End selector controls */}
            <div className="flex items-center gap-2 bg-slate-950 bg-opacity-70 border border-slate-900 px-2.5 py-0.5 rounded-lg">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Nguồn (S):</span>
              <select
                aria-label="Chọn đỉnh bắt đầu"
                value={startNodeId}
                onChange={(e) => setStartNodeId(e.target.value)}
                disabled={isPlaying}
                className="bg-transparent border-none text-[11.5px] font-black text-blue-400 cursor-pointer focus:outline-none"
              >
                {nodes.map((node) => (
                  <option key={node.id} value={node.id} className="bg-[#0f0f13] text-slate-200">
                    {node.label}
                  </option>
                ))}
              </select>

              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight border-l border-slate-900 pl-2 ml-1">Đích (T):</span>
              <select
                aria-label="Chọn đỉnh kết thúc"
                value={endNodeId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setEndNodeId(val === '' ? null : val);
                }}
                disabled={isPlaying}
                className="bg-transparent border-none text-[11.5px] font-black text-emerald-400 cursor-pointer focus:outline-none"
              >
                <option value="" className="bg-[#0f0f13] text-slate-400">Tất cả</option>
                {nodes
                  .filter((node) => node.id !== startNodeId)
                  .map((node) => (
                    <option key={node.id} value={node.id} className="bg-[#0f0f13] text-slate-200">
                      {node.label}
                    </option>
                  ))}
              </select>
            </div>

            {/* Media play Controls Block */}
            <div className="flex items-center gap-1.5">
              {/* Step back player */}
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  if (currentStepIndex > 0) setCurrentStepIndex(currentStepIndex - 1);
                }}
                disabled={currentStepIndex === 0}
                className="p-1 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-white border border-slate-800 rounded-md cursor-pointer transition-all disabled:opacity-30"
                title="Lùi 1 bước"
              >
                ◀
              </button>

              {/* Play Pause Button */}
              <button
                type="button"
                onClick={() => {
                  if (currentStepIndex >= steps.length - 1) {
                    setCurrentStepIndex(0);
                    setIsPlaying(true);
                  } else {
                    setIsPlaying(!isPlaying);
                  }
                }}
                disabled={steps.length <= 1}
                className={`p-1 px-3 text-[11px] font-black text-white rounded-md transition-all shadow-md cursor-pointer ${
                  isPlaying 
                    ? 'bg-amber-600 hover:bg-amber-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-30`}
              >
                {isPlaying ? '⏸ TẠM DỪNG' : '▶ BẮT ĐẦU'}
              </button>

              {/* Step forward player */}
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  if (currentStepIndex < steps.length - 1) setCurrentStepIndex(currentStepIndex + 1);
                }}
                disabled={currentStepIndex >= steps.length - 1}
                className="p-1 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-white border border-slate-800 rounded-md cursor-pointer transition-all disabled:opacity-30"
                title="Tiến 1 bước"
              >
                ▶
              </button>

              {/* Reset button player */}
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStepIndex(0);
                }}
                className="p-1 px-1.5 bg-slate-950 hover:bg-slate-900 text-slate-350 hover:text-white border border-slate-850 rounded-md cursor-pointer transition-all"
                title="Khởi động lại từ bước 1"
              >
                ↺ Đặt lại
              </button>
            </div>

            {/* Progress Slider block */}
            <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded-lg border border-slate-900 max-w-[150px] w-full shrink-0">
              <input
                aria-label="Thanh trượt bước"
                type="range"
                min="0"
                max={Math.max(0, steps.length - 1)}
                value={currentStepIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentStepIndex(parseInt(e.target.value, 10));
                }}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              {steps.length > 0 && (
                <span className="text-[9.5px] font-mono text-slate-500 shrink-0 font-bold">
                  {currentStepIndex + 1}/{steps.length}
                </span>
              )}
            </div>

            {/* Speed Slider block */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9.5px] font-mono text-slate-500 shrink-0">Tốc độ:</span>
              <input
                aria-label="Thanh trượt tốc độ"
                type="range"
                min="200"
                max="1800"
                step="100"
                value={2000 - playbackSpeed} // inverse logic for direct scale feeling
                onChange={(e) => setPlaybackSpeed(2000 - parseInt(e.target.value, 10))}
                className="h-1 w-11 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

          </div>

        </div>

        {/* RIGHT PORTION: Tab Switcher & The Selected View Panel (Takes other 50% width on screen) */}
        <div id="right-workspace-column" className="flex-1 lg:h-full min-h-[400px] flex flex-col gap-3">
          
          {/* INTERACTIVE CONTROLS / SELECTOR BAR AT THE TOP OF THE PANEL */}
          <div id="panel-tab-switcher" className="shrink-0 flex items-center justify-between gap-2 bg-[#09090c]/90 border border-slate-800/60 rounded-xl p-1.5 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono pl-1.5">
                Bảng hiển thị:
              </span>
            </div>

            <div className="flex bg-[#030305] p-0.5 rounded-lg border border-slate-900">
              <button
                type="button"
                onClick={() => setActiveTab('stats')}
                className={`px-3.5 py-1 rounded-md text-xs font-bold font-sans flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'stats'
                    ? 'bg-blue-600/25 border border-blue-500/30 text-blue-300 font-extrabold shadow-sm'
                    : 'text-slate-450 hover:text-slate-200 border border-transparent'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Bảng giải tay dọn sẵn</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`px-3.5 py-1 rounded-md text-xs font-bold font-sans flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'code'
                    ? 'bg-pink-600/21 border border-pink-500/30 text-pink-300 font-extrabold shadow-sm'
                    : 'text-slate-450 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-pink-400" />
                <span>Trình theo dõi mã nguồn</span>
              </button>
            </div>

            <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono text-slate-500 font-semibold pr-2 select-none">
              <span>Liên kết:</span>
              <span className="text-emerald-400 font-black animate-pulse">● ĐỒNG BỘ</span>
            </div>
          </div>

          {/* Selected Auxiliary View Panel taking remaining height */}
          <div id="right-workspace-content" className="flex-1 min-h-0 flex flex-col relative">
            {activeTab === 'stats' ? (
              <div className="flex-1 h-full min-h-0 flex flex-col animate-in fade-in duration-200">
                <StatsPanel
                  nodes={nodes}
                  edges={edges}
                  startNodeId={startNodeId}
                  endNodeId={endNodeId}
                  activeStep={activeStep}
                  isDirected={isDirected}
                />
              </div>
            ) : (
              <div className="flex-1 h-full min-h-0 flex flex-col animate-in fade-in duration-200">
                <CodeViewer
                  language={language}
                  setLanguage={setLanguage}
                  activeStep={activeStep}
                />
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Fullscreen Compact Footer */}
      <footer id="app-footer" className="bg-[#09090c] border-t border-slate-900 py-1.5 shrink-0 text-center text-[10px] text-slate-500">
        <div className="max-w-[1850px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-1">
          <div className="flex items-center gap-1 font-mono">
            <Zap className="w-3 h-3 text-blue-500 animate-pulse" />
            <span>Dijkstra Visualize Layout — Interactive University Workbench</span>
          </div>
          <div className="text-slate-650 font-medium">
            <span>Thiết kế tối ưu hóa 2 cột toàn màn hình • Trực quan hóa giải đồ thị bằng tay chuẩn sư phạm</span>
          </div>
        </div>
      </footer>

      {/* Quick Tutoring Card (Modal Dialog overlay) */}
      {showTutorial && (
        <div id="tutorial-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
          <div id="tutorial-alert-card" className="bg-[#0f0f13] border border-slate-800/80 p-6 rounded-2xl relative shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-200">
            <div className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 cursor-pointer pointer-events-auto">
              <button onClick={() => setShowTutorial(false)} className="text-xs font-mono font-bold hover:underline select-none">
                Đóng [x]
              </button>
            </div>
            <div className="flex gap-4">
              <div className="w-11 h-11 rounded-full bg-blue-950/80 border border-blue-900/40 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <Zap className="w-5 h-5 animate-bounce" />
              </div>
              <div className="space-y-4">
                <h4 className="font-extrabold text-base text-slate-100 uppercase tracking-widest flex items-center gap-2">
                  <span>Học Tập & Trải Nghiệm Dijkstra</span>
                  <span className="text-[10px] font-mono font-semibold bg-blue-950 px-2 py-0.5 rounded border border-blue-900 text-blue-400 normal-case tracking-normal">Bento Grid Cockpit</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400 leading-relaxed">
                  <div>
                    <span className="font-bold text-slate-100 block mb-1 border-b border-slate-805 pb-1">1. Tùy Biến Đồ Thị</span>
                    Click đúp vùng trống để thêm đỉnh, click nối đỉnh nguồn và đích để tạo cạnh. Kéo thả đỉnh để bố cục lại. Click đứt một đỉnh/cạnh để xóa trong nháy mắt.
                  </div>
                  <div>
                    <span className="font-bold text-slate-100 block mb-1 border-b border-slate-805 pb-1">2. Zoom & Cuộn Chuột</span>
                    <strong>Cuộn lăn nút giữa chuột</strong> trực tiếp trên đồ thị để Phóng to / Thu nhỏ. Giữ chuột trái kéo thả ở vùng trống để dịch chuyển linh hoạt.
                  </div>
                  <div>
                    <span className="font-bold text-slate-100 block mb-1 border-b border-slate-805 pb-1">3. Step-by-Step Code</span>
                    Nhấp chạy tự động hoặc chuyển tiếp từng bước để xem khối mã nguồn đồng bộ trực quang hóa hàng đợi Priority Queue biến đổi theo từng nhịp xử lý.
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-850 flex justify-end">
                  <button
                    onClick={() => setShowTutorial(false)}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Bắt đầu Trải Nghiệm Màn Hỏi Đáp Sư Phạm!
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
