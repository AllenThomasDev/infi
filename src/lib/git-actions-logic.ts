import type { GitStatusResult } from "@/ipc/git/handlers";

export type GitAction = "commit" | "push" | "commit_push";

export interface GitQuickAction {
  label: string;
  disabled: boolean;
  action: GitAction | null;
  hint?: string;
}

export interface GitActionMenuItem {
  id: "commit" | "push";
  label: string;
  disabled: boolean;
}

export function resolveQuickAction(
  gitStatus: GitStatusResult | null,
  isBusy: boolean,
): GitQuickAction {
  if (isBusy) {
    return { label: "Commit", disabled: true, action: null, hint: "Git action in progress." };
  }

  if (!gitStatus) {
    return { label: "Commit", disabled: true, action: null, hint: "Git status is unavailable." };
  }

  const hasBranch = gitStatus.branch !== null;
  const hasChanges = gitStatus.hasChanges;
  const isAhead = gitStatus.aheadCount > 0;
  const isBehind = gitStatus.behindCount > 0;

  if (!hasBranch) {
    return {
      label: "Commit",
      disabled: true,
      action: null,
      hint: "Detached HEAD: checkout a branch first.",
    };
  }

  if (hasChanges) {
    if (!gitStatus.hasUpstream) {
      return { label: "Commit", disabled: false, action: "commit" };
    }
    return { label: "Commit & push", disabled: false, action: "commit_push" };
  }

  if (isBehind) {
    return {
      label: "Pull needed",
      disabled: true,
      action: null,
      hint: "Branch is behind upstream. Pull/rebase first.",
    };
  }

  if (isAhead) {
    return { label: "Push", disabled: false, action: "push" };
  }

  return {
    label: "Up to date",
    disabled: true,
    action: null,
    hint: "Branch is up to date. No action needed.",
  };
}

export function buildMenuItems(
  gitStatus: GitStatusResult | null,
  isBusy: boolean,
): GitActionMenuItem[] {
  if (!gitStatus) return [];

  const hasBranch = gitStatus.branch !== null;
  const hasChanges = gitStatus.hasChanges;
  const isBehind = gitStatus.behindCount > 0;
  const canCommit = !isBusy && hasChanges;
  const canPush =
    !isBusy &&
    hasBranch &&
    !hasChanges &&
    !isBehind &&
    gitStatus.aheadCount > 0;

  return [
    { id: "commit", label: "Commit...", disabled: !canCommit },
    { id: "push", label: "Push", disabled: !canPush },
  ];
}
