import type { Metadata } from "next";
import { cookies } from "next/headers";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Sentinel Lens - Cybersecurity Intelligence Feed",
  description:
    "Bilingual cybersecurity intelligence platform with real-time threat monitoring and analysis",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("sentinel-theme")?.value === "light" ? "light" : "dark";

  return (
    <html lang="en" className={theme} suppressHydrationWarning>
      <head />
      <body className="bg-surface text-on-surface font-body antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
