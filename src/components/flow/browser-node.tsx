import type { NodeProps } from "@xyflow/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  RefreshCcwIcon,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
} from "@/components/ai/web-preview";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import type { BrowserFlowNode } from "@/components/flow/types";
import { useNodeActions } from "@/components/flow/use-node-actions";
import { useNodeSelectionEffects } from "@/components/flow/use-node-selection-effects";
import { Button } from "@/components/ui/button";

const SHARED_PARTITION = "persist:browser";
const DEFAULT_URL = "https://google.com";

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return DEFAULT_URL;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return trimmed;
  if (!trimmed.includes(" ") && /[.:]/.test(trimmed)) return `https://${trimmed}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export default function BrowserNode({
  id,
  data,
  selected,
}: NodeProps<BrowserFlowNode>) {
  const { removeSelf } = useNodeActions(id);
  const containerRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<Electron.WebviewTag>(null);
  const [currentUrl, setCurrentUrl] = useState(data.url || DEFAULT_URL);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useNodeSelectionEffects({
    containerRef,
    focusTarget: "input",
    selected,
  });

  const handleUrlChange = useCallback((url: string) => {
    const normalized = normalizeUrl(url);
    webviewRef.current?.loadURL(normalized);
  }, []);

  const handleWebviewRef = useCallback(
    (el: Electron.WebviewTag | null) => {
      const prev = webviewRef.current;
      if (prev) {
        prev.removeEventListener("did-navigate", handleNavigate);
        prev.removeEventListener("did-navigate-in-page", handleNavigate);
      }

      (webviewRef as React.MutableRefObject<Electron.WebviewTag | null>).current = el;

      if (!el) return;

      function handleNavigate() {
        if (!el) return;
        setCurrentUrl(el.getURL());
        setCanGoBack(el.canGoBack());
        setCanGoForward(el.canGoForward());
      }

      el.addEventListener("did-navigate", handleNavigate);
      el.addEventListener("did-navigate-in-page", handleNavigate);
      el.addEventListener("did-fail-load", ((e: Event & { errorCode: number; errorDescription: string; validatedURL: string }) => {
        if (e.errorCode === -3) return;
        el.loadURL(`data:text/html,${encodeURIComponent(
          `<body style="font-family:system-ui;color:#888;padding:2em">` +
          `<h2>Failed to load</h2>` +
          `<p>${e.validatedURL}</p>` +
          `<p>${e.errorDescription} (${e.errorCode})</p></body>`
        )}`);
      }) as EventListener);
    },
    []
  );

  return (
    <BaseNode className="h-full w-full" selected={selected}>
      <BaseNodeHeader className="border-b">
        <BaseNodeHeaderTitle className="text-xs">
          {data.title}
        </BaseNodeHeaderTitle>
        <Button
          aria-label={`Close ${data.title}`}
          className="nodrag"
          onClick={removeSelf}
          size="icon-sm"
          variant="ghost"
        >
          <X />
        </Button>
      </BaseNodeHeader>

      <WebPreview
        className="nodrag min-h-0 flex-1 rounded-none border-0"
        defaultUrl={data.url || DEFAULT_URL}
        url={currentUrl}
        onUrlChange={handleUrlChange}
      >
        <WebPreviewNavigation>
          <WebPreviewNavigationButton
            disabled={!canGoBack}
            onClick={() => webviewRef.current?.goBack()}
            tooltip="Go back"
          >
            <ArrowLeftIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton
            disabled={!canGoForward}
            onClick={() => webviewRef.current?.goForward()}
            tooltip="Go forward"
          >
            <ArrowRightIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewNavigationButton
            onClick={() => webviewRef.current?.reload()}
            tooltip="Reload"
          >
            <RefreshCcwIcon className="size-4" />
          </WebPreviewNavigationButton>
          <WebPreviewUrl />
        </WebPreviewNavigation>

        {/* Webview replaces the iframe-based WebPreviewBody */}
        <div
          className="nowheel nokey relative min-h-0 flex-1"
          ref={containerRef}
        >
          <webview
            ref={handleWebviewRef}
            src={data.url || DEFAULT_URL}
            partition={SHARED_PARTITION}
            className="absolute inset-0"
          />
        </div>
      </WebPreview>
    </BaseNode>
  );
}
