"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { formatDue, localDay } from "@/lib/dates";
import type { Reply } from "@/lib/types";
import { LIMITS } from "@/lib/validate";
import { RichText } from "./RichText";
import { useWorkspace } from "./WorkspaceProvider";

/** Поле ответа: растёт по тексту, Enter — сохранить, Shift+Enter — новая строка, Esc — отмена. */
function ReplyInput({
  initial = "",
  placeholder,
  label,
  onSubmit,
  onClose,
}: {
  initial?: string;
  placeholder?: string;
  label: string;
  onSubmit: (text: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (text && text !== initial) onSubmit(text);
    onClose();
  }

  return (
    <textarea
      ref={ref}
      className="reply-input"
      rows={1}
      value={value}
      maxLength={LIMITS.replyText}
      placeholder={placeholder}
      aria-label={label}
      autoFocus
      enterKeyHint="send"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
        if (e.key === "Escape") onClose();
      }}
      onBlur={submit}
    />
  );
}

function ReplyView({ reply }: { reply: Reply }) {
  const { updateReply, deleteReply } = useWorkspace();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="reply">
        <ReplyInput
          initial={reply.text}
          label="Текст ответа"
          onSubmit={(text) => updateReply(reply.id, text)}
          onClose={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="reply" data-pending={reply.id < 0}>
      <div
        className="reply-body"
        role="button"
        tabIndex={0}
        title="Изменить"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest("a")) setEditing(true);
        }}
        onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && setEditing(true)}
      >
        <RichText text={reply.text} />
      </div>
      <span className="reply-date">{formatDue(localDay(reply.createdAt))}</span>
      <button className="reply-delete" aria-label="Удалить ответ" title="Удалить" onClick={() => deleteReply(reply)}>
        ×
      </button>
    </li>
  );
}

/** «1 ответ», «3 ответа», «5 ответов». */
function repliesLabel(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word =
    mod10 === 1 && mod100 !== 11 ? "ответ" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "ответа" : "ответов";
  return `${n} ${word}`;
}

/**
 * Ответы под задачей: свёрнуты под кнопкой «N ответов», раскрываются по клику.
 * Поле нового ответа открывается кнопкой «Ответить» в строке задачи — тогда ответы видны сразу.
 */
export function TaskReplies({
  taskId,
  composing,
  onComposeEnd,
}: {
  taskId: number;
  composing: boolean;
  onComposeEnd: () => void;
}) {
  const { state, addReply } = useWorkspace();
  const [open, setOpen] = useState(false);
  const replies = state.replies.filter((r) => r.taskId === taskId);
  if (replies.length === 0 && !composing) return null;
  const shown = open || composing;

  return (
    <div className="replies-wrap">
      {replies.length > 0 && !composing && (
        <button className="replies-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 3h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7.5L4.5 13.5V11H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          </svg>
          {open ? "Скрыть" : repliesLabel(replies.length)}
          <span className="replies-chevron" aria-hidden>
            ▾
          </span>
        </button>
      )}
      {shown && (
        <ul className="replies">
          {replies.map((reply) => (
            <ReplyView key={reply.id} reply={reply} />
          ))}
          {composing && (
            <li className="reply">
              <ReplyInput
                placeholder="Ответ, решение или ссылка… Enter — отправить"
                label="Новый ответ"
                onSubmit={(text) => {
                  addReply(taskId, text);
                  setOpen(true);
                }}
                onClose={onComposeEnd}
              />
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
