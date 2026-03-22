import { useMemo } from "react";
import type { NodeType } from "@/components/flow/node-registry";
import { useTileActions } from "@/components/flow/use-tile-actions";

export function useNodeActions(nodeId: string) {
  const { remove, replace } = useTileActions();

  return useMemo(
    () => ({
      removeSelf: () => remove(nodeId),
      replaceSelf: (type: NodeType) => replace(nodeId, type),
    }),
    [nodeId, remove, replace]
  );
}
