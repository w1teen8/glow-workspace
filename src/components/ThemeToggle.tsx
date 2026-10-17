"use client";

import { useEffect, useState } from "react";
import { THEME_KEY, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // приватный режим — тема просто не запомнится
    }
    setTheme(next);
  }

  return (
    <button className="logout" onClick={toggle}>
      {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
    </button>
  );
}
