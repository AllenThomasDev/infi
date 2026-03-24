export const TILE_WIDTH = 840;
export const TILE_HEIGHT = 520;

export type NiriItemRef =
  | { type: "terminal" }
  | { type: "browser" }
  | { type: "picker" };

export interface NiriLayoutItem {
  id: string;
  preferredWidth?: number;
  ref: NiriItemRef;
}

export interface NiriRow {
  id: string;
  items: NiriLayoutItem[];
}

export interface NiriCanvasLayout {
  focusTick: number;
  isOverviewOpen: boolean;
  lastColumnByRowId: Record<string, number>;
  rows: NiriRow[];
  selectedItemId?: string;
}
