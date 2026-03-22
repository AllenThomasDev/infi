import { useCallback } from "react";
import type { FlowNode } from "@/components/flow/types";
import { TILE_GAP, TILE_HEIGHT, TILE_WIDTH } from "@/layout/tile-constants";

const pos = (col: number, row: number) => ({
  x: col * (TILE_WIDTH + TILE_GAP),
  y: row * (TILE_HEIGHT + TILE_GAP),
});

const at = (nodes: FlowNode[], col: number, row: number) =>
  nodes.find((n) => n.data.col === col && n.data.row === row);

const maxRow = (nodes: FlowNode[], col: number) =>
  nodes.reduce(
    (max, n) => (n.data.col === col ? Math.max(max, n.data.row) : max),
    -1
  );

function nearestInColumn(nodes: FlowNode[], col: number, preferredRow: number) {
  const lastRow = maxRow(nodes, col);
  if (lastRow < 0) {
    return undefined;
  }
  return at(nodes, col, Math.max(0, Math.min(preferredRow, lastRow)));
}

function tile(n: FlowNode, col: number, row: number): FlowNode {
  return { ...n, data: { ...n.data, col, row } } as FlowNode;
}

function select(nodes: FlowNode[], targetId: string): FlowNode[] {
  return nodes.map((n) => {
    const shouldSelect = n.id === targetId;
    if (n.selected === shouldSelect) {
      return n;
    }
    return { ...n, selected: shouldSelect } as FlowNode;
  });
}

function compact(
  nodes: FlowNode[],
  removedCol: number,
  removedRow: number
): FlowNode[] {
  // Shift tiles above the removed row down within the same column.
  const shifted = nodes.map((n) => {
    if (n.data.col === removedCol && n.data.row > removedRow) {
      return tile(n, n.data.col, n.data.row - 1);
    }
    return n;
  });

  // If the column is now empty, collapse it and shift all columns to the right.
  const colEmpty = !shifted.some((n) => n.data.col === removedCol);
  if (!colEmpty) {
    return shifted;
  }

  return shifted.map((n) => {
    if (n.data.col > removedCol) {
      return tile(n, n.data.col - 1, n.data.row);
    }
    return n;
  });
}

function layout(nodes: FlowNode[]): FlowNode[] {
  return nodes.map((n) => {
    const p = pos(n.data.col, n.data.row);
    if (n.position.x === p.x && n.position.y === p.y) {
      return n;
    }
    return { ...n, position: p } as FlowNode;
  });
}

function appendSelected(nodes: FlowNode[], node: FlowNode): FlowNode[] {
  return [...select(nodes, ""), { ...node, selected: true } as FlowNode];
}

function columnCount(nodes: FlowNode[]) {
  return nodes.reduce((max, n) => Math.max(max, n.data.col), -1) + 1;
}

function removeNode(nodes: FlowNode[], node: FlowNode) {
  return compact(
    nodes.filter((n) => n.id !== node.id),
    node.data.col,
    node.data.row
  );
}

function moveLeft(nodes: FlowNode[], sel: FlowNode): FlowNode[] {
  if (sel.data.col === 0) {
    return nodes;
  }

  const selectedColumnNodes = nodes.filter((n) => n.data.col === sel.data.col);
  const remaining = removeNode(nodes, sel);

  if (selectedColumnNodes.length === 1) {
    const targetCol = sel.data.col - 1;
    const targetRow = maxRow(remaining, targetCol) + 1;
    return appendSelected(remaining, tile(sel, targetCol, targetRow));
  }

  const shifted = remaining.map((n) =>
    n.data.col >= sel.data.col ? tile(n, n.data.col + 1, n.data.row) : n
  );
  return appendSelected(shifted, tile(sel, sel.data.col, 0));
}

