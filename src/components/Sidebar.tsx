"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SECTION_TITLE_MAX } from "@/lib/sections";
import { Logo, LogoMark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { useWorkspace } from "./WorkspaceProvider";

export function Sidebar() {
  const { state, addSection } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const fixed = [
    { href: "/", emoji: "", title: "Прогресс" },
    { href: "/tasks", emoji: "", title: "Задачи" },
    { href: "/p/a", emoji: "", title: state.people.a },
    { href: "/p/b", emoji: "", title: state.people.b },
  ];
  const links = [
    ...fixed,
    ...state.sections.map((s) => ({ href: `/s/${s.slug}`, emoji: s.emoji, title: s.title })),
  ];
  const current = links.find((l) => l.href === pathname);

  useEffect(() => setOpen(false), [pathname]);

  async function create() {
    const title = draft.trim();
    if (!title) return setAdding(false);
    setDraft("");
    setAdding(false);
    const section = await addSection(title);
    if (section) router.push(`/s/${section.slug}`);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      <header className="topbar">
        <span className="topbar-title">
          <LogoMark height={16} />
          {current ? current.title : "GLOW SPACE"}
        </span>
        <button className="topbar-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Закрыть" : "Разделы"}
        </button>
      </header>

      <aside className="sidebar" data-open={open}>
        <div className="brand">
          <Logo height={18} />
        </div>
        <nav className="nav">
          {links.map((link, i) => (
            <div key={link.href} style={{ display: "contents" }}>
              <Link
                href={link.href}
                className="nav-link"
                aria-current={pathname === link.href ? "page" : undefined}
              >
                <span className="nav-emoji" aria-hidden>
                  {link.emoji}
                </span>
                <span className="nav-title">{link.title}</span>
              </Link>
              {i === fixed.length - 1 && <div className="nav-gap" />}
            </div>
          ))}

          {adding ? (
            <input
              className="nav-input"
              value={draft}
              maxLength={SECTION_TITLE_MAX + 8}
              placeholder="Название раздела"
              aria-label="Название нового раздела"
              enterKeyHint="done"
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") void create();
                if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              onBlur={() => void create()}
            />
          ) : (
            <button className="nav-link nav-add" onClick={() => setAdding(true)}>
              <span className="nav-emoji" aria-hidden>
                +
              </span>
              Новый раздел
            </button>
          )}
        </nav>
        <div className="sidebar-footer">
          <ThemeToggle />
          <button className="logout" onClick={logout}>
            Выйти
          </button>
        </div>
      </aside>
    </>
  );
}
