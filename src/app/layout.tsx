import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { HighlightStylesheet } from "@/components/highlight-stylesheet";
import "./globals.css";

const geistSans = localFont({
  src: [
    {
      path: "../../node_modules/next/dist/esm/next-devtools/server/font/geist-latin.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: [
    {
      path: "../../node_modules/next/dist/esm/next-devtools/server/font/geist-mono-latin.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Weaver Skills Center",
  description: "Company skills registry — browse and install AI agent skills",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-app-bg antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <HighlightStylesheet />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
