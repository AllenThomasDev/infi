import { RouterProvider } from "@tanstack/react-router";
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";
import "@xyflow/react/dist/style.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LOCAL_STORAGE_KEYS } from "@/constants";
import { updateAppLanguage } from "./actions/language";
import { router } from "./utils/routes";
import "./localization/i18n";

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    updateAppLanguage(i18n);
  }, [i18n]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey={LOCAL_STORAGE_KEYS.THEME}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </ThemeProvider>
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
