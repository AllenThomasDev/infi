import { beforeEach, describe, expect, it } from "vitest";
import type {
  NiriCanvasLayout,
  NiriLayoutItem,
  NiriWorkspace,
} from "@/layout/layout-types";
import { TILE_WIDTH } from "@/layout/layout-types";
import { useLayoutStore } from "@/stores/layout-store";

function makeItem(
  id: string,
  ref: NiriLayoutItem["ref"] = { type: "terminal" }
): NiriLayoutItem {
  return { id, ref };
}

function makeWorkspace(id: string, items: NiriLayoutItem[]): NiriWorkspace {
  return { id, items };
}

function makeLayout(
  workspaces: NiriWorkspace[],
  selectedItemId?: string,
  lastColumnByWorkspaceId: Record<string, number> = {}
): NiriCanvasLayout {
  return {
    focusTick: 0,
    isOverviewOpen: false,
    lastColumnByWorkspaceId,
    selectedItemId,
    workspaces,
  };
}

function seedLayout(layout: NiriCanvasLayout) {
  useLayoutStore.setState({
    ...useLayoutStore.getState(),
    layout,
  });
}

function currentLayout() {
  return useLayoutStore.getState().layout;
}

describe("useLayoutStore", () => {
  beforeEach(() => {
    useLayoutStore.setState(useLayoutStore.getInitialState(), true);
  });

  it("starts with an empty layout", () => {
    expect(currentLayout().workspaces).toHaveLength(0);
    expect(currentLayout().selectedItemId).toBeUndefined();
  });

  it("keeps layout isolated per active canvas", () => {
    const first = makeItem("canvas-a-item", { type: "browser" });
    const second = makeItem("canvas-b-item", { type: "terminal" });

    useLayoutStore.getState().setActiveCanvas("canvas-a");
    useLayoutStore.getState().addItem(first);

    useLayoutStore.getState().setActiveCanvas("canvas-b");
    expect(currentLayout().workspaces).toHaveLength(0);
    useLayoutStore.getState().addItem(second);

    useLayoutStore.getState().setActiveCanvas("canvas-a");
    expect(currentLayout().workspaces[0]?.items.map((item) => item.id)).toEqual(
      [first.id]
    );

    useLayoutStore.getState().setActiveCanvas("canvas-b");
    expect(currentLayout().workspaces[0]?.items.map((item) => item.id)).toEqual(
      [second.id]
    );
  });

  it("toggles overview mode without changing selection", () => {
    const first = makeItem("first");

    useLayoutStore.getState().addItem(first);
    useLayoutStore.getState().selectItem(first.id);

    const before = currentLayout();
    useLayoutStore.getState().toggleOverview();

    const after = currentLayout();
    expect(after.isOverviewOpen).toBe(!before.isOverviewOpen);
    expect(after.selectedItemId).toBe(before.selectedItemId);
  });

  it("moves focus horizontally and vertically with remembered column", () => {
    const a = makeItem("a");
    const b = makeItem("b");
    const c = makeItem("c");
    const d = makeItem("d");
    const e = makeItem("e");

    seedLayout(
      makeLayout(
        [makeWorkspace("ws-1", [a, b, c]), makeWorkspace("ws-2", [d, e])],
        c.id
      )
    );

    useLayoutStore.getState().focusNeighbor(-1, 0);
    expect(currentLayout().selectedItemId).toBe(b.id);

    useLayoutStore.getState().focusNeighbor(0, 1);
    expect(currentLayout().selectedItemId).toBe(e.id);
  });

  it("creates a workspace below and selects the inserted item", () => {
    seedLayout(
      makeLayout(
        [
          makeWorkspace("ws-1", [makeItem("one")]),
          makeWorkspace("ws-2", [makeItem("two")]),
        ],
        "one"
      )
    );

    const pickerItem = makeItem("picker-1", { type: "picker" });
    useLayoutStore.getState().addWorkspaceBelow(pickerItem);

    const next = currentLayout();
    expect(next.workspaces).toHaveLength(3);
    expect(next.workspaces[1]?.id).not.toBe("ws-1");
    expect(next.workspaces[1]?.id).not.toBe("ws-2");
    expect(next.workspaces[1]?.items[0]?.id).toBe(pickerItem.id);
    expect(next.selectedItemId).toBe(pickerItem.id);
  });

  it("adds a tile to the right of the selected tile", () => {
    const first = makeItem("first", { type: "browser" });
    const second = makeItem("second", { type: "browser" });
    const third = makeItem("third", { type: "browser" });

    seedLayout(makeLayout([makeWorkspace("ws-1", [first, third])], first.id));

    useLayoutStore.getState().addItem(second);

    const items = currentLayout().workspaces[0].items;
    expect(items.map((item) => item.id)).toEqual([
      first.id,
      second.id,
      third.id,
    ]);
    expect(currentLayout().selectedItemId).toBe(second.id);
  });

  it("persists preferred item widths and clamps them", () => {
    const left = makeItem("left");
    const right = makeItem("right");

    seedLayout(makeLayout([makeWorkspace("ws-1", [left, right])], left.id));

    useLayoutStore.getState().setColumnWidths({
      [left.id]: 640,
      [right.id]: 1,
    });

    const resized = currentLayout().workspaces[0].items;
    expect(resized[0].preferredWidth).toBe(640);
    expect(resized[1].preferredWidth).toBe(Math.round(TILE_WIDTH * 0.25));
  });

  it("moves an item across workspaces and updates selection", () => {
    const source = makeItem("source");
    const destination = makeItem("destination");

    seedLayout(
      makeLayout(
        [makeWorkspace("ws-1", [source]), makeWorkspace("ws-2", [destination])],
        source.id
      )
    );

    useLayoutStore.getState().moveItem(source.id, "ws-2", 1);

    const next = currentLayout();
    expect(next.workspaces).toHaveLength(1);
    expect(next.workspaces[0].id).toBe("ws-2");
    expect(next.workspaces[0].items.map((item) => item.id)).toEqual([
      destination.id,
      source.id,
    ]);
    expect(next.selectedItemId).toBe(source.id);
  });

  it("reorders within the same workspace", () => {
    const first = makeItem("first");
    const second = makeItem("second");

    seedLayout(makeLayout([makeWorkspace("ws-1", [first, second])], first.id));

    useLayoutStore.getState().moveItem(first.id, "ws-1", 1);

    const next = currentLayout();
    expect(next.workspaces[0].items.map((item) => item.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect(next.selectedItemId).toBe(first.id);
  });

  it("removes an item and preserves focus on nearest sibling", () => {
    const keep = makeItem("keep");
    const remove = makeItem("remove");

    seedLayout(makeLayout([makeWorkspace("ws-1", [keep, remove])], remove.id));

    useLayoutStore.getState().removeItem(remove.id);

    const next = currentLayout();
    expect(next.workspaces[0].items.map((item) => item.id)).toEqual([keep.id]);
    expect(next.selectedItemId).toBe(keep.id);
  });

  it("removes empty workspace when last tile is deleted", () => {
    const tile = makeItem("terminal-1", { type: "terminal" });
    const other = makeItem("terminal-2", { type: "terminal" });

    seedLayout(
      makeLayout(
        [makeWorkspace("ws-1", [tile]), makeWorkspace("ws-2", [other])],
        tile.id
      )
    );

    useLayoutStore.getState().removeItem(tile.id);

    const next = currentLayout();
    expect(next.workspaces).toHaveLength(1);
    expect(next.workspaces[0].id).toBe("ws-2");
    expect(next.selectedItemId).toBe(other.id);
  });

  it("does not churn workspace id when moving down at edge with a single tile", () => {
    const tile = makeItem("tile");

    seedLayout(makeLayout([makeWorkspace("ws-1", [tile])], tile.id));

    useLayoutStore.getState().moveItemToAdjacentWorkspace(tile.id, 1);

    const next = currentLayout();
    expect(next.workspaces).toHaveLength(1);
    expect(next.workspaces[0].items.map((item) => item.id)).toEqual([tile.id]);
    expect(next.selectedItemId).toBe(tile.id);
    expect(next.workspaces[0].id).toBe("ws-1");
  });

  it("does not churn workspace id when moving up at edge with a single tile", () => {
    const tile = makeItem("tile");

    seedLayout(makeLayout([makeWorkspace("ws-1", [tile])], tile.id));

    useLayoutStore.getState().moveItemToAdjacentWorkspace(tile.id, -1);

    const next = currentLayout();
    expect(next.workspaces).toHaveLength(1);
    expect(next.workspaces[0].items.map((item) => item.id)).toEqual([tile.id]);
    expect(next.selectedItemId).toBe(tile.id);
    expect(next.workspaces[0].id).toBe("ws-1");
  });

  it("creates a workspace at edge when source workspace has multiple tiles", () => {
    const a = makeItem("a");
    const b = makeItem("b");

    seedLayout(makeLayout([makeWorkspace("ws-1", [a, b])], b.id));

    useLayoutStore.getState().moveItemToAdjacentWorkspace(b.id, 1);

    const next = currentLayout();
    expect(next.workspaces).toHaveLength(2);
    expect(next.workspaces[0].id).toBe("ws-1");
    expect(next.workspaces[0].items.map((item) => item.id)).toEqual([a.id]);
    expect(next.workspaces[1].items.map((item) => item.id)).toEqual([b.id]);
    expect(next.selectedItemId).toBe(b.id);
  });

  it("inserts after target row last active column", () => {
    const a = makeItem("a");
    const b = makeItem("b");
    const c = makeItem("c");

    seedLayout(
      makeLayout(
        [makeWorkspace("ws-1", [a, b]), makeWorkspace("ws-2", [c])],
        c.id,
        { "ws-1": 0 }
      )
    );

    useLayoutStore.getState().moveItemToAdjacentWorkspace(c.id, -1);

    const next = currentLayout();
    expect(next.workspaces).toHaveLength(1);
    expect(next.workspaces[0].items.map((item) => item.id)).toEqual([
      a.id,
      c.id,
      b.id,
    ]);
    expect(next.selectedItemId).toBe(c.id);
  });

  it("appends when target row last active is its last tile", () => {
    const a = makeItem("a");
    const b = makeItem("b");
    const c = makeItem("c");

    seedLayout(
      makeLayout(
        [makeWorkspace("ws-1", [a, b]), makeWorkspace("ws-2", [c])],
        c.id,
        { "ws-1": 1 }
      )
    );

    useLayoutStore.getState().moveItemToAdjacentWorkspace(c.id, -1);

    const next = currentLayout();
    expect(next.workspaces).toHaveLength(1);
    expect(next.workspaces[0].items.map((item) => item.id)).toEqual([
      a.id,
      b.id,
      c.id,
    ]);
    expect(next.selectedItemId).toBe(c.id);
  });
});
