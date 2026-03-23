import { useEffect } from "react";

interface UseTileFocusEffectOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  focusTarget: string;
  isFocused?: boolean;
}

export function useTileFocusEffect({
  containerRef,
  focusTarget,
  isFocused = false,
}: UseTileFocusEffectOptions) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (isFocused) {
      const target = container.querySelector<HTMLElement>(focusTarget);
      if (target && !container.contains(document.activeElement)) {
        target.focus();
      }
      return;
    }

    if (container.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur?.();
    }
  }, [containerRef, focusTarget, isFocused]);
}
