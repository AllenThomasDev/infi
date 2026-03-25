import { useCallback, useEffect, useRef } from "react";
import { NiriTile } from "@/components/workspace/niri-tile";
import type { NiriCanvasLayout, NiriLayoutItem } from "@/layout/layout-types";
import { TILE_HEIGHT, TILE_WIDTH } from "@/layout/layout-types";
import { useLayoutStore } from "@/stores/layout-store";
import { useTerminalTitleStore } from "@/stores/terminal-title-store";
import { cn } from "@/utils/tailwind";

const OVERVIEW_SCALE = 0.3;
const OVERVIEW_GAP = 12;

function OverviewThumbnail({
  item,
  onSelect,
  selected,
}: {
  item: NiriLayoutItem;
  onSelect: (id: string) => void;
  selected: boolean;
}) {
  const title = useTerminalTitleStore((state) =>
    item.ref.type === "terminal" ? state.titles[item.id] : undefined
  );
  const itemWidth = item.preferredWidth ?? TILE_WIDTH;
  const scaledWidth = Math.round(itemWidth * OVERVIEW_SCALE);
  const scaledHeight = Math.round(TILE_HEIGHT * OVERVIEW_SCALE);

  return (
    <button
      className="group relative shrink-0 cursor-pointer"
      onClick={() => onSelect(item.id)}
      style={{ width: scaledWidth, height: scaledHeight }}
      type="button"
    >
      <div
        className="pointer-events-none absolute origin-top-left"
        style={{
          width: itemWidth,
          height: TILE_HEIGHT,
          transform: `scale(${OVERVIEW_SCALE})`,
        }}
      >
        <NiriTile
          className="h-full w-full"
          item={item}
          selected={false}
        />
      </div>
      <div
        className={cn(
          "absolute inset-0 rounded-sm border-2 transition-colors",
          selected
            ? "border-primary"
            : "border-transparent group-hover:border-primary/40"
        )}
      />
      {title && (
        <span className="absolute bottom-0 left-0 right-0 truncate bg-background/80 px-1 py-0.5 text-[10px] text-muted-foreground">
          {title}
        </span>
      )}
    </button>
  );
}

