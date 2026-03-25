import type React from "react";
import { ToastProvider } from "@/components/ui/toast";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <main className="h-screen overflow-hidden">{children}</main>
    </ToastProvider>
  );
}
