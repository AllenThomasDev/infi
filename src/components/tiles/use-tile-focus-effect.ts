import { useEffect } from "react";
import { useLayoutStore } from "@/stores/layout-store";

export function useFocusWhenSelected(itemId: string, focus: () => void) {
  const focusedItemId = useLayoutStore(
    (state) => state.layout.camera.focusedItemId
  );
  const focusTick = useLayoutStore((state) => state.layout.camera.focusTick);

  useEffect(() => {
    if (focusedItemId !== itemId) {
      return;
    }

    const scheduledTick = focusTick;
    const frame = requestAnimationFrame(() => {
      const {
        focusedItemId: currentFocusedItemId,
        focusTick: currentFocusTick,
      } = useLayoutStore.getState().layout.camera;
      if (
        currentFocusedItemId !== itemId ||
        currentFocusTick !== scheduledTick
      ) {
        return;
      }

      focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [focus, focusTick, focusedItemId, itemId]);
}
