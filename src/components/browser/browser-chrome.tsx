import type { ComponentProps } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/tailwind";

interface BrowserChromeContextValue {
  setUrl: (url: string) => void;
  url: string;
}

const BrowserChromeContext = createContext<BrowserChromeContextValue | null>(
  null
);

function useBrowserChrome() {
  const context = useContext(BrowserChromeContext);

  if (!context) {
    throw new Error(
      "Browser chrome components must be used within a BrowserChrome"
    );
  }

  return context;
}

export type BrowserChromeProps = ComponentProps<"div"> & {
  defaultUrl?: string;
  onUrlChange?: (url: string) => void;
  url?: string;
};

export const BrowserChrome = ({
  className,
  children,
  defaultUrl = "",
  url: controlledUrl,
  onUrlChange,
  ...props
}: BrowserChromeProps) => {
  const [internalUrl, setInternalUrl] = useState(defaultUrl);
  const url = controlledUrl ?? internalUrl;

  const handleUrlChange = (newUrl: string) => {
    setInternalUrl(newUrl);
    onUrlChange?.(newUrl);
  };

  return (
    <BrowserChromeContext.Provider value={{ setUrl: handleUrlChange, url }}>
      <div
        className={cn(
          "flex size-full flex-col rounded-lg border bg-card",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </BrowserChromeContext.Provider>
  );
};

export type BrowserToolbarProps = ComponentProps<"div">;

export const BrowserToolbar = ({
  className,
  children,
  ...props
}: BrowserToolbarProps) => (
  <div
    className={cn("flex items-center gap-1 border-b p-2", className)}
    {...props}
  >
    {children}
  </div>
);

export type BrowserToolbarButtonProps = ComponentProps<typeof Button> & {
  tooltip?: string;
};

export const BrowserToolbarButton = ({
  onClick,
  disabled,
  tooltip,
  children,
  ...props
}: BrowserToolbarButtonProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="h-8 w-8 p-0 hover:text-foreground"
          disabled={disabled}
          onClick={onClick}
          size="sm"
          variant="ghost"
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export type BrowserAddressInputProps = ComponentProps<typeof Input>;

export const BrowserAddressInput = ({
  value,
  onChange,
  onKeyDown,
  ...props
}: BrowserAddressInputProps) => {
  const { url, setUrl } = useBrowserChrome();
  const [inputValue, setInputValue] = useState(url);

  useEffect(() => {
    setInputValue(url);
  }, [url]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    onChange?.(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const target = event.target as HTMLInputElement;
      setUrl(target.value);
      target.blur();
    } else if (event.key === "Escape") {
      setInputValue(url);
      (event.target as HTMLInputElement).blur();
    }

    onKeyDown?.(event);
  };

  return (
    <Input
      className="h-8 flex-1 text-sm"
      onChange={onChange ?? handleChange}
      onKeyDown={handleKeyDown}
      placeholder="Enter URL..."
      value={value ?? inputValue}
      {...props}
    />
  );
};
