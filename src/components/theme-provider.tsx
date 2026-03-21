import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LOCAL_STORAGE_KEYS } from "@/constants";
import { ipc } from "@/ipc/manager";
import type { ThemeMode } from "@/types/theme-mode";

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
}

interface ThemeProviderState {
  resolvedTheme: Exclude<ThemeMode, "system">;
  setTheme: (theme: ThemeMode) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | null>(null);

function getSystemTheme(): Exclude<ThemeMode, "system"> {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: ThemeMode) {
  const root = window.document.documentElement;
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);

  return resolvedTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = LOCAL_STORAGE_KEYS.THEME,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(
    () => (localStorage.getItem(storageKey) as ThemeMode | null) ?? defaultTheme
  );
  const [resolvedTheme, setResolvedTheme] = useState<
    Exclude<ThemeMode, "system">
  >(() => applyTheme(theme));

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const syncTheme = () => {
      const nextResolvedTheme = applyTheme(theme);
      setResolvedTheme(nextResolvedTheme);
      ipc.client.theme.setThemeMode(theme).catch(console.error);
    };

    syncTheme();

    if (theme !== "system") {
      return;
    }

    const handleChange = () => {
      const nextResolvedTheme = applyTheme("system");
      setResolvedTheme(nextResolvedTheme);
      ipc.client.theme.setThemeMode("system").catch(console.error);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const value = useMemo(
    () => ({
      resolvedTheme,
      setTheme: (nextTheme: ThemeMode) => {
        localStorage.setItem(storageKey, nextTheme);
        setThemeState(nextTheme);
      },
      theme,
      toggleTheme: () => {
        const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
        localStorage.setItem(storageKey, nextTheme);
        setThemeState(nextTheme);
      },
    }),
    [resolvedTheme, storageKey, theme]
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
