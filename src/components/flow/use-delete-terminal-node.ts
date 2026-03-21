import { createContext, useContext } from "react";

type DeleteTerminalNodeFn = (nodeId: string) => void;

export const DeleteTerminalNodeContext = createContext<DeleteTerminalNodeFn>(
  () => {
    throw new Error("DeleteTerminalNodeContext: no provider found");
  }
);

export function useDeleteTerminalNode(): DeleteTerminalNodeFn {
  return useContext(DeleteTerminalNodeContext);
}
