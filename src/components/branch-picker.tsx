import { GitBranch, Plus } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandState,
} from "@/components/ui/command";
import { toastManager } from "@/components/ui/toast";
import { ipc } from "@/ipc/manager";

interface BranchListItem {
  current: boolean;
  isDefault: boolean;
  name: string;
  worktreePath: string | null;
}

export interface BranchPickerSelection {
  branch: string;
  currentBranch: string | null;
  worktreePath: string | null;
}

interface BranchPickerProps {
  canvasByBranch?: ReadonlyMap<string, string>;
  directory?: string;
  onOpenChange: (open: boolean) => void;
  onSelectBranch: (selection: BranchPickerSelection) => Promise<void>;
  open: boolean;
  projectName?: string;
}

export function BranchPicker({
  canvasByBranch,
  directory,
  onOpenChange,
  onSelectBranch,
  open,
  projectName,
}: BranchPickerProps) {
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!(open && directory)) {
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    ipc.client.git
      .listBranches({ cwd: directory })
      .then((result) => {
        if (cancelled) {
          return;
        }

        setBranches([...result.branches]);
        setCurrentBranch(result.branches.find((b) => b.current)?.name ?? null);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        const message = err instanceof Error ? err.message : String(err);
        setBranches([]);
        setCurrentBranch(null);
        setError(message);
        toastManager.add({
          type: "error",
          title: "Failed to load branches",
          description: message,
        });
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [directory, open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const normalizedQuery = query.trim();
  const hasExactMatch = branches.some(
    (branch) => branch.name === normalizedQuery
  );
  const isInUse = canvasByBranch?.has(normalizedQuery) ?? false;
  const showCreateOption =
    normalizedQuery.length > 0 && !hasExactMatch && !isInUse && !loading;

  const title = projectName
    ? `Create Canvas in ${projectName}`
    : "Create Canvas from Branch";

  function handleSelect(branchName: string) {
    if (!branchName || submitting) {
      return;
    }

    const selectedBranch = branches.find(
      (branch) => branch.name === branchName
    );

    setSubmitting(true);
    setError(null);

    onSelectBranch({
      branch: branchName,
      currentBranch,
      worktreePath: selectedBranch?.worktreePath ?? null,
    })
      .then(() => onOpenChange(false))
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        toastManager.add({
          type: "error",
          title: "Failed to open branch",
          description: message,
        });
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return (
    <CommandDialog
      description="Select an existing branch or type a new one."
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    >
      <Command shouldFilter={!(loading || error)}>
        <CommandInput
          onValueChange={setQuery}
          placeholder="Search or create a branch..."
          value={query}
        />
        <CommandList>
          {loading ? <CommandState>Loading branches...</CommandState> : null}
          {!loading && error ? (
            <CommandState className="py-4 text-destructive">
              {error}
            </CommandState>
          ) : null}
          {loading ? null : (
            <>
              {error ? null : (
                <CommandEmpty>No matching branches.</CommandEmpty>
              )}
              {showCreateOption ? (
                <CommandGroup heading="Create Branch">
                  <CommandItem
                    disabled={submitting}
                    onSelect={() => handleSelect(normalizedQuery)}
                    value={`create ${normalizedQuery}`}
                  >
                    <Plus />
                    <span>Create branch `{normalizedQuery}`</span>
                  </CommandItem>
                </CommandGroup>
              ) : null}
              {branches.length > 0 ? (
                <CommandGroup heading="Branches">
                  {branches.map((branch) => {
                    const hasCanvas = canvasByBranch?.has(branch.name) ?? false;
                    let status: ReactNode = null;

                    if (hasCanvas) {
                      status = (
                        <span className="ml-auto text-[0.625rem] text-muted-foreground uppercase tracking-[0.2em]">
                          open
                        </span>
                      );
                    } else if (branch.current) {
                      status = (
                        <span className="ml-auto text-[0.625rem] text-muted-foreground uppercase tracking-[0.2em]">
                          current
                        </span>
                      );
                    } else if (branch.worktreePath) {
                      status = (
                        <span className="text-[0.625rem] text-muted-foreground uppercase tracking-[0.2em]">
                          reuse
                        </span>
                      );
                    }

                    return (
                      <CommandItem
                        className={hasCanvas ? "opacity-50" : undefined}
                        disabled={submitting}
                        key={branch.name}
                        onSelect={() => handleSelect(branch.name)}
                        value={branch.name}
                      >
                        <GitBranch />
                        <span>{branch.name}</span>
                        {status}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : null}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
