import type { Metadata, Viewport } from "next";
import { SessionWatchdog } from "@/app/components/SessionWatchdog";
import "./globals.css";

const themeInitScript = `
  (() => {
    const storageKey = "jobjar-theme";
    const root = document.documentElement;

    try {
      const savedTheme = window.localStorage.getItem(storageKey);
      const theme = savedTheme === "dark" ? "dark" : "light";
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
    } catch {
      root.dataset.theme = "light";
      root.style.colorScheme = "light";
    }
  })();
`;

export const metadata: Metadata = {
  title: "JobJar",
  description: "Household jobs, shared simply",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JobJar",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1d4ed8" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <SessionWatchdog />
        {children}
      </body>
    </html>
  );
}
