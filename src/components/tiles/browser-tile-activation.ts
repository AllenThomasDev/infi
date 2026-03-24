const activators = new Map<string, () => void>();

export function registerBrowserTileActivator(
  itemId: string,
  activate: () => void
) {
  activators.set(itemId, activate);
  return () => {
    if (activators.get(itemId) === activate) {
      activators.delete(itemId);
    }
  };
}

export function activateBrowserTile(itemId: string) {
  activators.get(itemId)?.();
}
