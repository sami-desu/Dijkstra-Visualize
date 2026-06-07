import React, { useState, useMemo, useEffect } from 'react';
import { codeTemplates, DSType } from '../algorithms/codeTemplates';
import { CodeLanguage, DijkstraStep } from '../types';
import { Code, Terminal, Zap, BarChart3, Play, Layers, Sparkles, RefreshCw, Info } from 'lucide-react';

interface CodeViewerProps {
  language: CodeLanguage;
  setLanguage: (lang: CodeLanguage) => void;
  activeStep: DijkstraStep | null;
}

export default function CodeViewer({
  language,
  setLanguage,
  activeStep
}: CodeViewerProps) {
  // Primary modes: 'code' (code view tracking) or 'benchmark' (visual performance sim)
  const [activeMode, setActiveMode] = useState<'code' | 'benchmark'>('code');
  
  // Data Structure Type for the code viewer
  const [dsType, setDsType] = useState<DSType>('pq');

  // Benchmark States
  const [benchNodes, setBenchNodes] = useState<number>(120);
  const [benchDensity, setBenchDensity] = useState<'sparse' | 'medium' | 'dense'>('medium');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  // Simulation statistical results
  const [simResults, setSimResults] = useState<{
    array: {
      findMinOps: number;
      relaxOps: number;
      totalOps: number;
      timeMs: number;
    };
    pq: {
      findMinOps: number;
      relaxOps: number;
      totalOps: number;
      timeMs: number;
    };
  } | null>(null);

  // Auto-run simulation once initially or when parameters change (non-blocking)
  useEffect(() => {
    // Generate static preview results before run is clicked
    runCalculation(benchNodes, benchDensity, true);
  }, [benchNodes, benchDensity]);

  // Actual computation logic based on theoretical counts with physical jitter for simulation effect
  const runCalculation = (v: number, density: 'sparse' | 'medium' | 'dense', isPreview: boolean = false) => {
    // Number of edges based on density
    let e = 0;
    if (density === 'sparse') {
      e = Math.round(1.5 * v);
    } else if (density === 'medium') {
      e = Math.round(4 * v);
    } else {
      // Dense graph: up to 20% of maximum possible edges
      e = Math.round(0.2 * v * (v - 1));
    }

    // 1. Array-based Dijkstra metrics:
    // - find_min is done V times, scanning V items. Ops = V * V
    // - relaxation is done for all edges: E updates, each taking O(1)
    const arrayFindMinOps = v * v;
    const arrayRelaxOps = e;
    const arrayTotal = arrayFindMinOps + arrayRelaxOps;
    // Estimated time in MS: say 1 operation takes ~0.025 microseconds
    const arrayTime = parseFloat(((arrayTotal * 0.015) / 100).toFixed(3));

    // 2. PQ-based Dijkstra metrics (Binary Heap):
    // - extract_min is done V times, each taking log2(V) comparison steps
    const logV = Math.max(1, Math.log2(v));
    const pqFindMinOps = Math.round(v * logV);
    // - relaxation triggers push/decrease_key, up to E times, each taking log2(V)
    const pqRelaxOps = Math.round(e * logV);
    const pqTotal = pqFindMinOps + pqRelaxOps;
    // Heap operations have overhead, say 1 heap op takes ~0.065 microseconds
    const pqTime = parseFloat(((pqTotal * 0.045) / 100).toFixed(3));

    const results = {
      array: {
        findMinOps: arrayFindMinOps,
        relaxOps: arrayRelaxOps,
        totalOps: arrayTotal,
        timeMs: Math.max(0.01, arrayTime),
      },
      pq: {
        findMinOps: pqFindMinOps,
        relaxOps: pqRelaxOps,
        totalOps: pqTotal,
        timeMs: Math.max(0.01, pqTime),
      }
    };

    if (isPreview && !simResults) {
      setSimResults(results);
    } else if (!isPreview) {
      setSimResults(results);
    }
  };

  const handleStartSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setProgress(15);

    // Rapid update timers to simulate real-time performance processing
    let currentProgress = 15;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 20) + 10;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        runCalculation(benchNodes, benchDensity, false);
        setIsSimulating(false);
      }
      setProgress(currentProgress);
    }, 120);
  };

  const currentTemplate = codeTemplates[language][dsType];
  const activeLineKey = activeStep ? activeStep.codeLineKey : '';

  // Auto-scroll to active code line in simulation step
  useEffect(() => {
    if (activeStep && activeMode === 'code') {
      const activeEl = document.getElementById('active-code-line');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [activeLineKey, activeMode, language, dsType, activeStep]);

  // Simple clean tokenizer for syntax coloring
  const formatSyntaxLine = (text: string) => {
    if (text.trim().startsWith('//') || text.trim().startsWith('#')) {
      return <span className="text-emerald-500 font-normal italic">{text}</span>;
    }

    const keywords = [
      'function', 'void', 'def', 'while', 'for', 'each', 'if', 'else', 'return',
      'break', 'continue', 'const', 'let', 'var', 'and', 'not', 'in', 'float'
    ];

    const types = [
      'vector', 'int', 'pair', 'pair<int, int>', 'priority_queue', 'false', 'true',
      'INFINITY', 'INF', 'NULL', 'visited', 'dist', 'prev', 'pq'
    ];

    const words = text.split(/(\s+|\(|\)|\{|\}|\[|\]|:|,|==|===|\+|<|=|;)/);

    return words.map((word, i) => {
      const cleanWord = word.trim();
      if (keywords.includes(cleanWord)) {
        return <span key={i} className="text-pink-500 font-semibold">{word}</span>;
      }
      if (types.includes(cleanWord)) {
        return <span key={i} className="text-cyan-400 font-medium">{word}</span>;
      }
      if (/^\d+$/.test(cleanWord)) {
        return <span key={i} className="text-amber-400 font-mono">{word}</span>;
      }
      if (cleanWord.endsWith(')')) {
        return <span key={i} className="text-blue-300">{word}</span>;
      }
      return <span key={i} className="text-slate-100">{word}</span>;
    });
  };

  return (
    <div id="code-viewer-panel" className="bg-[#0c0c10] border border-slate-800/80 rounded-2xl p-4 flex flex-col h-full shadow-2xl relative overflow-hidden">
      
      {/* Decorative ambient background lights */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SWITCH PANEL - Dual Workspace (Viewer or Simulator) */}
      <div id="code-viewer-header" className="shrink-0 flex items-center justify-between flex-wrap gap-3 mb-3 border-b border-slate-800/80 pb-3 relative z-10">
        
        {/* Workspace Selector Tabs */}
        <div className="flex bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveMode('code')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 cursor-pointer transition-all ${
              activeMode === 'code'
                ? 'bg-gradient-to-r from-pink-500/20 to-indigo-500/20 border border-slate-700/80 text-pink-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-pink-500" />
            <span>Xem & Theo dõi Code</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('benchmark')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-sans flex items-center gap-1.5 cursor-pointer transition-all ${
              activeMode === 'benchmark'
                ? 'bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border border-slate-700/80 text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="flex items-center gap-1">
              Mô phỏng hiệu suất
              <span className="bg-indigo-500/20 text-indigo-300 text-[8px] font-black uppercase px-1 rounded tracking-wide border border-indigo-500/30">So sánh</span>
            </span>
          </button>
        </div>

        {/* Dynamic Context Tabs right corner based on Workspace mode */}
        {activeMode === 'code' ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Ngôn ngữ:</span>
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setLanguage('pseudo-c')}
                className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded-md transition-all cursor-pointer ${
                  language === 'pseudo-c'
                    ? 'bg-slate-800 text-pink-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tựa C
              </button>
              <button
                type="button"
                onClick={() => setLanguage('c')}
                className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded-md transition-all cursor-pointer ${
                  language === 'c'
                    ? 'bg-slate-800 text-pink-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                C
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-indigo-400/90 font-bold bg-indigo-950/30 border border-indigo-900/40 px-2.5 py-1 rounded-xl">
            <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
            <span>SANDBOX HP-BENCHMARK</span>
          </div>
        )}
      </div>

      {/* RENDER ACTIVE MODE WORKSPACE */}
      {activeMode === 'code' ? (
        <div id="code-tracker-workbench" className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-200">
          
          {/* STRUCTURE TOGGLES BAR (Array vs Priority Queue) */}
          <div className="shrink-0 flex items-center justify-between gap-2.5 bg-slate-950/70 border border-slate-900 px-3 py-2 rounded-xl mb-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-450 font-semibold">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Chế độ Cấu Trúc dữ liệu:</span>
            </div>

            <div className="flex overflow-hidden bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setDsType('array')}
                className={`px-3 py-1 rounded-sm text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                  dsType === 'array'
                    ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                Mảng Tuyến Tính d[v] - O(V²)
              </button>
              <button
                type="button"
                onClick={() => setDsType('pq')}
                className={`px-3 py-1 rounded-sm text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                  dsType === 'pq'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Hàng đợi ưu tiên - O((V+E) log V)
              </button>
            </div>
          </div>

          {/* Subheading display title */}
          <div className="shrink-0 mb-2 pl-1.5 flex items-center justify-between">
            <p className="text-[10px] font-mono font-black uppercase text-pink-400/80 tracking-wider">
              {currentTemplate.title}
            </p>
            {activeStep && (
              <span className="text-[9.5px] font-mono text-slate-500">
                Line highlighted for: <span className="text-amber-400 font-extrabold">{activeLineKey}</span>
              </span>
            )}
          </div>

          {/* Code Text Window */}
          <div className="flex-1 h-0 overflow-auto rounded-xl bg-slate-950/40 p-3 font-mono border border-slate-900/80 leading-snug scrollbar-thin scrollbar-thumb-slate-800/85 relative">
            <div className="min-w-[500px] w-full">
              {(() => {
                let hasSetActiveId = false;
                return currentTemplate.lines.map((line, idx) => {
                  const isHighlighted = line.key === activeLineKey;
                  const assignActiveId = isHighlighted && !hasSetActiveId;
                  if (assignActiveId) {
                    hasSetActiveId = true;
                  }
                  
                  return (
                    <div
                      key={`${line.key}-${idx}`}
                      id={assignActiveId ? "active-code-line" : undefined}
                      className={`group flex items-start transition-all duration-150 py-[1.5px] px-2 rounded ${
                        isHighlighted 
                          ? 'bg-amber-500/15 text-white font-semibold border-l-4 border-amber-500 -ml-1 shadow-sm' 
                          : 'border-l-4 border-transparent text-slate-400 hover:bg-slate-900/15'
                      }`}
                    >
                      {/* Line number */}
                      <span className={`w-8 text-right select-none shrink-0 font-mono text-[10px] leading-normal pr-1.5 border-r border-slate-800/30 ${
                        isHighlighted ? 'text-amber-400 font-bold border-amber-500/30' : 'text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>

                      {/* Animated current execution cursor pointer indicator */}
                      <span className="w-5 shrink-0 flex items-center justify-center pl-1 pt-0.5">
                        {isHighlighted && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </span>

                      {/* Syntax highlight target block */}
                      <pre className="flex-1 whitespace-pre m-0 p-0 text-slate-300 font-mono text-[11px] leading-normal overflow-x-auto select-text scrollbar-none">
                        {formatSyntaxLine(line.text)}
                      </pre>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Code Line details panel footer */}
          {activeStep && (
            <div id="code-explanation-footer" className="shrink-0 mt-3 bg-slate-900/40 rounded-xl p-3 border border-slate-900 text-[10.5px] text-slate-300 font-mono tracking-wide leading-relaxed">
              <span className="text-pink-400 font-black block mb-1 uppercase tracking-wider text-[9.5px]">
                ▶ Bước {activeStep.id + 1} : [`{activeStep.codeLineKey}`]
              </span>
              <p className="text-slate-350">{activeStep.explanation}</p>
            </div>
          )}
        </div>
      ) : (
        /* BENCHMARK / PERFORMANCE VISUAL SIMULATOR LANDING */
        <div id="performance-benchmark-workbench" className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-200">
          
          {/* Header intro note */}
          <div className="shrink-0 bg-slate-950/70 border border-slate-900/80 rounded-xl p-3 mb-3.5 flex gap-2 w-full">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-[10px] sm:text-[11px] text-slate-400 leading-normal">
              <span className="text-slate-200 font-bold block mb-0.5">Sự khác biệt cốt lõi về Hiệu Suất (Performance Comparison):</span>
              Phương pháp <strong className="text-yellow-400 font-bold">Mảng (Linear Array)</strong> có thời gian trích xuất min là <code className="text-slate-200 bg-slate-900/60 px-1 py-0.2 rounded font-mono">O(V)</code> quét tuyến tính. Phương pháp <strong className="text-emerald-400 font-bold">Hàng đợi ưu tiên (Heap PQ)</strong> chỉ mất <code className="text-slate-200 bg-slate-900/60 px-1 py-0.2 rounded font-mono">O(log V)</code>. Khi đồ thị và số đỉnh mở rộng, sự khác biệt tăng lên đáng kể!
            </div>
          </div>

          {/* PARAMETER CONFIGURATION CONTROLS */}
          <div className="shrink-0 bg-slate-900/40 border border-slate-900 p-3 rounded-xl mb-3.5 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Slider Node Size */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10.5px] font-black tracking-wider text-slate-300 uppercase font-sans">
                  Số lượng đỉnh giả thuyết (Vertices - V):
                </label>
                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {benchNodes} Đỉnh
                </span>
              </div>
              <input
                aria-label="Số đỉnh giả thuyết để mô phỏng"
                type="range"
                min="20"
                max="600"
                step="10"
                value={benchNodes}
                onChange={(e) => setBenchNodes(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                disabled={isSimulating}
              />
              <span className="text-[9px] font-mono text-slate-500">Mô phỏng đồ thị lớn để kiểm chứng độ chịu tải</span>
            </div>

            {/* Edge Density Selectors */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10.5px] font-black tracking-wider text-slate-300 uppercase font-sans">
                Mật độ kết nối (Edge Density - E):
              </label>
              
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-900 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => setBenchDensity('sparse')}
                  className={`py-1 rounded cursor-pointer transition-all ${
                    benchDensity === 'sparse'
                      ? 'bg-indigo-600/30 text-indigo-300 font-black border border-indigo-500/20'
                      : 'text-slate-450 hover:text-slate-200 border border-transparent'
                  }`}
                  disabled={isSimulating}
                >
                  Thưa (Sparse, ~1.5V)
                </button>
                <button
                  type="button"
                  onClick={() => setBenchDensity('medium')}
                  className={`py-1 rounded cursor-pointer transition-all ${
                    benchDensity === 'medium'
                      ? 'bg-indigo-600/30 text-indigo-300 font-black border border-indigo-500/20'
                      : 'text-slate-450 hover:text-slate-200 border border-transparent'
                  }`}
                  disabled={isSimulating}
                >
                  Vừa (Medium, ~4V)
                </button>
                <button
                  type="button"
                  onClick={() => setBenchDensity('dense')}
                  className={`py-1 rounded cursor-pointer transition-all ${
                    benchDensity === 'dense'
                      ? 'bg-indigo-600/30 text-indigo-300 font-black border border-indigo-500/20'
                      : 'text-slate-450 hover:text-slate-200 border border-transparent'
                  }`}
                  disabled={isSimulating}
                >
                  Dày (Dense, ~0.2V²)
                </button>
              </div>
              <span className="text-[9px] font-mono text-slate-500">
                Thiết lập mật độ cạnh: {' '}
                {benchDensity === 'sparse' ? 'O(V) cạnh' : benchDensity === 'medium' ? 'O(V) cạnh tăng cường' : 'O(V²) cạnh liên kết chéo'}
              </span>
            </div>

          </div>

          {/* RUN BUTTON BIG OR PROGRESS BAR */}
          <div className="shrink-0 mb-4">
            {isSimulating ? (
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-900">
                <div className="flex items-center justify-between text-[10px] font-mono mb-2 text-indigo-400">
                  <span className="flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    Đang thiết lập ma trận ngẫu nhiên & phân tích cấu trúc...
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartSimulation}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 cursor-pointer shadow-lg transition-all duration-300 group hover:scale-[1.01]"
              >
                <Play className="w-4 h-4 fill-white text-white group-hover:scale-110 transition-all" />
                <span>KÍCH HOẠT MÔ PHỎNG & ĐO ĐẠC HIỆU SUẤT COCKPIT</span>
              </button>
            )}
          </div>

          {/* SIDE-BY-SIDE ANALYSER CHART / GAUGES (Only if simResults generated) */}
          {simResults && (
            <div className="flex-1 overflow-auto flex flex-col gap-4 bg-slate-950/60 p-4 border border-slate-900 rounded-xl scrollbar-thin scrollbar-thumb-slate-800">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* METHOD A: ARRAY BOX */}
                <div className="bg-slate-900/60 border border-yellow-500/10 rounded-2xl p-3.5 flex flex-col hover:border-yellow-500/20 transition-all">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-yellow-500 shrink-0" />
                      <span className="text-[11.5px] font-sans font-extrabold text-yellow-400 uppercase tracking-widest">
                        PHƯƠNG PHÁP MẢNG (O(V²))
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono text-slate-500 font-bold bg-[#171305] border border-yellow-900/20 px-1.5 py-0.5 rounded text-yellow-500">
                      Tuyển tính
                    </span>
                  </div>

                  {/* Operational stats values stack */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Số phép quét tìm cực tiểu (Scan Extract Min):</span>
                      <span className="text-sm font-mono text-slate-200 font-extrabold">
                        {simResults.array.findMinOps.toLocaleString()} <span className="text-xs text-slate-500 font-normal">phép so so sánh</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Số phép thư giãn liên kết (Relax Edge):</span>
                      <span className="text-sm font-mono text-slate-200 font-semibold text-slate-300">
                        {simResults.array.relaxOps.toLocaleString()} <span className="text-xs text-slate-500 font-normal">phép cập nhật d[v]</span>
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/40">
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Tổng số hạt tính cơ bản (Complexity sum):</span>
                      <span className="text-base font-mono text-yellow-400 font-black">
                        {simResults.array.totalOps.toLocaleString()}
                      </span>
                    </div>

                    <div className="pt-2">
                      <span className="text-[10px] font-mono text-slate-450 block mb-0.5">Thời gian thực thi tương đối (Scale-Time):</span>
                      <span className="text-lg font-mono text-yellow-500 font-black flex items-baseline gap-1">
                        {simResults.array.timeMs} <span className="text-[10px] text-slate-500 font-normal">ms</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* METHOD B: PRIORITY QUEUE BOX */}
                <div className="bg-slate-900/60 border border-emerald-500/10 rounded-2xl p-3.5 flex flex-col hover:border-emerald-500/20 transition-all">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 animate-ping" />
                      <span className="text-[11.5px] font-sans font-extrabold text-emerald-400 uppercase tracking-widest">
                        HÀNG ĐỢI ƯU TIÊN (O(E log V))
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono text-slate-500 font-bold bg-[#071708] border border-emerald-900/20 px-1.5 py-0.5 rounded text-emerald-500">
                      Binary Heap
                    </span>
                  </div>

                  {/* Operational stats values stack */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Số phép Heap Pop cực tiểu (Heap Extract-Min):</span>
                      <span className="text-sm font-mono text-slate-200 font-extrabold">
                        {simResults.pq.findMinOps.toLocaleString()} <span className="text-xs text-slate-500 font-normal">phép so so sánh</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Số phép chêm/thay đổi Heap (Relax & Decrease):</span>
                      <span className="text-sm font-mono text-slate-200 font-semibold text-slate-300">
                        {simResults.pq.relaxOps.toLocaleString()} <span className="text-xs text-slate-500 font-normal">phép sủi bọt/bảo toàn Heap</span>
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/40">
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Tổng số hạt tính cơ bản (Complexity sum):</span>
                      <span className="text-base font-mono text-emerald-400 font-black">
                        {simResults.pq.totalOps.toLocaleString()}
                      </span>
                    </div>

                    <div className="pt-2">
                      <span className="text-[10px] font-mono text-slate-455 block mb-0.5">Thời gian thực thi tương đối (Scale-Time):</span>
                      <span className="text-lg font-mono text-emerald-400 font-black flex items-baseline gap-1">
                        {simResults.pq.timeMs} <span className="text-[10px] text-slate-500 font-normal">ms</span>
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* LIVE SPEED GAP visual chart percentage */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3.5">
                <span className="text-[10px] font-mono text-slate-450 block mb-2 uppercase tracking-wider font-extrabold">
                  Biểu Đồ So Sánh Tổng Số Phép Tính Phải Thực Thi (Càng thấp càng tối ưu):
                </span>
                
                <div className="space-y-3">
                  
                  {/* Linear Array Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span className="text-slate-300 font-bold">Mảng Tuyến Tính (Linear Sweep)</span>
                      <span className="text-yellow-400 font-black">{simResults.array.totalOps.toLocaleString()} phép tính</span>
                    </div>
                    <div className="w-full bg-slate-950 h-5 rounded overflow-hidden flex border border-slate-900">
                      <div 
                        className="bg-yellow-500/70 h-full border-r border-yellow-400"
                        style={{ width: '100%' }} // standardizer
                      />
                    </div>
                  </div>

                  {/* Priority Queue (Binary Heap) Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span className="text-slate-300 font-bold flex items-center gap-1">
                        Hàng Đợi Ưu Tiên (Binary Heap)
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black uppercase text-[8px] px-1 rounded">VƯỢT TRỘI</span>
                      </span>
                      <span className="text-emerald-400 font-black">
                        {simResults.pq.totalOps.toLocaleString()} phép tính {' '}
                        ({Math.round((simResults.pq.totalOps / simResults.array.totalOps) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-5 rounded overflow-hidden flex border border-slate-900">
                      <div 
                        className="bg-emerald-500/70 h-full border-r border-emerald-400 transition-all duration-300"
                        style={{ width: `${Math.max(3, (simResults.pq.totalOps / simResults.array.totalOps) * 100)}%` }}
                      />
                    </div>
                  </div>

                </div>

                {/* Performance Speed Factor Summary Footer */}
                <div className="mt-4 pt-3.5 border-t border-slate-900/80 text-center">
                  <p className="text-xs font-sans text-slate-300 leading-relaxed max-w-xl mx-auto">
                    Trong cấu hình này, phương pháp <strong className="text-emerald-400 font-bold">Hàng Đợi Ưu Tiên (Heap PQ)</strong> tối ưu hơn gấp khoảng{' '}
                    <strong className="text-indigo-400 font-black text-sm">
                      {Math.max(1, Math.round(simResults.array.totalOps / simResults.pq.totalOps))} lần
                    </strong>{' '} 
                    so với việc quét tuyến tính d[v]. 
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                    Định luật: Khi đồ thị càng lớn (V tăng), Heap PQ giữ độ trễ siêu thấp trong khi Mảng Tuyến Tính tiệm cận O(N²) và bị đứng hình.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
