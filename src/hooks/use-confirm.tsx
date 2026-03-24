import { useCallback, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ConfirmOptions {
  confirmLabel?: string;
  description: string;
  title: string;
  variant?: "default" | "destructive";
}

interface CheckboxConfirmOptions extends ConfirmOptions {
  checkboxDescription?: string;
  checkboxLabel: string;
}

type ConfirmState =
  | {
      kind: "confirm";
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "checkbox-confirm";
      options: CheckboxConfirmOptions;
      resolve: (value: { checked: boolean; confirmed: boolean }) => void;
    };

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ kind: "confirm", options, resolve });
    });
  }, []);

  const confirmWithCheckbox = useCallback(
    (
      options: CheckboxConfirmOptions
    ): Promise<{ checked: boolean; confirmed: boolean }> => {
      return new Promise<{ checked: boolean; confirmed: boolean }>(
        (resolve) => {
          setState({ kind: "checkbox-confirm", options, resolve });
        }
      );
    },
    []
  );

  const handleResponse = useCallback(
    (value: boolean, checked = false) => {
      if (!state) {
        return;
      }

      if (state.kind === "confirm") {
        state.resolve(value);
      } else {
        state.resolve({ checked, confirmed: value });
      }

      setState(null);
    },
    [state]
  );

  const confirmDialog = (
    <ConfirmDialog
      checkboxDescription={
        state?.kind === "checkbox-confirm"
          ? state.options.checkboxDescription
          : undefined
      }
      checkboxLabel={
        state?.kind === "checkbox-confirm"
          ? state.options.checkboxLabel
          : undefined
      }
      confirmLabel={state?.options.confirmLabel}
      description={state?.options.description ?? ""}
      onConfirm={({ checked }) => handleResponse(true, checked)}
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

  return { confirm, confirmDialog, confirmWithCheckbox };
}
