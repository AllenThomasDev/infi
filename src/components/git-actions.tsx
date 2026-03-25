import { ChevronDown, CloudUpload, GitCommit, GitPullRequest } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GitStackedAction } from "@/ipc/git/contracts";
import type { GitActionIconName, GitQuickAction, DefaultBranchConfirmableAction } from "@/lib/git-actions-logic";
import {
  buildGitActionProgressStages,
  buildMenuItems,
  requiresDefaultBranchConfirmation,
  resolveDefaultBranchActionDialogCopy,
  resolveQuickAction,
  summarizeGitResult,
} from "@/lib/git-actions-logic";
import { ipc } from "@/ipc/manager";
import {
  gitBranchesQueryOptions,
  gitMutationKeys,
  gitPullMutationOptions,
  gitRunStackedActionMutationOptions,
  gitStatusQueryOptions,
  invalidateGitQueries,
} from "@/lib/git-query";
import { toastManager } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/tailwind";

interface GitActionsProps {
  cwd: string | null;
}

interface PendingDefaultBranchAction {
  action: DefaultBranchConfirmableAction;
  branchName: string;
  includesCommit: boolean;
  commitMessage?: string;
  forcePushOnlyProgress: boolean;
  filePaths?: string[];
}

type ToastId = ReturnType<typeof toastManager.add>;

function GitActionItemIcon({ icon }: { icon: GitActionIconName }) {
  if (icon === "commit") return <GitCommit className="size-3.5" />;
  if (icon === "push") return <CloudUpload className="size-3.5" />;
  return <GitPullRequest className="size-3.5" />;
}

function QuickActionIcon({ quickAction }: { quickAction: GitQuickAction }) {
  if (quickAction.kind === "run_pull") return <CloudUpload className="size-3" />;
  if (quickAction.kind === "open_pr") return <GitPullRequest className="size-3" />;
  if (quickAction.kind === "run_action") {
    if (quickAction.action === "commit") return <GitCommit className="size-3" />;
    if (quickAction.action === "commit_push") return <CloudUpload className="size-3" />;
    return <GitPullRequest className="size-3" />;
  }
  return <GitCommit className="size-3" />;
}

