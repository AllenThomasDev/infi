import { z } from "zod";
import { LOCAL_STORAGE_KEYS } from "@/constants";
import type {
  NiriCanvasLayout,
  NiriItemRef,
  NiriLayoutItem,
} from "@/layout/layout-types";
import { createInitialLayout, useLayoutStore } from "@/stores/layout-store";
import type { Canvas, Project } from "@/workspace/types";
import { useWorkspaceStore } from "@/workspace/workspace-store";

const WORKSPACE_PERSISTED_STATE_VERSION = 1;
const PERSIST_DELAY_MS = 500;

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Register migrations here as { fromVersion: migrateFn }.
 * Each fn receives the raw object at version N and returns it at version N+1.
 */
const migrations: Record<number, MigrationFn> = {
  // Example for future use:
  // 1: (data) => ({ ...data, version: 2, someNewField: defaultValue }),
};

const canvasSchema = z.object({
  branch: z.string().nullable(),
  createdAt: z.number().finite(),
  id: z.string().min(1),
  lastActiveAt: z.number().finite(),
  name: z.string().min(1),
  worktreePath: z.string().min(1),
});

const projectSchema = z.object({
  canvases: z.array(canvasSchema),
  createdAt: z.number().finite(),
  directory: z.string().min(1),
  id: z.string().min(1),
  name: z.string().min(1),
});

const itemRefSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("terminal") }),
  z.object({ type: z.literal("picker") }),
]);

const layoutItemSchema = z.object({
  id: z.string().min(1),
  preferredWidth: z.number().finite().optional(),
  ref: itemRefSchema,
});

const layoutRowSchema = z.object({
  id: z.string().min(1),
  items: z.array(layoutItemSchema),
});

const layoutSchema = z.object({
  diffRenderMode: z.enum(["stacked", "split"]).optional().default("stacked"),
  focusTick: z.number().int().nonnegative(),
  isDiffViewOpen: z.boolean().optional().default(false),
  isFullscreenMode: z.boolean().optional().default(false),
  isNotesOpen: z.boolean().optional().default(false),
  isOverviewOpen: z.boolean(),
  lastColumnByRowId: z.record(z.string(), z.number().int().nonnegative()),
  rows: z.array(layoutRowSchema),
  selectedItemId: z.string().min(1).optional(),
});

const versionedEnvelopeSchema = z.object({
  version: z.number().int().positive(),
});

const persistedWorkspaceStateSchema = z.object({
  version: z.literal(WORKSPACE_PERSISTED_STATE_VERSION),
  workspace: z.object({
    activeCanvasId: z.string().nullable(),
    activeProjectId: z.string().nullable(),
    projects: z.array(projectSchema),
  }),
  layout: z.object({
    layoutsByCanvas: z.record(z.string(), layoutSchema),
  }),
});

type PersistedWorkspaceState = z.infer<typeof persistedWorkspaceStateSchema>;

function migrateToCurrentVersion(
  raw: Record<string, unknown>
): Record<string, unknown> | null {
  const envelope = versionedEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    return null;
  }

  let version = envelope.data.version;
  let data = raw;

  while (version < WORKSPACE_PERSISTED_STATE_VERSION) {
    const migrate = migrations[version];
    if (!migrate) {
      return null;
    }

    data = migrate(data);
    version += 1;
  }

  if (version !== WORKSPACE_PERSISTED_STATE_VERSION) {
    return null;
  }

  return data;
}

interface HydratedWorkspaceState {
  activeCanvasId: string | null;
  activeProjectId: string | null;
  layout: NiriCanvasLayout;
  layoutsByCanvas: Record<string, NiriCanvasLayout>;
  projects: Project[];
}

let initialized = false;
let isHydrating = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeWorkspaceStore: (() => void) | null = null;
let unsubscribeLayoutStore: (() => void) | null = null;
let boundBeforeUnload: (() => void) | null = null;

function getStorage(): Storage | null {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null;
  }

  return globalThis.localStorage;
}

function cloneLayoutItem(item: NiriLayoutItem): NiriLayoutItem {
  return {
    id: item.id,
    ...(item.preferredWidth !== undefined
      ? { preferredWidth: item.preferredWidth }
      : {}),
    ref: cloneItemRef(item.ref),
  };
}

