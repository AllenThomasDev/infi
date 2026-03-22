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
  cwd?: string;
  terminalId: string;
  title: string;
}

export interface BrowserNodeData extends TileData {
  title: string;
  url: string;
}

export type PickerNodeData = TileData;

export type WindowFlowNode = Node<WindowNodeData, "window">;
export type TerminalFlowNode = Node<TerminalNodeData, "terminal">;
export type BrowserFlowNode = Node<BrowserNodeData, "browser">;
export type PickerFlowNode = Node<PickerNodeData, "picker">;
export type FlowNode =
  | WindowFlowNode
  | TerminalFlowNode
  | BrowserFlowNode
  | PickerFlowNode;
