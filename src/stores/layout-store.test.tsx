import { beforeEach, describe, expect, it } from "vitest";
import type {
  NiriCanvasLayout,
  NiriColumn,
  NiriLayoutItem,
  NiriWorkspace,
} from "@/layout/layout-types";
import { TILE_HEIGHT, TILE_WIDTH } from "@/layout/layout-types";
import { useLayoutStore } from "@/stores/layout-store";

function makeItem(
  id: string,
  ref: NiriLayoutItem["ref"] = { type: "terminal" }
): NiriLayoutItem {
  return { id, ref };
}

function makeColumn(
  id: string,
  items: NiriLayoutItem[],
  overrides: Partial<NiriColumn> = {}
): NiriColumn {
  return {
    id,
    items,
    displayMode: "normal",
    focusedItemId: items[0]?.id,
    ...overrides,
  };
}

function makeWorkspace(id: string, columns: NiriColumn[]): NiriWorkspace {
  return { id, columns };
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

  it("toggles tabbed display without changing items or focus", () => {
    const first = makeItem("first");
    const second = makeItem("second", { type: "picker" });

    useLayoutStore.getState().addItemBelow(first);
    useLayoutStore.getState().addItemBelow(second);
    useLayoutStore.getState().selectItem(first.id);

    const before = currentLayout();
    const workspace = before.workspaces[0];
    const column = workspace.columns[0];

    useLayoutStore.getState().toggleTabbed();

    const afterColumn = currentLayout().workspaces[0].columns[0];
    expect(afterColumn.items.map((item) => item.id)).toEqual(
      column.items.map((item) => item.id)
    );
    expect(afterColumn.focusedItemId).toBe(first.id);
    expect(afterColumn.displayMode).toBe("tabbed");
  });

  it("toggles overview mode without changing focus", () => {
    const first = makeItem("first");

    useLayoutStore.getState().addColumnRight(first);
    useLayoutStore.getState().selectItem(first.id);

    const before = currentLayout();
    useLayoutStore.getState().toggleOverview();

    const after = currentLayout();
    expect(after.isOverviewOpen).toBe(!before.isOverviewOpen);
    expect(after.camera.focusedItemId).toBe(before.camera.focusedItemId);
    expect(after.camera.activeColumnId).toBe(before.camera.activeColumnId);
  });

  it("moves horizontally using row-aligned targets", () => {
    const tile1 = makeItem("tile-1");
    const tile2 = makeItem("tile-2");
    const tile3 = makeItem("tile-3", { type: "browser" });
    const tile4 = makeItem("tile-4", { type: "picker" });
    const workspace = makeWorkspace("ws-1", [
      makeColumn("col-1", [tile1]),
      makeColumn("col-2", [tile2, tile4], { focusedItemId: tile4.id }),
      makeColumn("col-3", [tile3]),
    ]);

    seedLayout({
      workspaces: [workspace],
      camera: {
        activeWorkspaceId: workspace.id,
        activeColumnId: "col-1",
        focusedItemId: tile1.id,
      },
      isOverviewOpen: true,
    });

    useLayoutStore.getState().focusNeighbor(1, 0);
    expect(currentLayout().camera.focusedItemId).toBe(tile2.id);

    useLayoutStore.getState().selectItem(tile4.id);
    useLayoutStore.getState().focusNeighbor(1, 0);
    expect(currentLayout().camera.focusedItemId).toBe(tile3.id);

    useLayoutStore.getState().selectItem(tile4.id);
    useLayoutStore.getState().focusNeighbor(-1, 0);
    expect(currentLayout().camera.focusedItemId).toBe(tile1.id);
  });

  it("creates a new column for each item added to the right", () => {
    const firstBrowser = makeItem("browser-1", { type: "browser" });
    const secondBrowser = makeItem("browser-2", { type: "browser" });

    useLayoutStore.getState().addColumnRight(firstBrowser);
    useLayoutStore.getState().addColumnRight(secondBrowser);

    const layout = currentLayout();
    const items = layout.workspaces[0].columns.flatMap(
      (column) => column.items
    );

    expect(
      items.filter((item) => item.ref.type === "browser").map((item) => item.id)
    ).toEqual([firstBrowser.id, secondBrowser.id]);
    expect(layout.camera.focusedItemId).toBe(secondBrowser.id);
  });

  it("persists resized column widths and clamps them", () => {
    const left = makeItem("left");
    const right = makeItem("right");

    useLayoutStore.getState().addColumnRight(left);
    useLayoutStore.getState().addColumnRight(right);

    const [leftColumn, rightColumn] = currentLayout().workspaces[0].columns;
    useLayoutStore.getState().setColumnWidths({
      [leftColumn.id]: 640,
      [rightColumn.id]: 1,
    });

    const resized = currentLayout().workspaces[0].columns;
    expect(resized[0].preferredWidth).toBe(640);
    expect(resized[1].preferredWidth).toBe(Math.round(TILE_WIDTH * 0.25));
  });

  it("persists resized item heights and clamps them", () => {
    const top = makeItem("top");
    const bottom = makeItem("bottom");

    useLayoutStore.getState().addItemBelow(top);
    useLayoutStore.getState().addItemBelow(bottom);

    const items = currentLayout().workspaces[0].columns[0].items;
    useLayoutStore.getState().setItemHeights({
      [items[0].id]: 300,
      [items[1].id]: 1,
    });

    const resized = currentLayout().workspaces[0].columns[0].items;
    expect(resized[0].preferredHeight).toBe(300);
    expect(resized[1].preferredHeight).toBe(Math.round(TILE_HEIGHT * 0.25));
  });

  it("moves an item across workspaces and updates camera focus", () => {
    const source = makeItem("source");
    const destination = makeItem("destination");
    const layout = {
      workspaces: [
        makeWorkspace("ws-1", [makeColumn("col-1", [source])]),
        makeWorkspace("ws-2", [makeColumn("col-2", [destination])]),
      ],
      camera: {
        activeWorkspaceId: "ws-1",
        activeColumnId: "col-1",
        focusedItemId: source.id,
      },
      isOverviewOpen: false,
    } satisfies NiriCanvasLayout;

    seedLayout(layout);
    useLayoutStore.getState().moveItem(source.id, "col-2");

    const next = currentLayout();
    const destinationWorkspace = next.workspaces.find(
      (workspace) => workspace.id === "ws-2"
    );
    const destinationColumn = destinationWorkspace?.columns[0];
    expect(destinationColumn).toBeDefined();
    if (!destinationColumn) {
      throw new Error("Expected destination column after move");
    }
    expect(destinationColumn.items.map((item) => item.id)).toEqual([
      destination.id,
      source.id,
    ]);
    expect(next.camera.activeWorkspaceId).toBe("ws-2");
    expect(next.camera.activeColumnId).toBe("col-2");
    expect(next.camera.focusedItemId).toBe(source.id);
  });

  it("removes an item, drops empty containers, and preserves focus", () => {
    const keep = makeItem("keep");
    const remove = makeItem("remove");
    const other = makeItem("other");
    const layout = {
      workspaces: [
        makeWorkspace("ws-1", [
          makeColumn("col-1", [keep, remove], { focusedItemId: remove.id }),
        ]),
        makeWorkspace("ws-2", [makeColumn("col-2", [other])]),
      ],
      camera: {
        activeWorkspaceId: "ws-1",
        activeColumnId: "col-1",
        focusedItemId: remove.id,
      },
      isOverviewOpen: false,
    } satisfies NiriCanvasLayout;

    seedLayout(layout);
    useLayoutStore.getState().removeItem(remove.id);

    const next = currentLayout();
    expect(next.workspaces).toHaveLength(2);
    expect(next.workspaces[0].columns[0].items.map((item) => item.id)).toEqual([
      keep.id,
    ]);
    expect(next.camera.focusedItemId).toBe(keep.id);
  });
});
