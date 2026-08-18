"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
  return prefersLight ? "light" : "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const nextTheme = useMemo<Theme>(() => (theme === "dark" ? "light" : "dark"), [theme]);

  return (
    <button
      type="button"
      onClick={() => {
        setTheme(nextTheme);
        document.documentElement.setAttribute("data-theme", nextTheme);
        window.localStorage.setItem("theme", nextTheme);
      }}
      className="fixed top-4 left-4 z-50 p-3 rounded-xl glass-panel transition-all hover:scale-105"
      style={{ color: "var(--text-secondary)" }}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" style={{ color: "var(--accent)" }} />
      ) : (
        <Moon className="w-4 h-4" style={{ color: "var(--accent)" }} />
      )}
    </button>
  );
}
