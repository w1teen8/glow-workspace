"use client";

import { useRef, useState } from "react";
import { formatDue, localDay } from "@/lib/dates";
import { formatSize, shrinkImage } from "@/lib/images";
import type { SectionSlug } from "@/lib/sections";
import type { Item } from "@/lib/types";
import { INLINE_MIME, LIMITS } from "@/lib/validate";
import { useWorkspace } from "./WorkspaceProvider";

export function Materials({ section }: { section: SectionSlug }) {
  const { state, addItem, notify } = useWorkspace();
  const items = state.items.filter((i) => i.section === section);

  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState<{ key: number; name: string }[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadKey = useRef(0);

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

  async function submitText() {
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
      <h2>Материалы</h2>

      {(items.length > 0 || uploading.length > 0) && (
        <ul className="items">
          {items.map((item) => (
            <ItemView key={item.id} item={item} />
          ))}
          {uploading.map((u) => (
            <li key={`up-${u.key}`} className="item muted small">
              Загружаю «{u.name}»…
            </li>
          ))}
        </ul>
      )}

      <div className="item-composer">
        <textarea
          rows={1}
          value={draft}
          maxLength={LIMITS.itemText}
          placeholder="Текст, ссылка или фото…"
          aria-label="Новый материал"
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight + 2}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submitText();
            }
          }}
          onPaste={(e) => {
            const files = [...e.clipboardData.files];
            if (!files.length) return;
            e.preventDefault();
            void upload(files);
          }}
        />
        <button className="attach" onClick={() => fileInput.current?.click()}>
          Прикрепить
        </button>
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

function ItemView({ item }: { item: Item }) {
  const { deleteItem } = useWorkspace();
  const url = `/api/files/${item.id}`;
  const isImage = item.file !== null && INLINE_MIME.includes(item.file.mime);

  return (
    <li className="item">
      <div className="item-body">
        {item.text && <p className="item-text">{linkify(item.text)}</p>}
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
      <div className="task-meta">
        <span className="meta-date">{formatDue(localDay(item.createdAt))}</span>
        <button
          className="delete"
          aria-label={item.file ? "Удалить файл" : "Удалить запись"}
          title="Удалить"
          onClick={() => deleteItem(item)}
        >
          ×
        </button>
      </div>
    </li>
  );
}

const URL_RE = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]])/g;

function linkify(text: string) {
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="link">
        {part}
      </a>
    ) : (
      part
    ),
  );
}
