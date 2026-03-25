import {
  createWorktree,
  gitCheckout,
  gitCommit,
  gitDiff,
  gitDiffRange,
  gitInit,
  gitPull,
  gitPush,
  gitRunStackedAction,
  gitStatus,
  listBranches,
  removeWorktree,
} from "./handlers";

export const git = {
  checkout: gitCheckout,
  commit: gitCommit,
  createWorktree,
  diff: gitDiff,
  diffRange: gitDiffRange,
  init: gitInit,
  listBranches,
  pull: gitPull,
  push: gitPush,
  removeWorktree,
  runStackedAction: gitRunStackedAction,
  status: gitStatus,
};
