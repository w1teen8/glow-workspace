import type { Metadata, Viewport } from "next";
import { Golos_Text, Outfit } from "next/font/google";
import "./globals.css";

// Интерфейс — Golos Text (есть кириллица). Outfit — только надпись логотипа, как в макете.
const font = Golos_Text({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "600"], variable: "--font-logo" });

export const metadata: Metadata = {
  title: { default: "GLOW SPACE", template: "%s · GLOW SPACE" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#F2F3F5",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${font.className} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
