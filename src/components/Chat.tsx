"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SECTIONS, type Section } from "@/lib/sections";
import type { ChatMessage } from "@/lib/types";
import { LIMITS } from "@/lib/validate";
import { POLL_MS, useVisiblePolling } from "./WorkspaceProvider";

const QUICK = {
  next: "Что нам делать дальше? Посмотри на все разделы и предложи два-три следующих шага.",
  priorities:
    "Проверь наши приоритеты: что сейчас действительно важно, что можно отложить и где разделы противоречат друг другу?",
  section: (s: Section) =>
    `Разбери раздел «${s.title}»: что уже хорошо, чего не хватает, какие вопросы нам стоит себе задать?`,
};

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      if (res.status === 401) window.location.href = "/login";
      if (res.ok && !busy.current) {
        const next: ChatMessage[] = await res.json();
        setMessages((prev) =>
          prev && prev.length === next.length && prev.at(-1)?.id === next.at(-1)?.id ? prev : next,
        );
      }
    } catch {
      // попробуем при следующем опросе
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useVisiblePolling(load, POLL_MS);

  // Прокручиваем вниз при новых сообщениях и по мере того, как приходит ответ.
  useLayoutEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  async function ask(content: string) {
    const text = content.trim();
    if (!text || busy.current) return;
    busy.current = true;
    setPicking(false);
    setDraft("");
    setMessages((m) => [...(m ?? []), { id: -Date.now(), role: "user", content: text }]);
    setStreaming("");

    let answer = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        answer += value;
        setStreaming(answer);
      }
    } catch {
      setMessages((m) => [
        ...(m ?? []),
        { id: -Date.now(), role: "assistant", content: "Не получилось отправить. Проверь соединение и попробуй ещё раз." },
      ]);
    }

    // Сохранённая на сервере версия переписки — главная, перечитываем её
    // и заменяем ею временный ответ одним обновлением, без мигания.
    let saved: ChatMessage[] | null = null;
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      if (res.ok) saved = await res.json();
    } catch {
      // останется локальная версия до следующего опроса
    }
    busy.current = false;
    if (saved) setMessages(saved);
    else if (answer) setMessages((m) => [...(m ?? []), { id: -Date.now(), role: "assistant", content: answer }]);
    setStreaming(null);
    input.current?.focus();
  }

  const isBusy = streaming !== null;

  return (
    <div className="chat">
      <h1>ИИ-агент</h1>
      <p className="chat-intro">Видит заметки, задачи и материалы всех разделов. Советует, но ничего не меняет.</p>

      <div className="messages" ref={list} aria-live="polite">
        {messages?.length === 0 && !isBusy && (
          <p className="chat-empty">Спроси что-нибудь о проекте или нажми одну из кнопок ниже.</p>
        )}
        {messages?.map((m) => (
          <div key={m.id} className="message" data-role={m.role}>
            {m.content}
          </div>
        ))}
        {isBusy && (
          <div className="message" data-role="assistant">
            {streaming || <span className="muted">Думаю…</span>}
          </div>
        )}
      </div>

      <div className="quick">
        <button className="chip" disabled={isBusy} onClick={() => ask(QUICK.next)}>
          Что делать дальше?
        </button>
        <button className="chip" disabled={isBusy} onClick={() => ask(QUICK.priorities)}>
          Проверь приоритеты
        </button>
        <button className="chip" disabled={isBusy} aria-pressed={picking} onClick={() => setPicking(!picking)}>
          Разбери этот раздел
        </button>
      </div>
      {picking && (
        <div className="section-picker" role="group" aria-label="Какой раздел разобрать">
          {SECTIONS.map((s) => (
            <button key={s.slug} className="chip" onClick={() => ask(QUICK.section(s))}>
              {s.emoji} {s.title}
            </button>
          ))}
        </div>
      )}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
      >
        <textarea
          ref={input}
          rows={1}
          value={draft}
          maxLength={LIMITS.chatMessage}
          placeholder="Спросить…"
          aria-label="Сообщение"
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight + 2}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void ask(draft);
            }
          }}
        />
        <button className="button" disabled={isBusy || !draft.trim()}>
          Отправить
        </button>
      </form>
    </div>
  );
}
