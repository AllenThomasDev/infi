"use no memo";

import { useCallback, useEffect, useRef, useState } from "react";
import { StickyNote } from "lucide-react";
import { MilkdownEditor } from "@/components/editors/milkdown-editor";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ipc } from "@/ipc/manager";
import { useWorkspaceStore } from "@/workspace/workspace-store";

const NOTES_PATH = ".context/notes.md";
const DEBOUNCE_MS = 500;

function getNotesPath(worktreePath: string) {
  return `${worktreePath}/${NOTES_PATH}`;
}

function NotesSheet({ worktreePath }: { worktreePath: string }) {
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    ipc.client.files
      .readFile({ path: getNotesPath(worktreePath) })
      .then(({ content }) => {
        setInitialContent(content ?? "");
        setEditorKey((k) => k + 1);
      })
      .catch(console.error);
  }, [worktreePath]);

  const handleChange = useCallback(
    (markdown: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!markdown.trim()) return;

      debounceRef.current = setTimeout(() => {
        ipc.client.files
          .writeFile({ path: getNotesPath(worktreePath), content: markdown })
          .catch(console.error);
      }, DEBOUNCE_MS);
    },
    [worktreePath]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (initialContent === null) return null;

  return (
    <div className="milkdown min-h-0 flex-1 overflow-auto p-4">
      <MilkdownEditor
        initialContent={initialContent}
        key={editorKey}
        onChange={handleChange}
      />
    </div>
  );
}

export function StatusBar() {
  const projects = useWorkspaceStore((s) => s.projects);
  const activeCanvasId = useWorkspaceStore((s) => s.activeCanvasId);

  const activeCanvas = projects
    .flatMap((p) => p.canvases)
    .find((c) => c.id === activeCanvasId);
  const worktreePath = activeCanvas?.worktreePath;

  return (
    <div className="draglayer flex h-13 shrink-0 items-center border-sidebar-border border-b bg-sidebar px-2">
      {worktreePath ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              size="icon-sm"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              variant="ghost"
              title="Notes"
            >
              <StickyNote className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col" side="right">
            <SheetHeader>
              <SheetTitle>Notes</SheetTitle>
              <SheetDescription>.context/notes.md</SheetDescription>
            </SheetHeader>
            <NotesSheet worktreePath={worktreePath} />
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
