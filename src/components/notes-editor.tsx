"use no memo";

import { useCallback, useEffect, useRef, useState } from "react";
import { MilkdownEditor } from "@/components/editors/milkdown-editor";
import { ipc } from "@/ipc/manager";

const NOTES_PATH = ".context/notes.md";
const DEBOUNCE_MS = 500;

function getNotesPath(worktreePath: string) {
  return `${worktreePath}/${NOTES_PATH}`;
}

interface NotesEditorProps {
  onClose: () => void;
  onContentChange?: (hasContent: boolean) => void;
  worktreePath: string;
}

export function NotesEditor({
  onClose,
  onContentChange,
  worktreePath,
}: NotesEditorProps) {
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  useEffect(() => {
    ipc.client.files
      .readFile({ path: getNotesPath(worktreePath) })
      .then(({ content }) => {
        const text = content ?? "";
        setInitialContent(text);
        setEditorKey((k) => k + 1);
        onContentChangeRef.current?.(!!text.trim());
      })
      .catch(console.error);
  }, [worktreePath]);

  const handleChange = useCallback(
    (markdown: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      onContentChangeRef.current?.(!!markdown.trim());

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
    <div
      className="absolute inset-0 overflow-auto bg-background"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      role="region"
      tabIndex={-1}
    >
      <div className="milkdown px-4 py-4">
        <MilkdownEditor
          initialContent={initialContent}
          key={editorKey}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