function cloneItemRef(ref: NiriItemRef): NiriItemRef {
  if (ref.type === "terminal") {
    return { type: "terminal" };
  }

  return { type: "picker" };
}

function cloneLayout(layout: NiriCanvasLayout): NiriCanvasLayout {
  return {
    focusTick: layout.focusTick,
    diffRenderMode: layout.diffRenderMode ?? "stacked",
    isDiffViewOpen: layout.isDiffViewOpen ?? false,
    isFullscreenMode: layout.isFullscreenMode ?? false,
    isNotesOpen: layout.isNotesOpen,
    isOverviewOpen: layout.isOverviewOpen,
    lastColumnByRowId: { ...layout.lastColumnByRowId },
    rows: layout.rows.map((row) => ({
      id: row.id,
      items: row.items.map(cloneLayoutItem),
    })),
    ...(layout.selectedItemId ? { selectedItemId: layout.selectedItemId } : {}),
  };
}

function sanitizeLayout(layout: NiriCanvasLayout): NiriCanvasLayout {
  const rows = layout.rows
    .map((row) => ({
      id: row.id,
      items: row.items
        .filter((item) => item.ref.type !== "picker")
        .map(cloneLayoutItem),
    }))
    .filter((row) => row.items.length > 0);

  const rowIds = new Set(rows.map((row) => row.id));
  const itemIds = new Set(
    rows.flatMap((row) => row.items.map((item) => item.id))
  );
  const lastColumnByRowId = Object.fromEntries(
    Object.entries(layout.lastColumnByRowId).filter(([rowId, column]) => {
      return rowIds.has(rowId) && Number.isInteger(column) && column >= 0;
    })
  );

  return {
    focusTick:
      Number.isInteger(layout.focusTick) && layout.focusTick >= 0
        ? layout.focusTick
        : 0,
    diffRenderMode: layout.diffRenderMode ?? "stacked",
    isDiffViewOpen: layout.isDiffViewOpen ?? false,
    isFullscreenMode: layout.isFullscreenMode ?? false,
    isNotesOpen: layout.isNotesOpen,
    isOverviewOpen: layout.isOverviewOpen,
    lastColumnByRowId,
    rows,
    ...(layout.selectedItemId && itemIds.has(layout.selectedItemId)
      ? { selectedItemId: layout.selectedItemId }
      : {}),
  };
}

function cloneCanvas(canvas: Canvas): Canvas {
  return { ...canvas };
}

function cloneProject(project: Project): Project {
  return {
    ...project,
    canvases: project.canvases.map(cloneCanvas),
  };
}

function normalizePersistedState(
  state: PersistedWorkspaceState
): HydratedWorkspaceState {
  const projects = state.workspace.projects.map(cloneProject);
  const canvasIds = new Set(
    projects.flatMap((project) => project.canvases.map((canvas) => canvas.id))
  );
  const layoutsByCanvas = Object.fromEntries(
    Object.entries(state.layout.layoutsByCanvas)
      .filter(([canvasId]) => canvasIds.has(canvasId))
      .map(([canvasId, layout]) => [canvasId, sanitizeLayout(layout)])
  );

  const canvasOwnerById = new Map<string, string>();
  for (const project of projects) {
    for (const canvas of project.canvases) {
      canvasOwnerById.set(canvas.id, project.id);
    }
  }

  const allCanvases = projects.flatMap((project) => project.canvases);
  const fallbackCanvasId =
    allCanvases
      .slice()
      .sort((left, right) => right.lastActiveAt - left.lastActiveAt)[0]?.id ??
    null;
  const activeCanvasId =
    state.workspace.activeCanvasId &&
    canvasIds.has(state.workspace.activeCanvasId)
      ? state.workspace.activeCanvasId
      : fallbackCanvasId;
  const fallbackProjectId =
    (activeCanvasId ? canvasOwnerById.get(activeCanvasId) : null) ??
    projects[0]?.id ??
    null;
  const activeProjectId =
    state.workspace.activeProjectId &&
    projects.some((project) => project.id === state.workspace.activeProjectId)
      ? state.workspace.activeProjectId
      : fallbackProjectId;
  const activeLayout = activeCanvasId
    ? layoutsByCanvas[activeCanvasId]
    : undefined;

  return {
    activeCanvasId,
    activeProjectId,
    layout: activeLayout ? cloneLayout(activeLayout) : createInitialLayout(),
    layoutsByCanvas,
    projects,
  };
}

