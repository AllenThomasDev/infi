export interface Project {
  activeCanvasId: string;
  canvases: Canvas[];
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
  worktreePath: string | null;
}
