import {
  createWorktree,
  gitCommit,
  gitPush,
  gitStatus,
  listBranches,
  removeWorktree,
} from "./handlers";

export const git = {
  commit: gitCommit,
  createWorktree,
  listBranches,
  push: gitPush,
  removeWorktree,
  status: gitStatus,
};
