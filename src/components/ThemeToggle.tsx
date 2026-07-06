"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bg-remove-app-theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved ? saved === "dark" : prefersDark;
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      aria-label="ダークモード切り替え"
      className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm active:scale-95 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
    >
      {isDark ? "🌙" : "☀️"}
    </button>
  );
}