function moveRight(nodes: FlowNode[], sel: FlowNode): FlowNode[] {
  const selectedColumnNodes = nodes.filter((n) => n.data.col === sel.data.col);
  const totalColumns = columnCount(nodes);

  if (selectedColumnNodes.length === 1) {
    if (sel.data.col === totalColumns - 1) {
      return nodes;
    }

    const remaining = removeNode(nodes, sel);
    const targetCol = sel.data.col;
    const targetRow = maxRow(remaining, targetCol) + 1;
    return appendSelected(remaining, tile(sel, targetCol, targetRow));
  }

  const remaining = removeNode(nodes, sel);
  const targetCol = sel.data.col + 1;
  const shifted = remaining.map((n) =>
    n.data.col >= targetCol ? tile(n, n.data.col + 1, n.data.row) : n
  );
  return appendSelected(shifted, tile(sel, targetCol, 0));
}

export type CreateNode = (
  type: string,
  col: number,
  row: number,
  nodes: readonly FlowNode[]
) => FlowNode;

export function useTilingLayout(
  setNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>,
  createNode: CreateNode
) {
  const update = useCallback(
    (fn: (prev: FlowNode[]) => FlowNode[]) =>
      setNodes((prev) => layout(fn(prev))),
    [setNodes]
  );

  const create = useCallback(
    (dc: number, dr: number, type: string) => {
      update((nodes) => {
        const sel = nodes.find((n) => n.selected);
        if (!sel) {
          const col = columnCount(nodes);
          return appendSelected(nodes, createNode(type, col, 0, nodes));
        }

        let col = sel.data.col;
        let row = sel.data.row;
        let pushed = nodes;

        if (dc !== 0) {
          col = sel.data.col + (dc > 0 ? 1 : 0);
          row = 0;
          pushed = nodes.map((n) =>
            n.data.col >= col ? tile(n, n.data.col + 1, n.data.row) : n
          );
        } else if (dr !== 0) {
          col = sel.data.col;
          row = sel.data.row + (dr > 0 ? 1 : 0);
          pushed = nodes.map((n) =>
            n.data.col === col && n.data.row >= row
              ? tile(n, n.data.col, n.data.row + 1)
              : n
          );
        }

        return appendSelected(pushed, createNode(type, col, row, nodes));
      });
    },
    [createNode, update]
  );

  const remove = useCallback(
    (nodeId: string) => {
      update((nodes) => {
        const target = nodes.find((n) => n.id === nodeId);
        if (!target) {
          return nodes;
        }
        const { col, row } = target.data;
        const result = compact(
          nodes.filter((n) => n.id !== nodeId),
          col,
          row
        );

        const neighbor =
          nearestInColumn(result, col, row) ??
          nearestInColumn(result, col - 1, row);
        return neighbor ? select(result, neighbor.id) : result;
      });
    },
    [update]
  );

  const replace = useCallback(
    (nodeId: string, type: string) => {
      update((nodes) => {
        const target = nodes.find((n) => n.id === nodeId);
        if (!target) {
          return nodes;
        }
        const newNode = createNode(type, target.data.col, target.data.row, nodes);
        return nodes.map((n) =>
          n.id === nodeId
            ? ({ ...newNode, selected: n.selected } as FlowNode)
            : n
        );
      });
    },
    [createNode, update]
  );

  const focus = useCallback(
    (dc: number, dr: number) => {
      update((nodes) => {
        const sel = nodes.find((n) => n.selected);
        if (!sel) {
          return nodes;
        }
        const target =
          dc === 0
            ? at(nodes, sel.data.col, sel.data.row + dr)
            : nearestInColumn(nodes, sel.data.col + dc, sel.data.row);
        return target ? select(nodes, target.id) : nodes;
      });
    },
    [update]
  );

  const move = useCallback(
    (dc: number, dr: number) => {
      update((nodes) => {
        const sel = nodes.find((n) => n.selected);
        if (!sel) {
          return nodes;
        }
        if (dc !== 0) {
          return dc < 0 ? moveLeft(nodes, sel) : moveRight(nodes, sel);
        }

        const target = at(nodes, sel.data.col, sel.data.row + dr);
        if (!target) {
          return nodes;
        }
        return nodes.map((n) => {
          if (n.id === sel.id) {
            return tile(n, target.data.col, target.data.row);
          }
          if (n.id === target.id) {
            return tile(n, sel.data.col, sel.data.row);
          }
          return n;
        });
      });
    },
    [update]
  );

  return { create, remove, replace, focus, move };
}
