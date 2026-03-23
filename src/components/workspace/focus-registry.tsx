import { useEffect } from "react";
import { useLayoutStore } from "@/stores/layout-store";

interface FocusableHandle {
  focus: () => void;
}

const focusRegistry = new Map<string, FocusableHandle>();

let prevFocusedItemId: string | undefined;
useLayoutStore.subscribe((state) => {
  const focusedItemId = state.layout.camera.focusedItemId;
  if (focusedItemId !== prevFocusedItemId) {
    prevFocusedItemId = focusedItemId;
    if (focusedItemId) {
      requestAnimationFrame(() => {
        focusRegistry.get(focusedItemId)?.focus();
      });
    }
  }
});

function registerFocusable(itemId: string, handle: FocusableHandle) {
  focusRegistry.set(itemId, handle);

  // If this item is already the focused item, focus it immediately.
  // Handles the picker → terminal transition where the item ID stays
  // the same but the component remounts.
  if (itemId === useLayoutStore.getState().layout.camera.focusedItemId) {
    requestAnimationFrame(() => handle.focus());
  }

  return () => {
    if (focusRegistry.get(itemId) === handle) {
      focusRegistry.delete(itemId);
    }
  };
}

export function useFocusRegistration(
  itemId: string,
  handle: FocusableHandle
) {
  useEffect(() => registerFocusable(itemId, handle), [itemId, handle]);
}
