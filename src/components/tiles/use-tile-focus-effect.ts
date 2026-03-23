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
    if (!isFocused) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const target = container.querySelector<HTMLElement>(focusTarget);
      if (target && !container.contains(document.activeElement)) {
        target.focus();
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [containerRef, focusTarget, isFocused]);
}