function OverviewGrid({ layout }: { layout: NiriCanvasLayout }) {
  const selectItem = useLayoutStore((state) => state.selectItem);
  const toggleOverview = useLayoutStore((state) => state.toggleOverview);

  const handleSelect = useCallback(
    (id: string) => {
      selectItem(id, { scroll: true });
      toggleOverview();
    },
    [selectItem, toggleOverview]
  );

  return (
    <div className="flex h-full w-full flex-col items-center overflow-auto bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div
        className="flex flex-col items-center"
        style={{ gap: OVERVIEW_GAP }}
      >
        {layout.rows.map((row) => (
          <div
            className="flex flex-wrap justify-center"
            key={row.id}
            style={{ gap: OVERVIEW_GAP }}
          >
            {row.items.map((item) => (
              <OverviewThumbnail
                item={item}
                key={item.id}
                onSelect={handleSelect}
                selected={item.id === layout.selectedItemId}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface NiriRendererProps {
  layout: NiriCanvasLayout;
}

export function NiriRenderer({ layout }: NiriRendererProps) {
  const selectedItemId = layout.selectedItemId;
  const focusTick = layout.focusTick;
  const { isFullscreenMode, isOverviewOpen, rows } = layout;
  const selectItem = useLayoutStore((state) => state.selectItem);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollSyncTimeoutRef = useRef<number | null>(null);
  const imperativeScrollActiveRef = useRef(false);
  const imperativeScrollIdleTimeoutRef = useRef<number | null>(null);

  const releaseImperativeScroll = useCallback(() => {
    if (imperativeScrollIdleTimeoutRef.current !== null) {
      window.clearTimeout(imperativeScrollIdleTimeoutRef.current);
      imperativeScrollIdleTimeoutRef.current = null;
    }
    imperativeScrollActiveRef.current = false;
  }, []);

  const markImperativeScrollActive = useCallback(() => {
    imperativeScrollActiveRef.current = true;

    if (imperativeScrollIdleTimeoutRef.current !== null) {
      window.clearTimeout(imperativeScrollIdleTimeoutRef.current);
    }

    imperativeScrollIdleTimeoutRef.current = window.setTimeout(() => {
      imperativeScrollIdleTimeoutRef.current = null;
      imperativeScrollActiveRef.current = false;
    }, 120);
  }, []);

  const syncSelectionToViewport = useCallback(() => {
    const root = rootRef.current;
    if (!root || isOverviewOpen) {
      return;
    }

    const rootRect = root.getBoundingClientRect();
    const viewportCenterX = rootRect.left + rootRect.width / 2;
    const viewportCenterY = rootRect.top + rootRect.height / 2;

    let nextItemId: string | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const row of rows) {
      for (const item of row.items) {
        const node = itemRefs.current[item.id];
        if (!node) {
          continue;
        }

        const rect = node.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const itemCenterY = rect.top + rect.height / 2;
        const distance =
          Math.abs(itemCenterX - viewportCenterX) +
          Math.abs(itemCenterY - viewportCenterY);

        if (distance < bestDistance) {
          bestDistance = distance;
          nextItemId = item.id;
        }
      }
    }

    if (nextItemId && nextItemId !== selectedItemId) {
      selectItem(nextItemId);
    }
  }, [isOverviewOpen, rows, selectItem, selectedItemId]);

  const handleScroll = useCallback(() => {
    if (scrollSyncTimeoutRef.current !== null) {
      cancelAnimationFrame(scrollSyncTimeoutRef.current);
    }

    if (imperativeScrollActiveRef.current) {
      markImperativeScrollActive();
      return;
    }

    scrollSyncTimeoutRef.current = requestAnimationFrame(() => {
      scrollSyncTimeoutRef.current = null;
      syncSelectionToViewport();
    });
  }, [markImperativeScrollActive, syncSelectionToViewport]);

  // Scroll to the selected item whenever focusTick changes.
  useEffect(() => {
    if (!selectedItemId) {
      return;
    }

    markImperativeScrollActive();

    const frame = requestAnimationFrame(() => {
      itemRefs.current[selectedItemId]?.scrollIntoView({
        behavior: "instant",
        block: "center",
        inline: "center",
      });
      markImperativeScrollActive();
    });

    return () => cancelAnimationFrame(frame);
  }, [focusTick, markImperativeScrollActive]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally keyed on focusTick, not selectedItemId

  // Clean up timers on unmount.
  useEffect(() => {
    return () => {
      if (scrollSyncTimeoutRef.current !== null) {
        cancelAnimationFrame(scrollSyncTimeoutRef.current);
      }
      releaseImperativeScroll();
    };
  }, [releaseImperativeScroll]);

  if (rows.length === 0) {
    return <div className="flex h-full items-center justify-center" />;
  }

  if (isFullscreenMode) {
    const item =
      rows.flatMap((r) => r.items).find((i) => i.id === selectedItemId) ??
      rows[0].items[0];

    return (
      <NiriTile className="h-full w-full border-0 shadow-none" fullscreen item={item} selected={false} />
    );
  }

  if (isOverviewOpen) {
    return <OverviewGrid layout={layout} />;
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20"
      ref={rootRef}
    >
      <div
        className="no-scrollbar flex min-h-0 w-full flex-1 snap-y snap-mandatory flex-col gap-6 overflow-y-auto scroll-auto px-4"
        onScroll={handleScroll}
      >
        <div
          className="shrink-0"
          style={{ height: `calc(50% - ${TILE_HEIGHT / 2}px)` }}
        />
        {rows.map((row, rowIndex) => {
          return (
            <section className="shrink-0 snap-center" key={row.id}>
              <div
                className="no-scrollbar w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-auto"
                onScroll={handleScroll}
              >
                <div
                  className="flex min-h-0 gap-3"
                  style={{ height: TILE_HEIGHT }}
                >
                  <div
                    className="shrink-0"
                    style={{ width: `calc(50% - ${TILE_WIDTH / 2}px)` }}
                  />
                  {row.items.map((item, columnIndex) => {
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
