"use no memo";

import { useCallback, useEffect, useRef, useState } from "react";
import { MilkdownEditor } from "@/components/editors/milkdown-editor";
import { ipc } from "@/ipc/manager";

const NOTES_PATH = ".context/notes.md";
const DEBOUNCE_MS = 500;

function getNotesPath(worktreePath: string) {
  return `${worktreePath}/${NOTES_PATH}`;
}

/**
 * Returns whether the notes file for the given worktree has content.
 * The value is `null` while loading.
 */
export function useHasNotes(worktreePath: string | undefined): boolean | null {
  const [hasNotes, setHasNotes] = useState<boolean | null>(null);

  useEffect(() => {
    if (!worktreePath) {
      setHasNotes(null);
      return;
    }

    setHasNotes(null);
    ipc.client.files
      .readFile({ path: getNotesPath(worktreePath) })
      .then(({ content }) => setHasNotes(!!content?.trim()))
      .catch(() => setHasNotes(false));
  }, [worktreePath]);

  return hasNotes;
}

interface NotesEditorProps {
  className?: string;
  onContentChange?: (hasContent: boolean) => void;
  worktreePath: string;
}

export function NotesEditor({
  className,
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

      onContentChangeRef.current?.(!!markdown.trim());

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
    <div className={className}>
      <MilkdownEditor
        initialContent={initialContent}
        key={editorKey}
        onChange={handleChange}
      />
    </div>
  );
}
