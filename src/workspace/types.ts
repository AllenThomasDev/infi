export interface Project {
  activeCanvasId: string;
  canvasIds: string[];
  createdAt: number;
  directory: string;
  id: string;
  lastActiveAt: number;
  name: string;
}

export interface Canvas {
  branch: string | null;
  createdAt: number;
  id: string;
  lastActiveAt: number;
  name: string;
  projectId: string;
  worktreePath: string | null;
}
