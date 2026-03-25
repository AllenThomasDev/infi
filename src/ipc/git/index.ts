import {
  createWorktree,
  gitCheckout,
  gitCommit,
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
  init: gitInit,
  listBranches,
  pull: gitPull,
  push: gitPush,
  removeWorktree,
  runStackedAction: gitRunStackedAction,
  status: gitStatus,
};
