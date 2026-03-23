import type { NiriColumn as NiriColumnType } from "@/layout/layout-types";
import { cn } from "@/utils/tailwind";
import { NiriTile } from "./niri-tile";

interface NiriColumnProps {
  column: NiriColumnType;
  defaultItemHeight: number | string;
  isActive: boolean;
}

export function NiriColumn({
  column,
  defaultItemHeight,
  isActive,
}: NiriColumnProps) {
  const focusedItemId = column.focusedItemId ?? column.items[0]?.id;
  const tabbedItem =
    column.items.find((item) => item.id === focusedItemId) ?? column.items[0];

  if (!tabbedItem && column.displayMode === "tabbed") {
    return null;
  }

  if (column.displayMode === "tabbed") {
    return (
      <section
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-background/40 backdrop-blur-sm",
          isActive
            ? "border-primary/40 shadow-lg shadow-primary/5"
            : "border-border/70"
        )}
        data-active={isActive}
        data-column-id={column.id}
      >
        <div className="flex items-center gap-1 overflow-x-auto border-b bg-muted/40 p-2">
          {column.items.map((item) => (
            <div
              className={cn(
                "truncate rounded-md px-2 py-1 font-medium text-xs",
                item.id === focusedItemId
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
              key={item.id}
            >
              {item.ref.type}
            </div>
          ))}
        </div>
        <div className="min-h-0 flex-1 p-2">
          <NiriTile
            item={tabbedItem}
            selected={tabbedItem.id === focusedItemId}
          />
        </div>
      </section>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-2"
      data-column-id={column.id}
    >
      {column.items.map((item) => (
        <NiriTile
          className="min-h-0"
          item={item}
          key={item.id}
          selected={item.id === focusedItemId}
          style={{
            flex: item.preferredHeight ? "0 0 auto" : "1 1 0",
            height: item.preferredHeight ?? defaultItemHeight,
          }}
        />
      ))}
    </div>
  );
}
