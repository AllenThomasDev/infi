"use no memo";

import { useRef } from "react";
import { Editor, defaultValueCtx, rootCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import "./milkdown-editor.css";

interface MilkdownEditorInnerProps {
  initialContent: string;
  onChange: (markdown: string) => void;
}

function MilkdownEditorInner({
  initialContent,
  onChange,
}: MilkdownEditorInnerProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialContent);
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
          if (markdown !== prevMarkdown) {
            onChangeRef.current(markdown);
          }
        });
      })
      .use(commonmark)
      .use(history)
      .use(listener);
  }, []);

  return <Milkdown />;
}

interface MilkdownEditorProps {
  initialContent: string;
  onChange: (markdown: string) => void;
}

export function MilkdownEditor({
  initialContent,
  onChange,
}: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <MilkdownEditorInner initialContent={initialContent} onChange={onChange} />
    </MilkdownProvider>
  );
}
