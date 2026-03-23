import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { NiriColumn } from "@/components/workspace/niri-column";
import { TILE_WIDTH } from "@/layout/layout-types";
import { useLayoutStore } from "@/stores/layout-store";
import { cn } from "@/utils/tailwind";

type LayoutStoreState = ReturnType<typeof useLayoutStore.getState>;

export function NiriRenderer() {
  const { activeColumnId, activeWorkspace, focusedItemId, isOverviewOpen } =
    useLayoutStore(
      useShallow((state: LayoutStoreState) => {
        const activeWorkspaceId = state.layout.camera.activeWorkspaceId;
        const activeWorkspace =
          state.layout.workspaces.find(
            (workspace) => workspace.id === activeWorkspaceId
          ) ?? state.layout.workspaces[0];

        return {
          activeColumnId: state.layout.camera.activeColumnId,
          activeWorkspace,
          focusedItemId: state.layout.camera.focusedItemId,
          isOverviewOpen: state.layout.isOverviewOpen,
        };
      })
    );
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!activeColumnId || isOverviewOpen) {
      return;
    }

    columnRefs.current[activeColumnId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeColumnId, isOverviewOpen]);

  if (!activeWorkspace) {
    return <div className="flex h-full items-center justify-center" />;
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      <div
        className={cn(
          "flex min-h-0 w-full overflow-auto p-4 transition-all duration-200 ease-out",
          isOverviewOpen
            ? "justify-center overflow-y-auto"
            : "gap-3 overflow-y-hidden"
        )}
      >
        <div
          className={cn(
            "flex h-full min-h-0 w-full gap-3 transition-transform duration-200 ease-out",
            isOverviewOpen && "origin-top scale-[0.72] py-8"
          )}
        >
          {activeWorkspace.columns.map((column) => {
            const itemCount = Math.max(column.items.length, 1);
            const defaultItemHeight = `calc((100% - ${(itemCount - 1) * 8}px) / ${itemCount})`;

            return (
              <div
                className="min-h-0 shrink-0"
                key={column.id}
                ref={(node) => {
                  columnRefs.current[column.id] = node;
                }}
                style={{ width: column.preferredWidth ?? TILE_WIDTH }}
              >
                <NiriColumn
                  column={column}
                  defaultItemHeight={defaultItemHeight}
                  isActive={
                    column.id === activeColumnId ||
                    column.items.some((item) => item.id === focusedItemId)
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
