import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useLayoutStore } from "@/stores/layout-store";

interface FocusableHandle {
  focus: () => void;
}

interface FocusRegistryValue {
  register: (itemId: string, handle: FocusableHandle) => () => void;
}

const FocusRegistryContext = createContext<FocusRegistryValue | null>(null);

export function FocusRegistryProvider({ children }: { children: ReactNode }) {
  const registryRef = useRef(new Map<string, FocusableHandle>());
  const focusedItemId = useLayoutStore(
    (state) => state.layout.camera.focusedItemId
  );

  // Dispatch DOM focus when focusedItemId changes
  useEffect(() => {
    if (!focusedItemId) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      registryRef.current.get(focusedItemId)?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [focusedItemId]);

  const registerRef = useRef<FocusRegistryValue["register"]>((itemId, handle) => {
    registryRef.current.set(itemId, handle);

    // If this item is already the focused item, focus it immediately.
    // Handles the picker → terminal transition where the item ID stays
    // the same but the component remounts.
    const currentFocused =
      useLayoutStore.getState().layout.camera.focusedItemId;
    if (itemId === currentFocused) {
      requestAnimationFrame(() => handle.focus());
    }

    return () => {
      if (registryRef.current.get(itemId) === handle) {
        registryRef.current.delete(itemId);
      }
    };
  });

  return (
    <FocusRegistryContext.Provider value={{ register: registerRef.current }}>
      {children}
    </FocusRegistryContext.Provider>
  );
}

export function useFocusRegistration(
  itemId: string,
  handle: FocusableHandle
) {
  const context = useContext(FocusRegistryContext);
  if (!context) {
    throw new Error(
      "useFocusRegistration must be used within a FocusRegistryProvider"
    );
  }

  useEffect(() => {
    return context.register(itemId, handle);
  }, [context, itemId, handle]);
}
