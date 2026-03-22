import { useCallback } from "react";
import type { FlowNode } from "@/components/flow/types";
import { TILE_GAP, TILE_HEIGHT, TILE_WIDTH } from "@/layout/tile-constants";

const pos = (col: number, row: number) => ({
  x: col * (TILE_WIDTH + TILE_GAP),
  y: row * (TILE_HEIGHT + TILE_GAP),
});

const at = (nodes: FlowNode[], col: number, row: number) =>
  nodes.find((n) => n.data.col === col && n.data.row === row);

function tile(n: FlowNode, col: number, row: number): FlowNode {
  return { ...n, data: { ...n.data, col, row } } as FlowNode;
}

function select(nodes: FlowNode[], targetId: string): FlowNode[] {
  return nodes.map((n) => {
    const shouldSelect = n.id === targetId;
    if (n.selected === shouldSelect) return n;
    return { ...n, selected: shouldSelect } as FlowNode;
  });
}

function compact(nodes: FlowNode[], removedCol: number, removedRow: number): FlowNode[] {
  const colEmpty = !nodes.some((n) => n.data.col === removedCol);
  return nodes.map((n) => {
    let { col, row } = n.data;
    if (n.data.col === removedCol && n.data.row > removedRow) row--;
    if (colEmpty && n.data.col > removedCol) col--;
    if (col === n.data.col && row === n.data.row) return n;
    return tile(n, col, row);
  });
}

function layout(nodes: FlowNode[]): FlowNode[] {
  return nodes.map((n) => {
    const p = pos(n.data.col, n.data.row);
    if (n.position.x === p.x && n.position.y === p.y) return n;
    return { ...n, position: p } as FlowNode;
  });
}

export type NodeFactory = (col: number, row: number) => FlowNode;

export function useTilingLayout(setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>) {
  const update = useCallback(
    (fn: (prev: FlowNode[]) => FlowNode[]) => setNodes((prev) => layout(fn(prev))),
    [setNodes],
  );

  const create = useCallback(
    (dc: number, dr: number, factory: NodeFactory) => {
      update((nodes) => {
        const sel = nodes.find((n) => n.selected);
        const col = sel ? sel.data.col + dc : nodes.reduce((max, n) => Math.max(max, n.data.col), -1) + 1;
        const row = sel ? sel.data.row + dr : 0;

        let pushed = nodes;
        if (at(nodes, col, row)) {
          pushed = nodes.map((n) => {
            if (dc > 0 && n.data.col >= col) return tile(n, n.data.col + 1, n.data.row);
            if (dc < 0 && n.data.col <= col) return tile(n, n.data.col - 1, n.data.row);
            if (dr > 0 && n.data.col === col && n.data.row >= row) return tile(n, n.data.col, n.data.row + 1);
            if (dr < 0 && n.data.col === col && n.data.row <= row) return tile(n, n.data.col, n.data.row - 1);
            return n;
          });
        }

        const newNode = factory(col, row);
        return [...select(pushed, ""), { ...newNode, selected: true } as FlowNode];
      });
    },
    [update],
  );

  const remove = useCallback(
    (nodeId: string) => {
      update((nodes) => {
        const target = nodes.find((n) => n.id === nodeId);
        if (!target) return nodes;
        const { col, row } = target.data;
        const result = compact(nodes.filter((n) => n.id !== nodeId), col, row);
        const neighbor = at(result, col, row) ?? at(result, col, row - 1) ?? at(result, col - 1, row);
        return neighbor ? select(result, neighbor.id) : result;
      });
    },
    [update],
  );

  const replace = useCallback(
    (nodeId: string, factory: NodeFactory) => {
      update((nodes) => {
        const target = nodes.find((n) => n.id === nodeId);
        if (!target) return nodes;
        const newNode = factory(target.data.col, target.data.row);
        return nodes.map((n) =>
          n.id === nodeId ? { ...newNode, selected: n.selected } as FlowNode : n,
        );
      });
    },
    [update],
  );

  const focus = useCallback(
    (dc: number, dr: number) => {
      update((nodes) => {
        const sel = nodes.find((n) => n.selected);
        if (!sel) return nodes;
        const target = at(nodes, sel.data.col + dc, sel.data.row + dr);
        return target ? select(nodes, target.id) : nodes;
      });
    },
    [update],
  );

  const move = useCallback(
    (dc: number, dr: number) => {
      update((nodes) => {
        const sel = nodes.find((n) => n.selected);
        if (!sel) return nodes;
        const tc = sel.data.col + dc;
        const tr = sel.data.row + dr;
        const target = at(nodes, tc, tr);
        if (!target) return nodes;
        return nodes.map((n) => {
          if (n.id === sel.id) return tile(n, tc, tr);
          if (n.id === target.id) return tile(n, sel.data.col, sel.data.row);
          return n;
        });
      });
    },
    [update],
  );

  return { create, remove, replace, focus, move };
}
