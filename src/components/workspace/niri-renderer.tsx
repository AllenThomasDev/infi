import { useEffect, useRef } from "react";
import { NiriTile } from "@/components/workspace/niri-tile";
import type { NiriCanvasLayout } from "@/layout/layout-types";
import { TILE_HEIGHT, TILE_WIDTH } from "@/layout/layout-types";
import { cn } from "@/utils/tailwind";

interface NiriRendererProps {
  layout: NiriCanvasLayout;
}

export function NiriRenderer({ layout }: NiriRendererProps) {
  const selectedItemId = layout.selectedItemId;
  const focusTick = layout.focusTick;
  const { isOverviewOpen, workspaces } = layout;
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeWorkspaceId = workspaces.find((workspace) =>
    workspace.items.some((item) => item.id === selectedItemId)
  )?.id;

  useEffect(() => {
    if (!selectedItemId || isOverviewOpen) {
      return;
    }

    const scheduledTick = focusTick;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        itemRefs.current[selectedItemId]?.scrollIntoView({
          behavior: scheduledTick > 1 ? "smooth" : "auto",
          block: "center",
          inline: "center",
        });
      });
    });
  }, [focusTick, selectedItemId, isOverviewOpen]);

  if (workspaces.length === 0) {
    return <div className="flex h-full items-center justify-center" />;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      <div
        className={cn(
          "flex min-h-0 w-full flex-1 snap-y snap-mandatory flex-col overflow-y-auto scroll-smooth px-4",
          isOverviewOpen ? "gap-5" : "gap-6"
        )}
      >
        <div
          className="shrink-0"
          style={{ height: `calc(50% - ${TILE_HEIGHT / 2}px)` }}
        />
        {workspaces.map((workspace, workspaceIndex) => {
          const workspaceName = `Workspace ${workspaceIndex + 1}`;
          const isActiveWorkspace =
            workspace.id === activeWorkspaceId ||
            (!activeWorkspaceId && workspaceIndex === 0);

          return (
            <section className="shrink-0 snap-center" key={workspace.id}>
              <div
                className={cn(
                  "pointer-events-none pb-1 font-medium text-[11px] tracking-[0.02em]",
                  isActiveWorkspace
                    ? "text-foreground/90"
                    : "text-muted-foreground/90"
                )}
                style={{
                  paddingLeft: `calc(50% - ${TILE_WIDTH / 2}px + 4px)`,
                }}
              >
                {workspaceName}
              </div>
              <div className="w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth">
                <div
                  className={cn(
                    "flex min-h-0 gap-3 transition-transform duration-200 ease-out",
                    isOverviewOpen && "origin-top scale-[0.95] py-2"
                  )}
                  style={{ height: TILE_HEIGHT }}
                >
                  <div
                    className="shrink-0"
                    style={{ width: `calc(50% - ${TILE_WIDTH / 2}px)` }}
                  />
                  {workspace.items.map((item) => {
                    return (
                      <div
                        className="h-full min-h-0 shrink-0 snap-center"
                        key={item.id}
                        ref={(node) => {
                          itemRefs.current[item.id] = node;
                        }}
                        style={{ width: item.preferredWidth ?? TILE_WIDTH }}
                      >
                        <NiriTile
                          className="h-full"
                          item={item}
                          selected={item.id === selectedItemId}
                        />
                      </div>
                    );
                  })}
                  <div
                    className="shrink-0"
                    style={{ width: `calc(50% - ${TILE_WIDTH / 2}px)` }}
                  />
                </div>
              </div>
            </section>
          );
        })}
        <div
          className="shrink-0"
          style={{ height: `calc(50% - ${TILE_HEIGHT / 2}px)` }}
        />
      </div>
    </div>
  );
}
