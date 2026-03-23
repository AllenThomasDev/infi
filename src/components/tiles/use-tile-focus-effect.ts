import { useEffect } from "react";
import { useLayoutStore } from "@/stores/layout-store";

export function useFocusWhenSelected(itemId: string, focus: () => void) {
  const selectedItemId = useLayoutStore((state) => state.layout.selectedItemId);
  const focusTick = useLayoutStore((state) => state.layout.focusTick);

  useEffect(() => {
    if (selectedItemId !== itemId) {
      return;
    }

    const scheduledTick = focusTick;
    const frame = requestAnimationFrame(() => {
      const {
        selectedItemId: currentSelectedItemId,
        focusTick: currentFocusTick,
      } = useLayoutStore.getState().layout;
      if (
        currentSelectedItemId !== itemId ||
        currentFocusTick !== scheduledTick
      ) {
        return;
      }

      focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [focus, focusTick, selectedItemId, itemId]);
}
