import React, { useMemo, useState } from 'react';
import { 
  Award,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { GraphNode, GraphEdge, DijkstraStep } from '../types';

interface StatsPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  startNodeId: string;
  endNodeId: string | null;
  activeStep: DijkstraStep | null;
  isDirected: boolean;
}

interface TraceRow {
  stepLabel: string;
  selectedNodeId: string | null;
  distances: Record<string, number>;
  previous: Record<string, string | null>;
  visitedNodes: string[];
}

export default function StatsPanel({
  nodes,
  edges,
  startNodeId,
  endNodeId,
  activeStep,
  isDirected
}: StatsPanelProps) {
  const currentStep = activeStep;
  const distances = currentStep ? currentStep.distances : {};
  const previous = currentStep ? currentStep.previous : {};
  const visitedNodes = currentStep ? currentStep.visitedNodes : [];
  const queue = currentStep ? currentStep.queue : [];

  // Reconstruct path to any node ID based on current state
  const reconstructPath = (nodeId: string): string[] => {
    if (distances[nodeId] === undefined || distances[nodeId] === Infinity) {
      return [];
    }

    const path: string[] = [];
    let current: string | null = nodeId;
    const visitedSet = new Set<string>();

    while (current && !visitedSet.has(current)) {
      visitedSet.add(current);
      const nodeObj = nodes.find((n) => n.id === current);
      if (nodeObj) {
        path.unshift(nodeObj.label);
      }
      current = previous[current] || null;
    }
    return path;
  };

  const getLabel = (id: string) => {
    return nodes.find((n) => n.id === id)?.label || id;
  };

  // Generate the steps of Dijkstra trace to render the "Bảng giải bằng tay"
  const traceRows = useMemo<TraceRow[]>(() => {
    if (!startNodeId || nodes.length === 0) return [];

    const rows: TraceRow[] = [];
    const currentDistances: Record<string, number> = {};
    const currentPrevious: Record<string, string | null> = {};
    const visited: string[] = [];
    const unvisited = [...nodes];

    // Initialize
    nodes.forEach(node => {
      currentDistances[node.id] = node.id === startNodeId ? 0 : Infinity;
      currentPrevious[node.id] = null;
    });

    // Row 0: Khởi tạo
    rows.push({
      stepLabel: 'Khởi tạo',
      selectedNodeId: null,
      distances: { ...currentDistances },
      previous: { ...currentPrevious },
      visitedNodes: []
    });

    let stepCount = 1;
    while (unvisited.length > 0) {
      // Find min distance among unvisited
      let minNodeId: string | null = null;
      let minDist = Infinity;

      unvisited.forEach(node => {
        const d = currentDistances[node.id];
        if (d < minDist) {
          minDist = d;
          minNodeId = node.id;
        }
      });

      if (minNodeId === null || minDist === Infinity) {
        break;
      }

      const activeId = minNodeId as string;
      const indexInUnvisited = unvisited.findIndex(n => n.id === activeId);
      if (indexInUnvisited !== -1) {
        unvisited.splice(indexInUnvisited, 1);
      }
      visited.push(activeId);

      // Relax standard edges
      edges.forEach(edge => {
        let neighborId: string | null = null;
        if (edge.source === activeId) {
          neighborId = edge.target;
        } else if (!isDirected && edge.target === activeId) {
          neighborId = edge.source;
        }

        if (neighborId && !visited.includes(neighborId)) {
          const alternateDist = currentDistances[activeId] + edge.weight;
          if (alternateDist < currentDistances[neighborId]) {
            currentDistances[neighborId] = alternateDist;
            currentPrevious[neighborId] = activeId;
          }
        }
      });

      // Add a row for this relaxation step
      rows.push({
        stepLabel: `Bước ${stepCount} (Chốt ${getLabel(activeId)})`,
        selectedNodeId: activeId,
        distances: { ...currentDistances },
        previous: { ...currentPrevious },
        visitedNodes: [...visited]
      });

      if (endNodeId && activeId === endNodeId) {
        break;
      }

      stepCount++;
    }

    return rows;
  }, [nodes, edges, startNodeId, endNodeId, isDirected]);

  // Set of nodes that have either been visited (chốt) or are currently being examined (currentNode)
  const revealedNodes = useMemo(() => {
    const set = new Set<string>();
    if (!activeStep) return set;
    activeStep.visitedNodes.forEach((id) => set.add(id));
    if (activeStep.currentNode) {
      set.add(activeStep.currentNode);
    }
    return set;
  }, [activeStep]);

  // Only show rows up to the current solved or active row
  const visibleRows = useMemo(() => {
    if (!activeStep) {
      return traceRows.slice(0, 1);
    }
    // Filter traceRows: always keep row 0 (Khởi tạo), and keep any subsequent row whose node is in revealedNodes
    return traceRows.filter((row, idx) => {
      if (idx === 0) return true;
      return row.selectedNodeId ? revealedNodes.has(row.selectedNodeId) : false;
    });
  }, [traceRows, activeStep, revealedNodes]);

  // Track which row in the visible list currently maps to the selected currentNode
  const activeRowIndex = useMemo(() => {
    if (!activeStep || !activeStep.currentNode) return -1;
    return visibleRows.findIndex(r => r.selectedNodeId === activeStep.currentNode);
  }, [activeStep, visibleRows]);

  // Compiled trace properties for each row to match standard lecture slides: Iteration, unmarked, marked, Current
  const rowDetails = useMemo(() => {
    return traceRows.map((row, rowIdx) => {
      const unmarkedList = nodes
        .filter(n => !row.visitedNodes.includes(n.id))
        .map(n => n.label);
      const unmarkedStr = `{${unmarkedList.join(', ')}}`;

      const markedList = row.visitedNodes.map(id => getLabel(id));
      const markedStr = `{${markedList.join(', ')}}`;

      const currentStr = row.selectedNodeId ? `u = ${getLabel(row.selectedNodeId)}` : '';

      return {
        iteration: rowIdx === 0 ? '' : rowIdx.toString(),
        unmarkedStr,
        markedStr,
        currentStr
      };
    });
  }, [traceRows, nodes]);

  // Adjust compactness of the table if there are many columns
  const isDense = nodes.length > 6;
  const cellPaddingClass = isDense ? 'py-1 px-1.5' : 'py-1.5 px-2';
  const fontSizeClass = isDense ? 'text-[9.5px] sm:text-[10px]' : 'text-xs';
  const headerFontSizeClass = isDense ? 'text-[9.5px]' : 'text-[10.5px]';

  // Reconstruct final path to end node safely
  const pathNodes = endNodeId ? reconstructPath(endNodeId) : [];
  const totalLength = endNodeId && distances[endNodeId] !== undefined ? distances[endNodeId] : Infinity;

  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div id="stats-panel-main" className="bg-[#0d0d10] border border-slate-800/80 rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Title Header (Compact and informative) */}
      <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-3 bg-slate-950/50 shrink-0">
        <span className="text-xs text-slate-200 uppercase tracking-widest flex items-center gap-2 font-black">
          <BookOpen className="w-4 h-4 text-amber-500 animate-pulse" /> BẢNG GIẢI TAY TỔNG HỢP
        </span>
      </div>

      {/* Main Stats Panel Content */}
      <div className="flex-1 flex flex-col p-3 gap-2 min-h-0 overflow-hidden select-none">
        
        {/* Sleek, space-saving row for Recommended Route */}
        <div className="flex gap-2 shrink-0">
          
          {/* LỘ TRÌNH KHUYẾN NGHỊ */}
          <div className="w-full min-h-[38px] px-3 py-1.5 bg-gradient-to-r from-blue-950/20 to-indigo-950/20 border border-blue-900/20 rounded-lg flex items-center justify-between gap-1 font-sans">
            <span className="text-[9.5px] text-slate-400 font-extrabold flex items-center gap-1 font-mono tracking-wider shrink-0">
              <Award className="w-3.5 h-3.5 text-blue-400" /> KẾT QUẢ LUYỆN TẬP:
            </span>
            {endNodeId ? (
              pathNodes.length > 0 ? (
                <div className="flex items-center gap-3 overflow-hidden flex-1 justify-end">
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                    {pathNodes.map((label, idx) => (
                      <React.Fragment key={idx}>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                          idx === 0 
                            ? 'bg-blue-600 text-white' 
                            : idx === pathNodes.length - 1 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-800 text-slate-100'
                        }`}>
                          {label}
                        </span>
                        {idx < pathNodes.length - 1 && <span className="text-slate-650 text-[8px] shrink-0">➔</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-350 shrink-0 font-medium font-mono">
                    d = <b className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-950/10 font-black">{totalLength}</b>
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-500 italic shrink-0">Không có đường đi</span>
              )
            ) : (
              <span className="text-[10px] text-slate-400 italic shrink-0">Tìm đường ngắn nhất từ {getLabel(startNodeId)} ➔ Tất cả</span>
            )}
          </div>
        </div>

        {/* Trace Table Area */}
        <div className="flex-1 overflow-auto rounded-xl border border-slate-850 bg-[#07070a]/40 p-2 min-h-0 scrollbar-thin scrollbar-thumb-slate-800/80 scrollbar-track-transparent">
          <table className="w-full text-center border-collapse select-text">
            <thead className="sticky top-0 bg-[#0d0d10] z-35">
              <tr className="border-b border-slate-800 bg-[#0d0d10]/95 font-mono text-slate-300">
                <th className={`py-1.5 px-1 font-black text-center border-r border-slate-800 max-w-[40px] text-slate-200 ${headerFontSizeClass}`}>
                  Lần lặp
                </th>
                <th className={`py-1.5 px-1 font-black text-center border-r border-slate-800 min-w-[70px] text-slate-200 ${headerFontSizeClass}`}>
                  Chưa xét
                </th>
                <th className={`py-1.5 px-1 font-black text-center border-r border-slate-800 min-w-[70px] text-slate-200 ${headerFontSizeClass}`}>
                  Đã chốt
                </th>
                <th className={`py-1.5 px-1 font-black text-center border-r border-slate-800 min-w-[65px] text-slate-200 ${headerFontSizeClass}`}>
                  Đang xét
                </th>
                {nodes.map((node) => {
                  const isStart = node.id === startNodeId;
                  const isEnd = node.id === endNodeId;
                  const isActiveCol = activeStep && activeStep.currentNode === node.id;
                  const isCheckingCol = activeStep && activeStep.neighborNode === node.id;
                  
                  return (
                    <th key={node.id} className={`py-1.5 px-1 font-black border-r border-slate-800 min-w-[45px] ${headerFontSizeClass} ${
                      isActiveCol 
                        ? 'bg-amber-500/10' 
                        : isCheckingCol 
                        ? 'bg-indigo-500/10' 
                        : 'bg-[#0d0d10]/95'
                    }`}>
                      <span className={`px-1.5 py-0.5 rounded font-mono ${
                        isStart 
                          ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30' 
                          : isEnd 
                          ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30' 
                          : isActiveCol
                          ? 'bg-amber-505 text-slate-950 font-black'
                          : isCheckingCol
                          ? 'bg-indigo-500 text-white font-black'
                          : 'text-slate-200 bg-slate-900 border border-slate-800'
                      } ${fontSizeClass}`}>
                        {node.label}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/80">
              {visibleRows.map((row, rowIdx) => {
                const isActive = rowIdx === activeRowIndex;
                const details = rowDetails[rowIdx] || { iteration: '', unmarkedStr: '{}', markedStr: '{}', currentStr: '' };

                return (
                  <tr 
                    key={rowIdx}
                    className={`transition-all duration-200 ${
                      isActive 
                        ? 'bg-amber-500/8 border-l-2 border-l-amber-500' 
                        : 'hover:bg-slate-900/10'
                    }`}
                  >
                    {/* Iteration col */}
                    <td className={`py-1 px-1 font-mono text-center border-r border-slate-850 text-slate-400 ${fontSizeClass}`}>
                      {details.iteration}
                    </td>

                    {/* unmarked col */}
                    <td className={`py-1 px-1 font-mono text-center border-r border-slate-855 text-slate-355 break-all max-w-[120px] ${fontSizeClass}`}>
                      {details.unmarkedStr}
                    </td>

                    {/* marked col */}
                    <td className={`py-1 px-1 font-mono text-center border-r border-slate-855 text-slate-400 break-all max-w-[120px] ${fontSizeClass}`}>
                      {details.markedStr}
                    </td>

                    {/* Current col */}
                    <td className={`py-1 px-1 font-mono text-center border-r border-slate-855 font-bold ${fontSizeClass} ${
                      isActive ? 'text-amber-300 font-black' : 'text-slate-300 font-medium'
                    }`}>
                      {details.currentStr}
                    </td>

                    {/* Distance cols for each graph node */}
                    {nodes.map((node) => {
                      const isCurrentSelected = node.id === row.selectedNodeId;
                      const isRowActive = activeStep && row.selectedNodeId === activeStep.currentNode && activeStep.currentNode !== null;
                      
                      // Identify the distance to show: 
                      // If it is the active row, use the live distance from activeStep!
                      // Otherwise, use the step's stored distance
                      let d = row.distances[node.id];
                      if (isRowActive && activeStep) {
                        d = activeStep.distances[node.id];
                      }

                      const displayValue = d === undefined || d === Infinity ? 'Inf' : d.toString();

                      const prevRow = rowIdx > 0 ? visibleRows[rowIdx - 1] : null;
                      let prevD = Infinity;
                      if (prevRow) {
                        prevD = prevRow.distances[node.id] === undefined ? Infinity : prevRow.distances[node.id];
                      }
                      
                      const isRelaxed = rowIdx > 0 && d < prevD && !isCurrentSelected;
                      const isChecking = activeStep && isRowActive && activeStep.neighborNode === node.id;

                      return (
                        <td 
                          key={node.id} 
                          className={`${cellPaddingClass} border-r border-slate-850 text-center font-mono ${fontSizeClass} ${
                            isCurrentSelected 
                              ? 'bg-amber-500/15 text-amber-300 font-extrabold border-x border-amber-500/20' 
                              : isChecking
                              ? 'bg-indigo-500/20 text-indigo-300 font-black border-x border-indigo-500/30 animate-pulse'
                              : isRelaxed 
                              ? 'bg-emerald-500/10 text-emerald-300 font-extrabold' 
                              : 'text-slate-400'
                          }`}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Dynamic Step-by-Step Explanation / Guidance Block */}
        <div className="shrink-0 mt-1 px-3.5 py-2.5 bg-indigo-500/5 hover:bg-indigo-500/8 border border-indigo-500/15 rounded-xl flex items-start gap-2.5 transition-all duration-300">
          <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400 font-mono text-[11px] font-black mt-0.5 animate-pulse">
            i
          </div>
          <div className="flex-1 flex flex-col gap-0.5 select-text">
            <span className="text-[10px] uppercase font-black text-indigo-400 tracking-wider font-sans">
              CHÚ GIẢI TỪNG BƯỚC:
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
              {activeStep ? activeStep.explanation : 'Đang ở trạng thái sẵn sàng. Nhấn nút phát tự động hoặc các bước kế tiếp để bắt đầu từng bước giải thuật.'}
            </p>
          </div>
        </div>
          
        {/* Collapsible Legend explanation bar */}
        <div className="mt-1 bg-slate-950/30 rounded-xl border border-slate-900/60 overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="w-full px-3 py-1 flex items-center justify-between text-[10px] font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span>Giải thích bảng ký hiệu duyệt</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
              <span>{showExplanation ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}</span>
              {showExplanation ? <ChevronUp className="w-3" h-3 /> : <ChevronDown className="w-3" h-3 />}
            </div>
          </button>
          
          {showExplanation && (
            <div className="px-3 pb-2 pt-1 border-t border-slate-900/40 text-[10px] leading-relaxed text-slate-400 select-text">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-slate-450">
                <div>• <b className="text-slate-300 font-mono">Lần lặp</b>: Thứ tự bước lặp giải thuật chốt đỉnh tối ưu.</div>
                <div>• <b className="text-slate-300 font-mono">Chưa xét</b>: Tập hợp các đỉnh chưa chốt trong bước lặp đó.</div>
                <div>• <b className="text-slate-300 font-mono">Đã chốt</b>: Tập hợp các đỉnh đã chốt tối ưu cố định giá trị.</div>
                <div>• <b className="text-slate-300 font-mono">Đang xét</b>: Đỉnh đang duyệt thư giãn <b className="text-amber-400">u = ...</b> có d[u] tối thiểu.</div>
                <div>• <b className="text-emerald-400 font-bold">Inf</b>: Khoảng cách vô cùng (chưa có đường đi tới đỉnh đó).</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
