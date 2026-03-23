import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { NiriColumn } from "@/components/workspace/niri-column";
import { TILE_HEIGHT, TILE_WIDTH } from "@/layout/layout-types";
import { useLayoutStore } from "@/stores/layout-store";
import { cn } from "@/utils/tailwind";

type LayoutStoreState = ReturnType<typeof useLayoutStore.getState>;

export function NiriRenderer() {
  const {
    activeColumnId,
    activeWorkspaceId,
    focusedItemId,
    isOverviewOpen,
    workspaces,
  } = useLayoutStore(
    useShallow((state: LayoutStoreState) => {
      return {
        activeColumnId: state.layout.camera.activeColumnId,
        activeWorkspaceId: state.layout.camera.activeWorkspaceId,
        focusedItemId: state.layout.camera.focusedItemId,
        isOverviewOpen: state.layout.isOverviewOpen,
        workspaces: state.layout.workspaces,
      };
    })
  );
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!activeColumnId || isOverviewOpen) {
      return;
    }

    // Double rAF ensures the browser has painted the new column
    // before we attempt to scroll to it.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        columnRefs.current[activeColumnId]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      });
    });
  }, [activeColumnId, isOverviewOpen]);

  if (workspaces.length === 0) {
    return <div className="flex h-full items-center justify-center" />;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      <div
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pt-3 pb-4",
          isOverviewOpen ? "gap-5" : "gap-6"
        )}
      >
        {workspaces.map((workspace, workspaceIndex) => {
          const workspaceName =
            workspace.name || `Workspace ${workspaceIndex + 1}`;
          const isActiveWorkspace =
            workspace.id === activeWorkspaceId ||
            (!activeWorkspaceId && workspaceIndex === 0);

          return (
            <section className="shrink-0" key={workspace.id}>
              <div
                className={cn(
                  "pointer-events-none pb-1 pl-1 font-medium text-[11px] tracking-[0.02em]",
                  isActiveWorkspace
                    ? "text-foreground/90"
                    : "text-muted-foreground/90"
                )}
              >
                {workspaceName}
              </div>
              <div className="w-full overflow-x-auto overflow-y-hidden">
                <div
                  className={cn(
                    "flex min-h-0 gap-3 pr-2 transition-transform duration-200 ease-out",
                    isOverviewOpen && "origin-top scale-[0.95] py-2"
                  )}
                  style={{ height: TILE_HEIGHT }}
                >
                  {workspace.columns.map((column) => {
                    const itemCount = Math.max(column.items.length, 1);
                    const defaultItemHeight = `calc((100% - ${(itemCount - 1) * 8}px) / ${itemCount})`;

                    return (
                      <div
                        className="h-full min-h-0 shrink-0"
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
                            column.items.some(
                              (item) => item.id === focusedItemId
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
