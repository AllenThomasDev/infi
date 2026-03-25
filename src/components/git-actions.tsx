import { ChevronDown, CloudUpload, GitCommit } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  gitCommitMutationOptions,
  gitPushMutationOptions,
  gitStatusQueryOptions,
  invalidateGitQueries,
} from "@/lib/git-query";
import { buildMenuItems, resolveQuickAction } from "@/lib/git-actions-logic";
import type { GitStatusFile } from "@/ipc/git/handlers";
import { cn } from "@/utils/tailwind";

interface GitActionsProps {
  cwd: string | null;
}

export function GitActions({ cwd }: GitActionsProps) {
  const queryClient = useQueryClient();
  const { data: gitStatus = null } = useQuery(gitStatusQueryOptions(cwd));

  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [excludedFiles, setExcludedFiles] = useState<ReadonlySet<string>>(
    new Set()
  );

  const commitMutation = useMutation(
    gitCommitMutationOptions({ cwd, queryClient })
  );
  const pushMutation = useMutation(
    gitPushMutationOptions({ cwd, queryClient })
  );

  const isBusy = commitMutation.isPending || pushMutation.isPending;
  const quickAction = useMemo(
    () => resolveQuickAction(gitStatus, isBusy),
    [gitStatus, isBusy]
  );
  const menuItems = useMemo(
    () => buildMenuItems(gitStatus, isBusy),
    [gitStatus, isBusy]
  );

  const allFiles: GitStatusFile[] = gitStatus?.files ?? [];
  const selectedFiles = allFiles.filter((f) => !excludedFiles.has(f.path));
  const allSelected = excludedFiles.size === 0;
  const noneSelected = selectedFiles.length === 0;

  const runCommit = useCallback(
    async (message: string, filePaths?: string[]) => {
      const msg = message.trim();
      if (!msg) return;
      await commitMutation.mutateAsync({ message: msg, filePaths });
    },
    [commitMutation]
  );

  const runPush = useCallback(async () => {
    await pushMutation.mutateAsync();
  }, [pushMutation]);

  const runQuickAction = useCallback(async () => {
    if (quickAction.disabled || !quickAction.action) return;

    if (quickAction.action === "commit") {
      setIsCommitDialogOpen(true);
      return;
    }
    if (quickAction.action === "push") {
      await runPush();
      return;
    }
    if (quickAction.action === "commit_push") {
      setIsCommitDialogOpen(true);
    }
  }, [quickAction, runPush]);

  const handleDialogSubmit = useCallback(async () => {
    const msg = commitMessage.trim();
    if (!msg) return;

    const filePaths = allSelected
      ? undefined
      : selectedFiles.map((f) => f.path);

    setIsCommitDialogOpen(false);
    setCommitMessage("");
    setExcludedFiles(new Set());

    await runCommit(msg, filePaths);

    if (
      quickAction.action === "commit_push" &&
      gitStatus?.hasUpstream
    ) {
      await runPush();
    }
  }, [
    allSelected,
    commitMessage,
    gitStatus?.hasUpstream,
    quickAction.action,
    runCommit,
    runPush,
    selectedFiles,
  ]);

  const handleMenuAction = useCallback(
    (id: "commit" | "push") => {
      if (id === "commit") {
        setIsCommitDialogOpen(true);
      } else {
        void runPush();
      }
    },
    [runPush]
  );

  if (!cwd) return null;

  return (
    <>
      <div className="flex items-center">
        <Button
          className="rounded-r-none text-xs"
          disabled={quickAction.disabled || isBusy}
          onClick={() => void runQuickAction()}
          size="xs"
          title={quickAction.hint}
          variant="ghost"
        >
          {quickAction.action === "push" ? (
            <CloudUpload className="size-3" />
          ) : (
            <GitCommit className="size-3" />
          )}
          {quickAction.label}
        </Button>
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) void invalidateGitQueries(queryClient);
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              className="rounded-l-none border-l border-l-border px-1"
              disabled={isBusy}
              size="xs"
              variant="ghost"
            >
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {menuItems.map((item) => (
              <DropdownMenuItem
                key={item.id}
                disabled={item.disabled}
                onClick={() => handleMenuAction(item.id)}
              >
                {item.id === "commit" ? (
                  <GitCommit className="size-3.5" />
                ) : (
                  <CloudUpload className="size-3.5" />
                )}
                {item.label}
              </DropdownMenuItem>
            ))}
            {gitStatus && !gitStatus.branch && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                Detached HEAD: checkout a branch first.
              </p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog
        open={isCommitDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCommitDialogOpen(false);
            setCommitMessage("");
            setExcludedFiles(new Set());
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Commit changes</DialogTitle>
            <DialogDescription>
              Review changed files and enter a commit message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border border-input bg-muted/40 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Branch: <span className="font-medium text-foreground">{gitStatus?.branch ?? "(detached)"}</span>
              </span>
              <span className="text-muted-foreground">
                {selectedFiles.length}/{allFiles.length} files
              </span>
            </div>

            {allFiles.length > 0 && (
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-input bg-background p-1">
                {allFiles.map((file) => {
                  const isExcluded = excludedFiles.has(file.path);
                  return (
                    <label
                      key={file.path}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 font-mono text-xs hover:bg-accent/50",
                        isExcluded && "opacity-50"
                      )}
                    >
                      <Checkbox
                        checked={!isExcluded}
                        onCheckedChange={() => {
                          setExcludedFiles((prev) => {
                            const next = new Set(prev);
                            if (next.has(file.path)) {
                              next.delete(file.path);
                            } else {
                              next.add(file.path);
                            }
                            return next;
                          });
                        }}
                      />
                      <span className="flex-1 truncate">{file.path}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {file.status}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message"
              className="min-h-12"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) {
                  void handleDialogSubmit();
                }
              }}
            />
          </div>

          <DialogFooter showCloseButton={false}>
            <Button
              onClick={() => {
                setIsCommitDialogOpen(false);
                setCommitMessage("");
                setExcludedFiles(new Set());
              }}
              size="sm"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!commitMessage.trim() || noneSelected}
              onClick={() => void handleDialogSubmit()}
              size="sm"
            >
              {quickAction.action === "commit_push"
                ? "Commit & push"
                : "Commit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
