"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getThemeCookie(): Theme | null {
  const match = document.cookie.match(/(?:^|; )sentinel-theme=(dark|light)/);
  return match ? (match[1] as Theme) : null;
}

function setThemeCookie(theme: Theme) {
  document.cookie = `sentinel-theme=${theme};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read from cookie first (for SSR consistency), fallback to localStorage
    const cookieTheme = getThemeCookie();
    const saved = cookieTheme || (localStorage.getItem("sentinel-theme") as Theme);
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
      document.documentElement.classList.toggle("light", saved === "light");
      // Migrate from localStorage to cookie if needed
      if (!cookieTheme) setThemeCookie(saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeCookie(next);
    localStorage.setItem("sentinel-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.classList.toggle("light", next === "light");
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
