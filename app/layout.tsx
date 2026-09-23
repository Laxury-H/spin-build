import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const grotesk = Geist({
  variable: "--font-grotesk",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono-face",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "SPIN//BUILD — Spin the internet into something worth building.",
    template: "%s — SPIN//BUILD",
  },
  description:
    "A futuristic idea roulette for developers, designers and indie makers. Real trends. Controlled randomness. Questionable decisions.",
  applicationName: "SPIN//BUILD",
  openGraph: {
    title: "SPIN//BUILD",
    description: "Spin the internet into something worth building.",
    siteName: "SPIN//BUILD",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-fg">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
