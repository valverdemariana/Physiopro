
// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import SafeNavbar from "@/components/SafeNavbar";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "PhysioPro",
  description: "Gestão de fisioterapia multiempresa - Uppli",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="container-page">{children}</div>
        <SafeNavbar />
      </body>
    </html>
  );
}

