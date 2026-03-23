export const TILE_WIDTH = 840;
export const TILE_HEIGHT = 520;

export type NiriItemRef =
  | { type: "terminal" }
  | { type: "browser" }
  | { type: "picker" };

export interface NiriLayoutItem {
  id: string;
  preferredHeight?: number;
  ref: NiriItemRef;
}

export interface NiriColumn {
  displayMode: "normal" | "tabbed";
  focusedItemId?: string;
  id: string;
  items: NiriLayoutItem[];
  preferredWidth?: number;
}

export interface NiriWorkspace {
  columns: NiriColumn[];
  id: string;
  name: string;
}

export interface NiriCameraState {
  activeColumnId?: string;
  activeWorkspaceId?: string;
  focusedItemId?: string;
}

export interface NiriCanvasLayout {
  camera: NiriCameraState;
  isOverviewOpen: boolean;
  workspaces: NiriWorkspace[];
}
