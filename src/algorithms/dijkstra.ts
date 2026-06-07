import { GraphNode, GraphEdge, DijkstraStep } from '../types';

export function runDijkstra(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  endNodeId: string | null,
  isDirected: boolean = false
): DijkstraStep[] {
  const steps: DijkstraStep[] = [];
  let stepId = 0;

  // Helpers
  const getWeight = (u: string, v: string): number => {
    const edge = isDirected
      ? edges.find((e) => e.source === u && e.target === v)
      : edges.find(
          (e) => (e.source === u && e.target === v) || (e.source === v && e.target === u)
        );
    return edge ? edge.weight : Infinity;
  };

  const getEdgeId = (u: string, v: string): string => {
    const edge = isDirected
      ? edges.find((e) => e.source === u && e.target === v)
      : edges.find(
          (e) => (e.source === u && e.target === v) || (e.source === v && e.target === u)
        );
    return edge ? edge.id : '';
  };

  // 1. Initialization
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const visitedNodes: string[] = [];
  const queue: { nodeId: string; distance: number }[] = [];

  nodes.forEach((node) => {
    distances[node.id] = node.id === startNodeId ? 0 : Infinity;
    previous[node.id] = null;
    queue.push({
      nodeId: node.id,
      distance: node.id === startNodeId ? 0 : Infinity,
    });
  });

  // Helper helper to clone states
  const cloneState = (
    currentNode: string | null,
    neighborNode: string | null,
    highlightedEdges: string[],
    shortestPathEdges: string[],
    codeLineKey: string,
    explanation: string
  ): DijkstraStep => {
    return {
      id: stepId++,
      currentNode,
      neighborNode,
      visitedNodes: [...visitedNodes],
      distances: { ...distances },
      previous: { ...previous },
      queue: queue.map((q) => ({ ...q })),
      highlightedEdges: [...highlightedEdges],
      shortestPathEdges: [...shortestPathEdges],
      codeLineKey,
      explanation,
    };
  };

  // Step 1: Initial state
  steps.push(
    cloneState(
      null,
      null,
      [],
      [],
      'init',
      `Khởi tạo: Đặt khoảng cách tới đỉnh bắt đầu ${
        nodes.find((n) => n.id === startNodeId)?.label || startNodeId
      } bằng 0, tất cả các đỉnh khác bằng vô cùng (∞).`
    )
  );

  // Core loop
  while (queue.length > 0) {
    // Sort queue to find node with min distance
    queue.sort((a, b) => a.distance - b.distance);

    // Step 2: Loop condition check
    steps.push(
      cloneState(
        null,
        null,
        [],
        [],
        'loop_start',
        `Vòng lặp: Kiểm tra danh sách đỉnh chưa duyệt (Hàng đợi ưu tiên). Số đỉnh còn lại: ${queue.length}.`
      )
    );

    const minItem = queue[0];
    const u = minItem.nodeId;
    const uLabel = nodes.find((n) => n.id === u)?.label || u;

    // Check if the closest node is unreachable
    if (minItem.distance === Infinity) {
      steps.push(
        cloneState(
          null,
          null,
          [],
          [],
          'done',
          `Kết thúc sớm: Tất cả các đỉnh chưa duyệt còn lại đều không thể chạm tới từ đỉnh bắt đầu. Thuật toán kết thúc.`
        )
      );
      break;
    }

    // Step 3: Extract Min
    steps.push(
      cloneState(
        u,
        null,
        [],
        [],
        'extract_min',
        `Chọn đỉnh có khoảng cách ngắn nhất chưa duyệt: Chọn đỉnh ${uLabel} với khoảng cách hiện tại là ${minItem.distance}.`
      )
    );

    // Step 4: Check if reached destination
    if (endNodeId && u === endNodeId) {
      visitedNodes.push(u);
      queue.shift(); // Remove from queue
      steps.push(
        cloneState(
          u,
          null,
          [],
          [],
          'check_destination',
          `Đã tìm thấy đích: Đỉnh ${uLabel} chính là đỉnh kết thúc. Đánh dấu đã duyệt và dừng thuật toán.`
        )
      );
      break;
    }

    // Mark as visited
    visitedNodes.push(u);
    queue.shift(); // Remove from queue

    steps.push(
      cloneState(
        u,
        null,
        [],
        [],
        'mark_visited',
        `Đánh dấu duyệt: Cho đỉnh ${uLabel} vào tập các đỉnh đã duyệt.`
      )
    );

    // Find neighbors based on whether the graph is directed or undirected
    const neighbors = edges
      .filter((e) => isDirected ? e.source === u : (e.source === u || e.target === u))
      .map((e) => (e.source === u ? e.target : e.source))
      .filter((neighborId) => !visitedNodes.includes(neighborId));

    if (neighbors.length === 0) {
      steps.push(
        cloneState(
          u,
          null,
          [],
          [],
          'neighbor_loop',
          `Xét láng giềng: Đỉnh ${uLabel} không có láng giềng nào chưa duyệt.`
        )
      );
      continue;
    }

    // Step 5: Neighbor loop start
    steps.push(
      cloneState(
        u,
        null,
        [],
        [],
        'neighbor_loop',
        `Xét láng giềng: Đỉnh ${uLabel} có ${neighbors.length} láng giềng chưa duyệt: ${neighbors
          .map((nid) => nodes.find((n) => n.id === nid)?.label || nid)
          .join(', ')}.`
      )
    );

    for (const v of neighbors) {
      const vLabel = nodes.find((n) => n.id === v)?.label || v;
      const weight = getWeight(u, v);
      const edgeId = getEdgeId(u, v);
      const tentativeDist = distances[u] + weight;

      // Highlight checking relaxation
      steps.push(
        cloneState(
          u,
          v,
          [edgeId],
          [],
          'relaxation_check',
          `Kiểm tra thư giãn cho cạnh ${uLabel} — (${weight}) —> ${vLabel}: Tính khoảng cách thử nghiệm qua ${uLabel}: ${distances[u]} + ${weight} = ${tentativeDist}. Để xem có tốt hơn d(${vLabel}) = ${distances[v] === Infinity ? '∞' : distances[v]} hay không.`
        )
      );

      if (tentativeDist < distances[v]) {
        distances[v] = tentativeDist;
        previous[v] = u;

        // update in queue
        const qIndex = queue.findIndex((q) => q.nodeId === v);
        if (qIndex !== -1) {
          queue[qIndex].distance = tentativeDist;
        }

        steps.push(
          cloneState(
            u,
            v,
            [edgeId],
            [],
            'relaxation_action',
            `Thư giãn thành công! Cập nhật khoảng cách d(${vLabel}) = ${tentativeDist} và cha của ${vLabel} là ${uLabel}.`
          )
        );
      } else {
        steps.push(
          cloneState(
            u,
            v,
            [edgeId],
            [],
            'relaxation_check',
            `Không tối ưu hơn: Khoảng cách thử nghiệm (${tentativeDist}) không nhỏ hơn khoảng cách hiện tại d(${vLabel}) = ${
              distances[v] === Infinity ? '∞' : distances[v]
            }. Không cập nhật.`
          )
        );
      }
    }
  }

  // Final step - Success done or done without finding endNode
  const hasPathToEnd = endNodeId ? distances[endNodeId] !== Infinity : false;
  const shortestPathEdges: string[] = [];

  if (endNodeId && hasPathToEnd) {
    let curr: string | null = endNodeId;
    while (curr && previous[curr]) {
      const prevNode: string = previous[curr]!;
      const edgeId = getEdgeId(prevNode, curr);
      if (edgeId) {
        shortestPathEdges.push(edgeId);
      }
      curr = prevNode;
    }

    steps.push(
      cloneState(
        null,
        null,
        [],
        shortestPathEdges,
        'done',
        `Hoàn thành! Đã tìm được đường đi ngắn nhất từ đỉnh bắt đầu tới ${
          nodes.find((n) => n.id === endNodeId)?.label || endNodeId
        } với tổng độ dài bằng ${distances[endNodeId]}.`
      )
    );
  } else {
    steps.push(
      cloneState(
        null,
        null,
        [],
        [],
        'done',
        `Hoàn thành! Đã duyệt toàn bộ đồ thị. Bất kỳ đỉnh nào có khoảng cách khác ∞ đã được tối ưu hóa đường đi ngắn nhất.`
      )
    );
  }

  return steps;
}
