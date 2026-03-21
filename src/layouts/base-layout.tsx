import type React from "react";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="h-screen overflow-hidden">{children}</main>;
}
