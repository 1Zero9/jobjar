import type { Metadata, Viewport } from "next";
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
  description: "Household job jar for recurring room-based tasks",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        {children}
      </body>
    </html>
  );
}
