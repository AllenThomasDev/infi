import { useEffect } from "react";

interface UseNodeSelectionEffectsOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  focusTarget: string;
  selected?: boolean;
}

export function useNodeSelectionEffects({
  containerRef,
  focusTarget,
  selected = false,
}: UseNodeSelectionEffectsOptions) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (selected) {
      const target = container.querySelector<HTMLElement>(focusTarget);
      if (target && !container.contains(document.activeElement)) {
        target.focus();
      }
      return;
    }

    if (container.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur?.();
    }
  }, [containerRef, focusTarget, selected]);
}
