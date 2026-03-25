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
  gitRunStackedActionMutationOptions,
  gitPullMutationOptions,
  gitStatusQueryOptions,
  gitMutationKeys,
  invalidateGitQueries,
} from "@/lib/git-query";
import { buildMenuItems, resolveQuickAction } from "@/lib/git-actions-logic";
import type { GitStatusResult } from "@/ipc/git/contracts";
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

  const runStackedActionMutation = useMutation(
    gitRunStackedActionMutationOptions({ cwd, queryClient })
  );
  const pullMutation = useMutation(
    gitPullMutationOptions({ cwd, queryClient })
  );

  const isBusy = runStackedActionMutation.isPending || pullMutation.isPending;
  const quickAction = useMemo(
    () => resolveQuickAction(gitStatus, isBusy),
    [gitStatus, isBusy]
  );
  const menuItems = useMemo(
    () => buildMenuItems(gitStatus, isBusy),
    [gitStatus, isBusy]
  );

  const allFiles = gitStatus?.workingTree.files ?? [];
  const selectedFiles = allFiles.filter((f) => !excludedFiles.has(f.path));
  const allSelected = excludedFiles.size === 0;
  const noneSelected = selectedFiles.length === 0;

  const runQuickAction = useCallback(() => {
    if (quickAction.kind === "run_pull") {
      void pullMutation.mutateAsync();
      return;
    }
    if (quickAction.kind === "run_action" && quickAction.action) {
      if (!gitStatus?.hasWorkingTreeChanges) {
        // Push-only: no changes to commit, run directly
        void runStackedActionMutation.mutateAsync({
          action: quickAction.action,
        });
        return;
      }
      setIsCommitDialogOpen(true);
      return;
    }
  }, [quickAction, pullMutation, gitStatus?.hasWorkingTreeChanges, runStackedActionMutation]);

  const handleDialogSubmit = useCallback(async () => {
    const msg = commitMessage.trim();
    const filePaths = allSelected
      ? undefined
      : selectedFiles.map((f) => f.path);

    setIsCommitDialogOpen(false);
    setCommitMessage("");
    setExcludedFiles(new Set());

    const action =
      quickAction.kind === "run_action" && quickAction.action
        ? quickAction.action
        : "commit";

    await runStackedActionMutation.mutateAsync({
      action,
      ...(msg ? { commitMessage: msg } : {}),
      ...(filePaths ? { filePaths } : {}),
    });
  }, [
    allSelected,
    commitMessage,
    quickAction,
    runStackedActionMutation,
    selectedFiles,
  ]);

  const handleMenuAction = useCallback(
    (item: (typeof menuItems)[number]) => {
      if (item.disabled) return;
      if (item.dialogAction === "push") {
        void runStackedActionMutation.mutateAsync({
          action: "commit_push",
        });
        return;
      }
      if (item.dialogAction === "create_pr") {
        void runStackedActionMutation.mutateAsync({
          action: "commit_push_pr",
        });
        return;
      }
      setIsCommitDialogOpen(true);
    },
    [runStackedActionMutation]
  );

  if (!cwd) return null;

  return (
    <>
      <div className="flex items-center rounded-md bg-accent text-foreground">
        <Button
          className="rounded-r-none text-xs"
          disabled={quickAction.disabled || isBusy}
          onClick={() => void runQuickAction()}
          size="xs"
          title={quickAction.hint}
          variant="ghost"
        >
          {quickAction.kind === "run_action" &&
          quickAction.action === "commit_push" ? (
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
              className="rounded-l-none border-l border-l-border/50 px-1"
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
                onClick={() => handleMenuAction(item)}
              >
                {item.icon === "commit" ? (
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
                      <span className="shrink-0">
                        <span className="text-green-500">+{file.insertions}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-red-500">-{file.deletions}</span>
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
                : quickAction.action === "commit_push_pr"
                  ? "Commit, push & PR"
                  : "Commit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
