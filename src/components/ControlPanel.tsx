import React, { useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  Sliders, 
  PlusCircle, 
  FileText,
  Layers,
  Shuffle
} from 'lucide-react';
import { GraphNode, GraphEdge, DijkstraStep, SavedPreset } from '../types';
import { presets } from '../data/presets';

interface ControlPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  startNodeId: string;
  endNodeId: string | null;
  setStartNodeId: (id: string) => void;
  setEndNodeId: (id: string | null) => void;
  
  // Steps & controls
  steps: DijkstraStep[];
  currentStepIndex: number;
  setCurrentStepIndex: (idx: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  
  // Speed
  playbackSpeed: number; // ms
  setPlaybackSpeed: (speed: number) => void;

  // Presets load & graph modifiers
  onLoadPreset: (preset: SavedPreset) => void;
  onClearGraph: () => void;
  onGenerateRandom: () => void;
}

export default function ControlPanel({
  nodes,
  edges,
  startNodeId,
  endNodeId,
  setStartNodeId,
  setEndNodeId,
  steps,
  currentStepIndex,
  setCurrentStepIndex,
  isPlaying,
  setIsPlaying,
  playbackSpeed,
  setPlaybackSpeed,
  onLoadPreset,
  onClearGraph,
  onGenerateRandom
}: ControlPanelProps) {

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Playback timer ticker
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1);
        } else {
          setIsPlaying(false);
        }
      }, playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentStepIndex, steps.length, playbackSpeed]);

  const handleStepBack = () => {
    setIsPlaying(false);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleTogglePlay = () => {
    if (currentStepIndex >= steps.length - 1) {
      // Loop reset automatically to step 0
      setCurrentStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  return (
    <div id="controls-panel-container" className="flex flex-col gap-5 bg-[#0d0d10] p-4.5 rounded-2xl border border-slate-800/80 shadow-2xl h-full overflow-y-auto select-none min-h-0 scrollbar-thin scrollbar-thumb-slate-800/80">
      
      {/* 1. Preset Selector & Graph Setup */}
      <div id="setup-section" className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
          <Layers className="text-blue-400 w-4 h-4" />
          <h3 className="font-bold text-sm text-slate-100">Đồ thị mẫu & Khởi tạo</h3>
        </div>

        {/* Preset selections */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Chọn mẫu đồ thị</label>
          <div className="grid grid-cols-1 gap-1.5">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onLoadPreset(preset)}
                className="flex items-center justify-between text-left px-3 py-2 text-xs font-semibold rounded-xl border border-slate-800/80 bg-[#07070a]/40 hover:border-blue-500 hover:bg-slate-900/65 text-slate-350 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>{preset.name}</span>
                </div>
                <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded-lg border border-slate-800/80 text-slate-400 font-mono">
                  {preset.nodes.length} đỉnh
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
          <button
            type="button"
            onClick={onGenerateRandom}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-indigo-950/40 border border-indigo-900 text-indigo-300 hover:bg-indigo-900/50 cursor-pointer transition-all"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Tạo Ngẫu Nhiên</span>
          </button>
          <button
            type="button"
            onClick={onClearGraph}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-rose-950/40 border border-rose-900 text-rose-300 hover:bg-rose-900/50 cursor-pointer transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xóa Đồ Thị</span>
          </button>
        </div>
      </div>

      {/* 2. Path Settings (Start & Target Selector) */}
      <div id="path-settings-section" className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
          <Sliders className="text-amber-400 w-4 h-4" />
          <h3 className="font-bold text-sm text-slate-100">Cài đặt Đỉnh Bắt đầu & Kết thúc</h3>
        </div>

        {/* Select Start Node */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Chọn đỉnh Khởi Đầu (S)</label>
          <select
            id="start-node-dropdown"
            value={startNodeId}
            onChange={(e) => setStartNodeId(e.target.value)}
            disabled={isPlaying}
            className="w-full text-xs font-semibold px-3 py-2 border border-slate-800 bg-[#07070a] rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-200 cursor-pointer"
          >
            {nodes.length === 0 && <option value="">(Không có đỉnh nào)</option>}
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}  ({node.id})
              </option>
            ))}
          </select>
        </div>

        {/* Select End Node */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Chọn điểm Kết Thúc (T)</label>
          <select
            id="end-node-dropdown"
            value={endNodeId || ''}
            onChange={(e) => {
              const val = e.target.value;
              setEndNodeId(val === '' ? null : val);
            }}
            disabled={isPlaying}
            className="w-full text-xs font-semibold px-3 py-2 border border-slate-800 bg-[#07070a] rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-200 cursor-pointer"
          >
            <option value="">Không có (Duyệt toàn bộ đồ thị)</option>
            {nodes
              .filter((node) => node.id !== startNodeId)
              .map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label} ({node.id})
                </option>
              ))}
          </select>
        </div>

        <p className="text-[10px] text-slate-500 leading-normal">
          * Khi không đặt Đỉnh kết thúc, thuật toán chạy Dijkstra đầy đủ để tìm cực tiểu tới mọi đỉnh có đường truyền.
        </p>
      </div>

      {/* 3. Playback Controller Engine */}
      <div id="playback-section" className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
          <div className="flex items-center gap-2">
            <Play className="text-green-400 w-4 h-4" />
            <h3 className="font-bold text-sm text-slate-100">Điều khiển Trực quan hóa</h3>
          </div>
          {steps.length > 0 && (
            <span id="step-index-badge" className="text-[10px] bg-[#07070a] border border-slate-800 px-2.5 py-0.5 rounded-full font-mono text-slate-400">
              Bước {currentStepIndex + 1} / {steps.length}
            </span>
          )}
        </div>

        {/* Live Step Progress Slider bar */}
        <div className="space-y-1.5">
          <input
            id="step-timeline-slider"
            type="range"
            min="0"
            max={Math.max(0, steps.length - 1)}
            value={currentStepIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStepIndex(parseInt(e.target.value, 10));
            }}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Action Media Triggers */}
        <div className="flex items-center justify-center gap-2">
          {/* Back 1 step */}
          <button
            type="button"
            onClick={handleStepBack}
            disabled={currentStepIndex === 0}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 hover:text-slate-150 text-slate-350 rounded-xl cursor-pointer transition-all disabled:opacity-40"
            title="Lùi lại 1 bước"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Toggle Play / Pause */}
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={steps.length <= 1}
            className={`p-3 text-white rounded-xl shadow-md transition-all cursor-pointer transform hover:scale-105 ${
              isPlaying 
                ? 'bg-amber-500 hover:bg-amber-600' 
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-40`}
            title={isPlaying ? 'Tạm dừng chạy tự động' : 'Bắt đầu trực quan tự động'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>

          {/* Forward 1 Step */}
          <button
            type="button"
            onClick={handleStepForward}
            disabled={currentStepIndex >= steps.length - 1}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 hover:text-slate-150 text-slate-350 rounded-xl cursor-pointer transition-all disabled:opacity-40"
            title="Tiến lên 1 bước"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Refresh/Reset back to 0 */}
          <button
            type="button"
            onClick={handleReset}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 hover:text-slate-150 text-slate-350 rounded-xl cursor-pointer transition-all"
            title="Đặt lại từ đầu bước 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Adjustment Sliders */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>Tốc độ: {(1000 / playbackSpeed).toFixed(1)} bước/giây</span>
            <span>{playbackSpeed}ms</span>
          </div>
          <input
            id="playback-speed-slider"
            type="range"
            min="150"
            max="1800"
            step="50"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseInt(e.target.value, 10))}
            className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
