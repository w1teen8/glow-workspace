"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SECTIONS } from "@/lib/sections";

const LINKS = [
  { href: "/", emoji: "", title: "Прогресс" },
  null,
  ...SECTIONS.map((s) => ({ href: `/s/${s.slug}`, emoji: s.emoji, title: s.title })),
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = LINKS.find((l) => l?.href === pathname);

  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      <header className="topbar">
        <span>{current ? current.title : "Glow Workspace"}</span>
        <button className="topbar-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Закрыть" : "Разделы"}
        </button>
      </header>

      <aside className="sidebar" data-open={open}>
        <div className="brand">Glow Workspace</div>
        <nav className="nav">
          {LINKS.map((link, i) =>
            link ? (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link"
                aria-current={pathname === link.href ? "page" : undefined}
              >
                <span className="nav-emoji" aria-hidden>
                  {link.emoji}
                </span>
                {link.title}
              </Link>
            ) : (
              <div key={i} className="nav-gap" />
            ),
          )}
        </nav>
        <button className="logout" onClick={logout}>
          Выйти
        </button>
      </aside>
    </>
  );
}
