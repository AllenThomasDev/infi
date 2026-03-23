import { ArrowLeftIcon, ArrowRightIcon, RefreshCcwIcon, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BaseNode,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "@/components/base-node";
import {
  BrowserAddressInput,
  BrowserChrome,
  BrowserToolbar,
  BrowserToolbarButton,
} from "@/components/browser/browser-chrome";
import { Button } from "@/components/ui/button";

const SHARED_PARTITION = "persist:browser";
export const DEFAULT_BROWSER_URL = "https://google.com";
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;
const HOSTLIKE_INPUT_PATTERN = /[.:]/;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "0.0.0.0", "::1", "localhost"]);
const TEN_NETWORK_PATTERN = /^10\./;
const RFC1918_CLASS_C_PATTERN = /^192\.168\./;
const RFC1918_CLASS_B_PATTERN = /^172\.(\d{1,3})\./;

interface LoadErrorState {
  code: number;
  description: string;
  url: string;
}

interface BrowserTileContentProps {
  initialUrl?: string;
  isFocused: boolean;
  onClose: () => void;
  title: string;
}

function isLocalNetworkHost(hostname: string): boolean {
  if (LOOPBACK_HOSTS.has(hostname)) {
    return true;
  }

  if (TEN_NETWORK_PATTERN.test(hostname)) {
    return true;
  }

  if (RFC1918_CLASS_C_PATTERN.test(hostname)) {
    return true;
  }

  const match = hostname.match(RFC1918_CLASS_B_PATTERN);

  if (!match) {
    return false;
  }

  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

function inferHttpUrl(input: string): string | null {
  try {
    const candidate = new URL(`http://${input}`);

    if (isLocalNetworkHost(candidate.hostname)) {
      return candidate.toString();
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    return DEFAULT_BROWSER_URL;
  }

  if (URL_SCHEME_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (!trimmed.includes(" ") && HOSTLIKE_INPUT_PATTERN.test(trimmed)) {
    const localUrl = inferHttpUrl(trimmed);

    if (localUrl) {
      return localUrl;
    }

    return `https://${trimmed}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export function BrowserTileContent({
  initialUrl,
  isFocused,
  onClose,
  title,
}: BrowserTileContentProps) {
  const webviewRef = useRef<Electron.WebviewTag>(null);
  const [currentUrl, setCurrentUrl] = useState(
    initialUrl || DEFAULT_BROWSER_URL
  );
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [loadError, setLoadError] = useState<LoadErrorState | null>(null);
  const [webviewFocused, setWebviewFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setWebviewFocused(false);
    }
  }, [isFocused]);

  const handleUrlChange = useCallback((url: string) => {
    const normalized = normalizeUrl(url);
    setCurrentUrl(normalized);
    setLoadError(null);
    webviewRef.current?.loadURL(normalized);
  }, []);

  const handleReload = useCallback(() => {
    if (!webviewRef.current) {
      return;
    }

    setLoadError(null);
    webviewRef.current.loadURL(currentUrl);
  }, [currentUrl]);

  const handleWebviewRef = useCallback((el: Electron.WebviewTag | null) => {
    (webviewRef as React.MutableRefObject<Electron.WebviewTag | null>).current =
      el;

    if (!el) {
      return;
    }

    const webview = el;

    function handleNavigate() {
      setLoadError(null);
      setCurrentUrl(webview.getURL());
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    }

    function handleLoadStart() {
      setLoadError(null);
    }

    function handleLoadFail(
      event: Event & {
        errorCode: number;
        errorDescription: string;
        validatedURL: string;
      }
    ) {
      if (event.errorCode === -3) {
        return;
      }

      setCurrentUrl(event.validatedURL);
      setLoadError({
        code: event.errorCode,
        description: event.errorDescription,
        url: event.validatedURL,
      });
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    }

    webview.addEventListener("focus", () => setWebviewFocused(true));
    webview.addEventListener("blur", () => setWebviewFocused(false));

    let registeredId: number | null = null;

    webview.addEventListener("dom-ready", () => {
      const wcId = webview.getWebContentsId();
      if (registeredId !== null) {
        window.webviewBridge.unregisterWebview(registeredId);
      }
      registeredId = wcId;
      window.webviewBridge.registerWebview(wcId);
    });

    window.webviewBridge.onEscape((wcId) => {
      if (wcId === registeredId) {
        webview.blur();
      }
    });

    webview.addEventListener("did-start-loading", handleLoadStart);
    webview.addEventListener("did-navigate", handleNavigate);
    webview.addEventListener("did-navigate-in-page", handleNavigate);
    webview.addEventListener("did-fail-load", handleLoadFail as EventListener);
  }, []);

  return (
    <BaseNode
      className="h-full w-full data-[webview-focused=true]:border-primary data-[webview-focused=true]:ring-1 data-[webview-focused=true]:ring-primary/50"
      data-webview-focused={webviewFocused}
      selected={isFocused}
    >
      <BaseNodeHeader className="border-b">
        <BaseNodeHeaderTitle className="text-xs">{title}</BaseNodeHeaderTitle>
        <Button
          aria-label={`Close ${title}`}
          onClick={onClose}
          size="icon-sm"
          variant="ghost"
        >
          <X />
        </Button>
      </BaseNodeHeader>

      <BrowserChrome
        className="min-h-0 flex-1 rounded-none border-0"
        defaultUrl={initialUrl || DEFAULT_BROWSER_URL}
        onUrlChange={handleUrlChange}
        url={currentUrl}
      >
        <BrowserToolbar>
          <BrowserToolbarButton
            disabled={!canGoBack}
            onClick={() => webviewRef.current?.goBack()}
            tooltip="Go back"
          >
            <ArrowLeftIcon className="size-4" />
          </BrowserToolbarButton>
          <BrowserToolbarButton
            disabled={!canGoForward}
            onClick={() => webviewRef.current?.goForward()}
            tooltip="Go forward"
          >
            <ArrowRightIcon className="size-4" />
          </BrowserToolbarButton>
          <BrowserToolbarButton onClick={handleReload} tooltip="Reload">
            <RefreshCcwIcon className="size-4" />
          </BrowserToolbarButton>
          <BrowserAddressInput />
        </BrowserToolbar>

        <div className="relative min-h-0 flex-1">
          <webview
            className="absolute inset-0"
            partition={SHARED_PARTITION}
            ref={handleWebviewRef}
            src={initialUrl || DEFAULT_BROWSER_URL}
          />
          {webviewFocused ? null : (
            <button
              aria-label="Focus browser"
              className="absolute inset-0 cursor-pointer"
              onClick={() => {
                webviewRef.current?.focus();
                setWebviewFocused(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  webviewRef.current?.focus();
                  setWebviewFocused(true);
                }
              }}
              type="button"
            />
          )}
          {loadError ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/90 p-4 text-center">
              <div className="max-w-sm space-y-2 rounded-lg border bg-card p-4 shadow-sm">
                <h2 className="font-semibold text-sm">Failed to load page</h2>
                <p className="break-all text-muted-foreground text-xs">
                  {loadError.url}
                </p>
                <p className="text-muted-foreground text-xs">
                  {loadError.description} ({loadError.code})
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </BrowserChrome>
    </BaseNode>
  );
}
