import type { Node } from "@xyflow/react";

export interface WindowNodeData extends Record<string, unknown> {
  subtitle: string;
  title: string;
}

export interface TerminalNodeData extends Record<string, unknown> {
  terminalId: string;
  title: string;
}

export type WindowFlowNode = Node<WindowNodeData, "window">;
export type TerminalFlowNode = Node<TerminalNodeData, "terminal">;
export type GroupFlowNode = Node<Record<string, unknown>, "group">;
export type FlowNode = WindowFlowNode | TerminalFlowNode | GroupFlowNode;
