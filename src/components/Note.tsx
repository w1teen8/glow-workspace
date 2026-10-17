"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LIMITS } from "@/lib/validate";
import { useWorkspace } from "./WorkspaceProvider";

const SAVE_DELAY_MS = 800;

export function Note({ section }: { section: string }) {
  const { state, saveNote } = useWorkspace();
  const serverValue = state.notes[section] ?? "";

  const [value, setValue] = useState(serverValue);
  const [status, setStatus] = useState<"" | "saving" | "saved">("");
  const saved = useRef(serverValue);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const latest = useRef(value);
  latest.current = value;

  // Изменения от второго человека подтягиваются, только если здесь ничего не редактируется.
  useEffect(() => {
    if (!focused.current && latest.current === saved.current) {
      setValue(serverValue);
      saved.current = serverValue;
    }
  }, [serverValue]);

  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  async function flush() {
    clearTimeout(timer.current);
    const note = latest.current;
    if (note === saved.current) return;
    setStatus("saving");
    if (await saveNote(section, note)) {
      saved.current = note;
      setStatus(latest.current === note ? "saved" : "");
    } else {
      setStatus("");
    }
  }

  // Если закрыть вкладку до автосохранения, текст всё равно уйдёт на сервер.
  useEffect(() => {
    const onHide = () => {
      if (latest.current === saved.current) return;
      void fetch(`/api/notes/${section}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: latest.current }),
        keepalive: true,
      });
      saved.current = latest.current;
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, [section]);

  useEffect(() => {
    if (status !== "saved") return;
    const t = setTimeout(() => setStatus(""), 2000);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <div className="note">
      <textarea
        ref={textarea}
        value={value}
        maxLength={LIMITS.note}
        placeholder="Опиши раздел: о чём он, что уже решено, что пока под вопросом…"
        aria-label="Описание раздела"
        onChange={(e) => {
          setValue(e.target.value);
          setStatus("");
          clearTimeout(timer.current);
          timer.current = setTimeout(flush, SAVE_DELAY_MS);
        }}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          void flush();
        }}
      />
      <div className="note-status" aria-live="polite">
        {status === "saving" ? "Сохраняю…" : status === "saved" ? "Сохранено" : ""}
      </div>
    </div>
  );
}
