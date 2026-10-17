import type { Metadata, Viewport } from "next";
import { Golos_Text } from "next/font/google";
import "./globals.css";

const font = Golos_Text({ subsets: ["latin", "cyrillic"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "GLOW SPACE", template: "%s · GLOW SPACE" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#111113",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={font.className}>
      <body>{children}</body>
    </html>
  );
}