function readPersistedWorkspaceState(): HydratedWorkspaceState | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(LOCAL_STORAGE_KEYS.WORKSPACE);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const migrated = migrateToCurrentVersion(
      parsed as Record<string, unknown>
    );
    if (!migrated) {
      return null;
    }

    const result = persistedWorkspaceStateSchema.safeParse(migrated);
    if (!result.success) {
      return null;
    }

    return normalizePersistedState(result.data);
  } catch {
    return null;
  }
}

function buildPersistedWorkspaceState(): PersistedWorkspaceState {
  const workspaceState = useWorkspaceStore.getState();
  const layoutState = useLayoutStore.getState();
  const layoutsByCanvas = Object.fromEntries(
    Object.entries(layoutState.layoutsByCanvas).map(([canvasId, layout]) => [
      canvasId,
      sanitizeLayout(layout),
    ])
  );

  if (layoutState.activeCanvasId) {
    layoutsByCanvas[layoutState.activeCanvasId] = sanitizeLayout(
      layoutState.layout
    );
  }

  return {
    version: WORKSPACE_PERSISTED_STATE_VERSION,
    workspace: {
      activeCanvasId: workspaceState.activeCanvasId,
      activeProjectId: workspaceState.activeProjectId,
      projects: workspaceState.projects.map(cloneProject),
    },
    layout: {
      layoutsByCanvas,
    },
  };
}

function persistWorkspaceState() {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      LOCAL_STORAGE_KEYS.WORKSPACE,
      JSON.stringify(buildPersistedWorkspaceState())
    );
  } catch {
    // Ignore storage failures so the workspace remains usable.
  }
}

function flushPendingPersist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
    persistWorkspaceState();
  }
}

function schedulePersist() {
  if (isHydrating) {
    return;
  }

  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistWorkspaceState();
  }, PERSIST_DELAY_MS);
}

function applyHydratedState(state: HydratedWorkspaceState) {
  useLayoutStore.setState({
    activeCanvasId: state.activeCanvasId,
    layout: cloneLayout(state.layout),
    layoutsByCanvas: Object.fromEntries(
      Object.entries(state.layoutsByCanvas).map(([canvasId, layout]) => [
        canvasId,
        cloneLayout(layout),
      ])
    ),
  });

  useWorkspaceStore.setState({
    activeCanvasId: state.activeCanvasId,
    activeProjectId: state.activeProjectId,
    projects: state.projects.map(cloneProject),
  });
}

export function initializeWorkspacePersistence() {
  if (initialized) {
    return;
  }

  initialized = true;
  isHydrating = true;

  try {
    const hydratedState = readPersistedWorkspaceState();
    if (hydratedState) {
      applyHydratedState(hydratedState);
    }
  } finally {
    isHydrating = false;
  }

  unsubscribeWorkspaceStore = useWorkspaceStore.subscribe(() => {
    schedulePersist();
  });
  unsubscribeLayoutStore = useLayoutStore.subscribe(() => {
    schedulePersist();
  });

  if (typeof window !== "undefined") {
    boundBeforeUnload = () => flushPendingPersist();
    window.addEventListener("beforeunload", boundBeforeUnload);
  }
}

export function resetWorkspacePersistenceForTests() {
  unsubscribeWorkspaceStore?.();
  unsubscribeWorkspaceStore = null;
  unsubscribeLayoutStore?.();
  unsubscribeLayoutStore = null;

  if (boundBeforeUnload && typeof window !== "undefined") {
    window.removeEventListener("beforeunload", boundBeforeUnload);
  }
  boundBeforeUnload = null;

  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }

  initialized = false;
  isHydrating = false;
}

export function flushWorkspacePersistenceForTests() {
  flushPendingPersist();
  persistWorkspaceState();
}
