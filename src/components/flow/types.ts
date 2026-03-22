import type { Node } from "@xyflow/react";

interface TileData extends Record<string, unknown> {
  col: number;
  row: number;
}

export interface WindowNodeData extends TileData {
  subtitle: string;
  title: string;
}

export interface TerminalNodeData extends TileData {
  terminalId: string;
  title: string;
}

export type PickerNodeData = TileData;

export type WindowFlowNode = Node<WindowNodeData, "window">;
export type TerminalFlowNode = Node<TerminalNodeData, "terminal">;
export type PickerFlowNode = Node<PickerNodeData, "picker">;
export type FlowNode = WindowFlowNode | TerminalFlowNode | PickerFlowNode;
