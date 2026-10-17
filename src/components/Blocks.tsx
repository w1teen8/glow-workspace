"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { formatDue, localDay } from "@/lib/dates";
import { formatSize, shrinkImage } from "@/lib/images";
import type { Item } from "@/lib/types";
import { INLINE_MIME, LIMITS } from "@/lib/validate";
import { FormatBar, RichText, handleFormatKey, renderRich } from "./RichText";
import { useWorkspace } from "./WorkspaceProvider";

/** Высота textarea по содержимому. */
function useAutosize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return ref;
}

export function Blocks({ section }: { section: string }) {
  const { state, addItem, notify } = useWorkspace();
  const blocks = state.items.filter((i) => i.section === section);

  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState<{ key: number; name: string }[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadKey = useRef(0);
  const composer = useAutosize(draft);

  async function upload(files: File[]) {
    for (const original of files) {
      const key = uploadKey.current++;
      setUploading((u) => [...u, { key, name: original.name }]);
      const file = await shrinkImage(original);
      if (file.size > LIMITS.fileBytes) {
        notify(`«${original.name}» больше 4 МБ — такой файл не загрузить`);
      } else {
        await addItem(section, { file });
      }
      setUploading((u) => u.filter((x) => x.key !== key));
    }
  }

  async function submit() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    if (!(await addItem(section, { text }))) setDraft(text);
  }

  return (
    <section
      className="block"
      data-dragging={dragging}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        void upload([...e.dataTransfer.files]);
      }}
    >
      <h2>Блоки</h2>

      {(blocks.length > 0 || uploading.length > 0) && (
        <ul className="blocks">
          {blocks.map((item) => (
            <BlockView key={item.id} item={item} />
          ))}
          {uploading.map((u) => (
            <li key={`up-${u.key}`} className="blk muted small">
              Загружаю «{u.name}»…
            </li>
          ))}
        </ul>
      )}

      <div className="blk-composer">
        <FormatBar target={composer} apply={(v) => setDraft(v)} />
        <textarea
          ref={composer}
          rows={2}
          value={draft}
          maxLength={LIMITS.itemText}
          placeholder="Текст нового блока…"
          aria-label="Текст нового блока"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (handleFormatKey(e, composer, (v) => setDraft(v))) return;
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
          onPaste={(e) => {
            const files = [...e.clipboardData.files];
            if (!files.length) return;
            e.preventDefault();
            void upload(files);
          }}
        />
        <div className="blk-actions">
          <button className="attach" onClick={() => fileInput.current?.click()}>
            Прикрепить файл
          </button>
          <button className="button button-small" disabled={!draft.trim()} onClick={() => void submit()}>
            Добавить блок
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            void upload([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>
    </section>
  );
}

/** Сколько элементов (абзацев, списков, подзаголовков) видно у свёрнутого блока. */
const COLLAPSED_ELEMENTS = 3;

function BlockView({ item }: { item: Item }) {
  const { updateItem, deleteItem } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const editor = useAutosize(editing ? draft : "");

  const url = `/api/files/${item.id}`;
  const isImage = item.file !== null && INLINE_MIME.includes(item.file.mime);

  // Если в блоке несколько строк, первая — заголовок.
  const text = item.text ?? "";
  const lines = text.split("\n");
  const hasTitle =
    lines.length > 1 && lines[0].trim().length > 0 && lines[0].length <= 120 && !/^\s*[•\-–*]\s/.test(lines[0]);
  const title = hasTitle ? lines[0] : null;
  const body = hasTitle ? lines.slice(1).join("\n").replace(/^\n+/, "") : text;
  const isLong = renderRich(body).length > COLLAPSED_ELEMENTS + 1;

  function startEdit() {
    setDraft(text);
    setEditing(true);
  }

  async function finishEdit(save: boolean) {
    setEditing(false);
    if (save && draft !== text && (draft.trim() || item.file)) await updateItem(item.id, draft);
  }

  return (
    <li className="blk">
      <div className="blk-body">
        {editing ? (
          <>
            <FormatBar target={editor} apply={(v) => setDraft(v)} />
            <textarea
              ref={editor}
              className="blk-editor"
              value={draft}
              maxLength={LIMITS.itemText}
              autoFocus
              aria-label="Текст блока"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (handleFormatKey(e, editor, (v) => setDraft(v))) return;
                if (e.key === "Escape") void finishEdit(false);
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void finishEdit(true);
              }}
              onBlur={() => void finishEdit(true)}
            />
            <button className="button button-small blk-done" onMouseDown={(e) => e.preventDefault()} onClick={() => void finishEdit(true)}>
              Готово
            </button>
          </>
        ) : (
          text && (
            <div
              className="blk-text"
              role="button"
              tabIndex={0}
              title="Изменить"
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest("a, .blk-more")) startEdit();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target === e.currentTarget) startEdit();
              }}
            >
              {title && <h3 className="blk-title">{title.replace(/^#{1,2}\s+/, "")}</h3>}
              {body && (
                <div className="blk-content">
                  <RichText text={body} limit={isLong && !expanded ? COLLAPSED_ELEMENTS : undefined} />
                </div>
              )}
              {isLong && (
                <button
                  className="blk-more"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                >
                  {expanded ? "Свернуть" : "Развернуть"}
                </button>
              )}
            </div>
          )
        )}

        {item.file &&
          (isImage ? (
            <a href={url} target="_blank" rel="noopener" className="item-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={item.file.name} loading="lazy" />
            </a>
          ) : (
            <a href={url} download className="item-file">
              {item.file.name} <span className="muted small">· {formatSize(item.file.size)}</span>
            </a>
          ))}
      </div>

      <div className="task-meta blk-meta">
        <span className="meta-date">{formatDue(localDay(item.createdAt))}</span>
        <button
          className="delete"
          aria-label={item.file ? "Удалить файл" : "Удалить блок"}
          title="Удалить"
          onClick={() => deleteItem(item)}
        >
          ×
        </button>
      </div>
    </li>
  );
}

