"use no memo";

import { parsePatchFiles } from "@pierre/diffs";
import {
  FileDiff,
  type FileDiffMetadata,
  Virtualizer,
  WorkerPoolContextProvider,
} from "@pierre/diffs/react";
import DiffsWorker from "@pierre/diffs/worker/worker.js?worker";
import { useQuery } from "@tanstack/react-query";
import { Columns2Icon, Loader2, Rows3Icon } from "lucide-react";
import { useMemo, useRef, type ReactNode } from "react";
import { gitDiffQueryOptions } from "@/lib/git-query";
import { useLayoutStore } from "@/stores/layout-store";

type DiffRenderMode = "stacked" | "split";

const DIFF_THEME = "pierre-dark";

const DIFF_PANEL_CSS = `
[data-diffs-header],
[data-diff],
[data-file],
[data-error-wrapper],
[data-virtualizer-buffer] {
  --diffs-bg: color-mix(in srgb, var(--card) 90%, var(--background)) !important;
  --diffs-light-bg: color-mix(in srgb, var(--card) 90%, var(--background)) !important;
  --diffs-dark-bg: color-mix(in srgb, var(--card) 90%, var(--background)) !important;
  --diffs-token-light-bg: transparent;
  --diffs-token-dark-bg: transparent;

  --diffs-bg-context-override: color-mix(in srgb, var(--background) 97%, var(--foreground));
  --diffs-bg-hover-override: color-mix(in srgb, var(--background) 94%, var(--foreground));
  --diffs-bg-separator-override: color-mix(in srgb, var(--background) 95%, var(--foreground));
  --diffs-bg-buffer-override: color-mix(in srgb, var(--background) 90%, var(--foreground));

  --diffs-bg-addition-override: color-mix(in srgb, var(--background) 92%, var(--success));
  --diffs-bg-addition-number-override: color-mix(in srgb, var(--background) 88%, var(--success));
  --diffs-bg-addition-hover-override: color-mix(in srgb, var(--background) 85%, var(--success));
  --diffs-bg-addition-emphasis-override: color-mix(in srgb, var(--background) 80%, var(--success));

  --diffs-bg-deletion-override: color-mix(in srgb, var(--background) 92%, var(--destructive));
  --diffs-bg-deletion-number-override: color-mix(in srgb, var(--background) 88%, var(--destructive));
  --diffs-bg-deletion-hover-override: color-mix(in srgb, var(--background) 85%, var(--destructive));
  --diffs-bg-deletion-emphasis-override: color-mix(
    in srgb,
    var(--background) 80%,
    var(--destructive)
  );

  background-color: var(--diffs-bg) !important;
}

[data-file-info] {
  background-color: color-mix(in srgb, var(--card) 94%, var(--foreground)) !important;
  border-block-color: var(--border) !important;
  color: var(--foreground) !important;
}

[data-diffs-header] {
  position: sticky !important;
  top: 0;
  z-index: 4;
  background-color: color-mix(in srgb, var(--card) 94%, var(--foreground)) !important;
  border-bottom: 1px solid var(--border) !important;
}

[data-title] {
  cursor: pointer;
  transition:
    color 120ms ease,
    text-decoration-color 120ms ease;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 2px;
}

[data-title]:hover {
  color: color-mix(in srgb, var(--foreground) 84%, var(--primary)) !important;
  text-decoration-color: currentColor;
}
`;

function resolveFilePath(fileDiff: FileDiffMetadata): string {
  const raw = fileDiff.name ?? fileDiff.prevName ?? "";
  if (raw.startsWith("a/") || raw.startsWith("b/")) {
    return raw.slice(2);
  }
  return raw;
}

function buildFileKey(fileDiff: FileDiffMetadata): string {
  return fileDiff.cacheKey ?? `${fileDiff.prevName ?? "none"}:${fileDiff.name}`;
}

interface DiffViewerProps {
  cwd: string;
  onClose: () => void;
}

function DiffContent({ cwd, onClose }: DiffViewerProps) {
  const { data, isLoading, error } = useQuery(gitDiffQueryOptions(cwd));
  const patch = data?.diff ?? "";
  const renderMode = useLayoutStore((s) => s.layout.diffRenderMode);
  const setRenderMode = useLayoutStore((s) => s.setDiffRenderMode);
  const viewportRef = useRef<HTMLDivElement>(null);

  const renderableFiles = useMemo(() => {
    const normalized = patch.trim();
    if (normalized.length === 0) return [];

    try {
      const parsed = parsePatchFiles(normalized);
      return parsed
        .flatMap((p) => p.files)
        .toSorted((a, b) =>
          resolveFilePath(a).localeCompare(resolveFilePath(b), undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );
    } catch {
      return [];
    }
  }, [patch]);

  return (
    <div
      className="flex h-full w-full flex-col bg-background"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      role="region"
      tabIndex={-1}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs text-muted-foreground">
          {renderableFiles.length} file{renderableFiles.length !== 1 ? "s" : ""} changed
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`inline-flex size-6 items-center justify-center rounded-md text-xs transition-colors ${
              renderMode === "stacked"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setRenderMode("stacked")}
            aria-label="Stacked diff view"
          >
            <Rows3Icon className="size-3.5" />
          </button>
          <button
            type="button"
            className={`inline-flex size-6 items-center justify-center rounded-md text-xs transition-colors ${
              renderMode === "split"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setRenderMode("split")}
            aria-label="Split diff view"
          >
            <Columns2Icon className="size-3.5" />
          </button>
        </div>
      </div>

      <div ref={viewportRef} className="min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground/70">
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            Loading diff...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-xs text-destructive/70">
            {error instanceof Error ? error.message : "Failed to load diff."}
          </div>
        ) : renderableFiles.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground/70">
            No changes to display.
          </div>
        ) : (
          <Virtualizer
            className="h-full min-h-0 overflow-auto px-2 pb-2"
            config={{
              overscrollSize: 600,
              intersectionObserverMargin: 1200,
            }}
          >
            {renderableFiles.map((fileDiff) => (
              <div
                key={buildFileKey(fileDiff)}
                className="mb-2 rounded-md first:mt-2 last:mb-0"
              >
                <FileDiff
                  fileDiff={fileDiff}
                  options={{
                    diffStyle: renderMode === "split" ? "split" : "unified",
                    lineDiffType: "none",
                    theme: DIFF_THEME,
                    themeType: "dark",
                    unsafeCSS: DIFF_PANEL_CSS,
                  }}
                />
              </div>
            ))}
          </Virtualizer>
        )}
      </div>
    </div>
  );
}

export function DiffWorkerPoolProvider({ children }: { children?: ReactNode }) {
  const workerPoolSize = useMemo(() => {
    const cores = Math.max(1, navigator.hardwareConcurrency || 4);
    return Math.max(2, Math.min(6, Math.floor(cores / 2)));
  }, []);

  return (
    <WorkerPoolContextProvider
      poolOptions={{
        workerFactory: () => new DiffsWorker(),
        poolSize: workerPoolSize,
        totalASTLRUCacheSize: 240,
      }}
      highlighterOptions={{
        theme: DIFF_THEME,
        tokenizeMaxLineLength: 1_000,
      }}
    >
      {children}
    </WorkerPoolContextProvider>
  );
}

export { DiffContent as DiffViewer };
