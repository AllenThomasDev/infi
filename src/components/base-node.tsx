import type { ComponentProps } from "react";

import { cn } from "@/utils/tailwind";

interface BaseNodeProps extends ComponentProps<"div"> {
  cardClassName?: string;
  label?: string;
  selected?: boolean;
}

export function BaseNode({
  cardClassName,
  className,
  label,
  selected = false,
  ...props
}: BaseNodeProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <div className="user-select-none pb-1 pl-3 text-[10px] text-muted-foreground">
          {label}
        </div>
      )}
      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col border border-border bg-card text-card-foreground shadow-sm transition-[background-color,border-color,box-shadow]",
          "hover:border-accent-foreground/25 hover:bg-card hover:shadow-md",
          "data-[selected=true]:border-primary/40 data-[selected=true]:bg-card data-[selected=true]:shadow-lg",
          "data-[selected=true]:hover:border-primary/50 data-[selected=true]:hover:bg-card",
          cardClassName
        )}
        data-selected={selected}
        data-slot="base-node"
        {...props}
      />
    </div>
  );
}

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export function BaseNodeHeader({
  className,
  ...props
}: ComponentProps<"header">) {
  return (
    <header
      data-slot="base-node-header"
      {...props}
      className={cn(
        "flex flex-row items-center justify-between gap-2 px-3 py-2",
        className
      )}
    />
  );
}

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export function BaseNodeHeaderTitle({
  className,
  ...props
}: ComponentProps<"h3">) {
  return (
    <h3
      className={cn("user-select-none flex-1 font-semibold", className)}
      data-slot="base-node-header-title"
      {...props}
    />
  );
}

export function BaseNodeContent({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-y-2 p-3",
        "in-[[data-slot=base-node]:has(>[data-slot=base-node-header])]:pt-0",
        "in-[[data-slot=base-node]:has(>[data-slot=base-node-footer])]:pb-0",
        className
      )}
      data-slot="base-node-content"
      {...props}
    />
  );
}

export function BaseNodeFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-y-2 border-t px-3 pt-2 pb-3",
        className
      )}
      data-slot="base-node-footer"
      {...props}
    />
  );
}
