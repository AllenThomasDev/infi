export interface Project {
  canvases: Canvas[];
  createdAt: number;
  directory: string;
  id: string;
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
