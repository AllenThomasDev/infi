import { GitBranch, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ipc } from "@/ipc/manager";

interface BranchListItem {
  current: boolean;
  name: string;
  worktreePath: string | null;
}

interface BranchPickerSelection {
  branch: string;
  currentBranch: string | null;
  worktreePath: string | null;
}

interface BranchPickerProps {
  directory?: string;
  onOpenChange: (open: boolean) => void;
  onSelectBranch: (selection: BranchPickerSelection) => Promise<void>;
  open: boolean;
  projectName?: string;
}

export function BranchPicker({
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

        setBranches(result.branches);
        setCurrentBranch(result.currentBranch);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        setBranches([]);
        setCurrentBranch(null);
        setError(err instanceof Error ? err.message : String(err));
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
  const showCreateOption =
    normalizedQuery.length > 0 && !hasExactMatch && !loading;

  const title = useMemo(() => {
    if (!projectName) {
      return "Create Canvas from Branch";
    }
    return `Create Canvas in ${projectName}`;
  }, [projectName]);

  async function handleSelect(branchName: string) {
    if (!branchName || submitting) {
      return;
    }

    const selectedBranch = branches.find(
      (branch) => branch.name === branchName
    );

    setSubmitting(true);
    setError(null);

    try {
      await onSelectBranch({
        branch: branchName,
        currentBranch,
        worktreePath: selectedBranch?.worktreePath ?? null,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
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
          {loading ? (
            <div className="px-3 py-6 text-muted-foreground text-xs">
              Loading branches...
            </div>
          ) : null}
          {!loading && error ? (
            <div className="px-3 py-4 text-destructive text-xs">{error}</div>
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
                  {branches.map((branch) => (
                    <CommandItem
                      disabled={submitting}
                      key={branch.name}
                      onSelect={() => handleSelect(branch.name)}
                      value={branch.name}
                    >
                      <GitBranch />
                      <span>{branch.name}</span>
                      {branch.worktreePath && !branch.current ? (
                        <span className="text-[0.625rem] text-muted-foreground uppercase tracking-[0.2em]">
                          reuse
                        </span>
                      ) : null}
                      {branch.current ? (
                        <span className="ml-auto text-[0.625rem] text-muted-foreground uppercase tracking-[0.2em]">
                          current
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
