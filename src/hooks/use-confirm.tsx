import { useCallback, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ConfirmOptions {
  confirmLabel?: string;
  description: string;
  title: string;
  variant?: "default" | "destructive";
}

export function useConfirm() {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  const handleResponse = useCallback(
    (value: boolean) => {
      state?.resolve(value);
      setState(null);
    },
    [state]
  );

  const confirmDialog = (
    <ConfirmDialog
      confirmLabel={state?.options.confirmLabel}
      description={state?.options.description ?? ""}
      onConfirm={() => handleResponse(true)}
      onOpenChange={(open) => {
        if (!open) {
          handleResponse(false);
        }
      }}
      open={state !== null}
      title={state?.options.title ?? ""}
      variant={state?.options.variant}
    />
  );

  return { confirm, confirmDialog };
}
