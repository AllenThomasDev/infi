import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  checkboxDescription?: string;
  checkboxLabel?: string;
  confirmLabel?: string;
  description: string;
  onConfirm: (details: { checked: boolean }) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
  variant?: "default" | "destructive";
}

export function ConfirmDialog({
  checkboxDescription,
  checkboxLabel,
  confirmLabel = "Confirm",
  description,
  onConfirm,
  onOpenChange,
  open,
  title,
  variant = "default",
}: ConfirmDialogProps) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (open) {
      setChecked(false);
    }
  }, [open]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {checkboxLabel ? (
          <label className="flex items-start gap-3 text-xs">
            <Checkbox
              checked={checked}
              className="mt-0.5"
              onCheckedChange={(nextChecked: boolean) => {
                setChecked(nextChecked === true);
              }}
            />
            <span className="space-y-1">
              <span className="block font-medium text-foreground">
                {checkboxLabel}
              </span>
              {checkboxDescription ? (
                <span className="block text-muted-foreground">
                  {checkboxDescription}
                </span>
              ) : null}
            </span>
          </label>
        ) : null}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm({ checked });
            }}
            variant={variant === "destructive" ? "destructive" : "default"}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
