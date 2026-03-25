import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeybindingsProvider } from "@/keybindings/keybindings-context";
import { LOCAL_STORAGE_KEYS } from "@/constants";
import { initializeWorkspacePersistence } from "@/workspace/persisted-workspace-state";
import { updateAppLanguage } from "./actions/language";
import { router } from "./utils/routes";
import "./localization/i18n";

initializeWorkspacePersistence();

const queryClient = new QueryClient();

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    updateAppLanguage(i18n);
  }, [i18n]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey={LOCAL_STORAGE_KEYS.THEME}>
        <KeybindingsProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </KeybindingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const container = document.getElementById("app");
if (!container) {
  throw new Error('Root element with id "app" not found');
}
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
