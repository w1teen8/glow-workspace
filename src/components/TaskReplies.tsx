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

/** Ответы под задачей и поле нового ответа (открывается кнопкой «Ответить» в строке задачи). */
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
  const replies = state.replies.filter((r) => r.taskId === taskId);
  if (replies.length === 0 && !composing) return null;

  return (
    <ul className="replies">
      {replies.map((reply) => (
        <ReplyView key={reply.id} reply={reply} />
      ))}
      {composing && (
        <li className="reply">
          <ReplyInput
            placeholder="Ответ, решение или ссылка… Enter — отправить"
            label="Новый ответ"
            onSubmit={(text) => addReply(taskId, text)}
            onClose={onComposeEnd}
          />
        </li>
      )}
    </ul>
  );
}