export function GitActions({ cwd }: GitActionsProps) {
  const queryClient = useQueryClient();
  const { data: gitStatus = null } = useQuery(gitStatusQueryOptions(cwd));
  const { data: branchList = null } = useQuery(gitBranchesQueryOptions(cwd));

  const hasOriginRemote = branchList?.hasOriginRemote ?? false;
  const isDefaultBranch = useMemo(() => {
    const branchName = gitStatus?.branch;
    if (!branchName) return false;
    const current = branchList?.branches.find((b) => b.name === branchName);
    return current?.isDefault ?? (branchName === "main" || branchName === "master");
  }, [branchList?.branches, gitStatus?.branch]);

  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [excludedFiles, setExcludedFiles] = useState<ReadonlySet<string>>(new Set());
  const [pendingDefaultBranchAction, setPendingDefaultBranchAction] =
    useState<PendingDefaultBranchAction | null>(null);

  const runStackedActionMutation = useMutation(
    gitRunStackedActionMutationOptions({ cwd, queryClient })
  );
  const pullMutation = useMutation(
    gitPullMutationOptions({ cwd, queryClient })
  );

  const isRunStackedActionRunning =
    useIsMutating({ mutationKey: gitMutationKeys.runStackedAction(cwd) }) > 0;
  const isPullRunning =
    useIsMutating({ mutationKey: gitMutationKeys.pull(cwd) }) > 0;
  const isBusy = isRunStackedActionRunning || isPullRunning;

  const quickAction = useMemo(
    () => resolveQuickAction(gitStatus, isBusy, isDefaultBranch, hasOriginRemote),
    [gitStatus, isBusy, isDefaultBranch, hasOriginRemote]
  );
  const menuItems = useMemo(
    () => buildMenuItems(gitStatus, isBusy, hasOriginRemote),
    [gitStatus, isBusy, hasOriginRemote]
  );

  const allFiles = gitStatus?.workingTree.files ?? [];
  const selectedFiles = allFiles.filter((f) => !excludedFiles.has(f.path));
  const allSelected = excludedFiles.size === 0;
  const noneSelected = selectedFiles.length === 0;

  const pendingDefaultBranchActionCopy = pendingDefaultBranchAction
    ? resolveDefaultBranchActionDialogCopy({
        action: pendingDefaultBranchAction.action,
        branchName: pendingDefaultBranchAction.branchName,
        includesCommit: pendingDefaultBranchAction.includesCommit,
      })
    : null;

  // ---------------------------------------------------------------------------
  // Core action runner — handles default-branch gate, progress toasts, CTAs
  // ---------------------------------------------------------------------------
  const runGitActionWithToast = useCallback(
    async ({
      action,
      commitMessage: msg,
      forcePushOnlyProgress = false,
      skipDefaultBranchPrompt = false,
      featureBranch = false,
      filePaths,
    }: {
      action: GitStackedAction;
      commitMessage?: string;
      forcePushOnlyProgress?: boolean;
      skipDefaultBranchPrompt?: boolean;
      featureBranch?: boolean;
      filePaths?: string[];
    }) => {
      const actionBranch = gitStatus?.branch ?? null;
      const actionIsDefaultBranch = featureBranch ? false : isDefaultBranch;
      const includesCommit =
        !forcePushOnlyProgress && (action === "commit" || !!gitStatus?.hasWorkingTreeChanges);

      // Gate: default branch confirmation
      if (
        !skipDefaultBranchPrompt &&
        requiresDefaultBranchConfirmation(action, actionIsDefaultBranch) &&
        actionBranch &&
        (action === "commit_push" || action === "commit_push_pr")
      ) {
        setPendingDefaultBranchAction({
          action,
          branchName: actionBranch,
          includesCommit,
          ...(msg ? { commitMessage: msg } : {}),
          forcePushOnlyProgress,
          ...(filePaths ? { filePaths } : {}),
        });
        return;
      }

      // Progress toast
      const progressStages = buildGitActionProgressStages({
        action,
        hasCustomCommitMessage: !!msg?.trim(),
        hasWorkingTreeChanges: !!gitStatus?.hasWorkingTreeChanges,
        forcePushOnly: forcePushOnlyProgress,
        featureBranch,
      });
      const progressToastId: ToastId = toastManager.add({
        type: "loading",
        title: progressStages[0] ?? "Running git action...",
        timeout: 0,
      });

      let stageIndex = 0;
      const stageInterval = setInterval(() => {
        stageIndex = Math.min(stageIndex + 1, progressStages.length - 1);
        toastManager.update(progressToastId, {
          title: progressStages[stageIndex] ?? "Running git action...",
          type: "loading",
          timeout: 0,
        });
      }, 1100);
      const stopProgress = () => clearInterval(stageInterval);

      try {
        const result = await runStackedActionMutation.mutateAsync({
          action,
          ...(msg ? { commitMessage: msg } : {}),
          ...(featureBranch ? { featureBranch } : {}),
          ...(filePaths ? { filePaths } : {}),
        });

        stopProgress();
        const resultToast = summarizeGitResult(result);
        const prUrl = result.pr.url ?? (gitStatus?.pr?.state === "open" ? gitStatus.pr.url : undefined);
        const closeToast = () => toastManager.close(progressToastId);

        // Determine CTA
        const shouldOfferPush = action === "commit" && result.commit.status === "created";
        const shouldOfferViewPr =
          (action === "commit_push" || action === "commit_push_pr") &&
          !!prUrl &&
          (!actionIsDefaultBranch || result.pr.status === "created" || result.pr.status === "opened_existing");
        const shouldOfferCreatePr =
          action === "commit_push" &&
          !prUrl &&
          result.push.status === "pushed" &&
          !actionIsDefaultBranch;

        const actionProps = shouldOfferPush
          ? {
              children: "Push",
              onClick: () => {
                closeToast();
                void runGitActionWithToast({
                  action: "commit_push",
                  forcePushOnlyProgress: true,
                });
              },
            }
          : shouldOfferCreatePr
            ? {
                children: "Create PR",
                onClick: () => {
                  closeToast();
                  void runGitActionWithToast({
                    action: "commit_push_pr",
                    forcePushOnlyProgress: true,
                  });
                },
              }
            : shouldOfferViewPr && prUrl
              ? {
                  children: "View PR",
                  onClick: () => {
                    closeToast();
                    void ipc.client.shell.openExternal({ url: prUrl });
                  },
                }
              : undefined;

        toastManager.update(progressToastId, {
          type: "success",
          title: resultToast.title,
          description: resultToast.description,
          timeout: 0,
          data: { dismissAfterVisibleMs: 10_000 },
          ...(actionProps ? { actionProps } : {}),
        });
      } catch (err) {
        stopProgress();
        toastManager.update(progressToastId, {
          type: "error",
          title: "Action failed",
          description: err instanceof Error ? err.message : "An error occurred.",
        });
      }
    },
    [gitStatus, isDefaultBranch, runStackedActionMutation],
  );

  // ---------------------------------------------------------------------------
  // Default branch dialog handlers
  // ---------------------------------------------------------------------------
  const continuePendingAction = useCallback(() => {
    if (!pendingDefaultBranchAction) return;
    const { action, commitMessage: msg, forcePushOnlyProgress, filePaths } =
      pendingDefaultBranchAction;
    setPendingDefaultBranchAction(null);
    void runGitActionWithToast({
      action,
      ...(msg ? { commitMessage: msg } : {}),
      forcePushOnlyProgress,
      ...(filePaths ? { filePaths } : {}),
      skipDefaultBranchPrompt: true,
    });
  }, [pendingDefaultBranchAction, runGitActionWithToast]);

  const checkoutFeatureBranchAndContinue = useCallback(() => {
    if (!pendingDefaultBranchAction) return;
    const { action, commitMessage: msg, forcePushOnlyProgress, filePaths } =
      pendingDefaultBranchAction;
    setPendingDefaultBranchAction(null);
    void runGitActionWithToast({
      action,
      ...(msg ? { commitMessage: msg } : {}),
      forcePushOnlyProgress,
      ...(filePaths ? { filePaths } : {}),
      featureBranch: true,
      skipDefaultBranchPrompt: true,
    });
  }, [pendingDefaultBranchAction, runGitActionWithToast]);

  // ---------------------------------------------------------------------------
  // Quick action + menu handlers
  // ---------------------------------------------------------------------------
  const runQuickAction = useCallback(() => {
    if (quickAction.kind === "run_pull") {
      const promise = pullMutation.mutateAsync();
      toastManager.promise(promise, {
        loading: { title: "Pulling..." },
        success: (result) => ({
          title: result.status === "pulled" ? "Pulled" : "Already up to date",
          description:
            result.status === "pulled"
              ? `Updated ${result.branch} from ${result.upstreamBranch ?? "upstream"}`
              : `${result.branch} is already synchronized.`,
        }),
        error: (err) => ({
          title: "Pull failed",
          description: err instanceof Error ? err.message : "An error occurred.",
        }),
      });
      void promise.catch(() => undefined);
      return;
    }
    if (quickAction.kind === "run_action" && quickAction.action) {
      if (!gitStatus?.hasWorkingTreeChanges) {
        void runGitActionWithToast({ action: quickAction.action });
        return;
      }
      setIsCommitDialogOpen(true);
      return;
    }
  }, [quickAction, pullMutation, gitStatus?.hasWorkingTreeChanges, runGitActionWithToast]);

  const handleMenuAction = useCallback(
    (item: (typeof menuItems)[number]) => {
      if (item.disabled) return;
      if (item.dialogAction === "push") {
        void runGitActionWithToast({ action: "commit_push", forcePushOnlyProgress: true });
        return;
      }
      if (item.dialogAction === "create_pr") {
        void runGitActionWithToast({ action: "commit_push_pr" });
        return;
      }
      setExcludedFiles(new Set());
      setIsCommitDialogOpen(true);
    },
    [runGitActionWithToast],
  );

  // ---------------------------------------------------------------------------
  // Commit dialog handlers
  // ---------------------------------------------------------------------------
  const runDialogAction = useCallback(() => {
    if (!isCommitDialogOpen) return;
    const msg = commitMessage.trim();
    const filePaths = allSelected ? undefined : selectedFiles.map((f) => f.path);
    setIsCommitDialogOpen(false);
    setCommitMessage("");
    setExcludedFiles(new Set());
    void runGitActionWithToast({
      action: "commit",
      ...(msg ? { commitMessage: msg } : {}),
      ...(filePaths ? { filePaths } : {}),
    });
  }, [allSelected, commitMessage, isCommitDialogOpen, runGitActionWithToast, selectedFiles]);

  const runDialogActionOnNewBranch = useCallback(() => {
    if (!isCommitDialogOpen) return;
    const msg = commitMessage.trim();
    const filePaths = allSelected ? undefined : selectedFiles.map((f) => f.path);
    setIsCommitDialogOpen(false);
    setCommitMessage("");
    setExcludedFiles(new Set());
    void runGitActionWithToast({
      action: "commit",
      ...(msg ? { commitMessage: msg } : {}),
      ...(filePaths ? { filePaths } : {}),
      featureBranch: true,
      skipDefaultBranchPrompt: true,
    });
  }, [allSelected, commitMessage, isCommitDialogOpen, runGitActionWithToast, selectedFiles]);

  if (!cwd) return null;

  return (
    <>
      {/* Split button */}
      <div className="flex items-center rounded-md bg-accent text-foreground">
        <Button
          className="rounded-r-none text-xs"
          disabled={quickAction.disabled || isBusy}
          onClick={() => void runQuickAction()}
          size="xs"
          title={quickAction.hint}
          variant="ghost"
        >
          <QuickActionIcon quickAction={quickAction} />
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
                <GitActionItemIcon icon={item.icon} />
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

      {/* Commit dialog */}
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
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Commit changes</DialogTitle>
            <DialogDescription>
              Review changed files and enter a commit message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border border-input bg-muted/40 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Branch:{" "}
                <span className="font-medium text-foreground">
                  {gitStatus?.branch ?? "(detached)"}
                </span>
                {isDefaultBranch && (
                  <Badge variant="destructive" className="ml-2">default branch</Badge>
                )}
              </span>
              <span className="text-muted-foreground">
                {selectedFiles.length}/{allFiles.length} files
              </span>
            </div>

            {allFiles.length > 0 && (
              <ScrollArea className="h-44 rounded-md border border-input bg-background">
                <div className="space-y-1 p-1">
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
              </ScrollArea>
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
                  runDialogAction();
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
              onClick={runDialogActionOnNewBranch}
              size="sm"
              variant="outline"
            >
              Commit on new branch
            </Button>
            <Button
              disabled={!commitMessage.trim() || noneSelected}
              onClick={runDialogAction}
              size="sm"
            >
              Commit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Default branch confirmation */}
      <AlertDialog
        open={pendingDefaultBranchAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDefaultBranchAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDefaultBranchActionCopy?.title ?? "Run action on default branch?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDefaultBranchActionCopy?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Abort</AlertDialogCancel>
            <AlertDialogAction
              variant="outline"
              size="sm"
              onClick={continuePendingAction}
            >
              {pendingDefaultBranchActionCopy?.continueLabel ?? "Continue"}
            </AlertDialogAction>
            <AlertDialogAction
              size="sm"
              onClick={checkoutFeatureBranchAndContinue}
            >
              Checkout feature branch & continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
