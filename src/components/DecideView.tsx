"use client";

import { useState } from "react";
import type { Assignee, Decision, Feature } from "@/lib/types";
import { LIMITS } from "@/lib/validate";
import { RichText } from "./RichText";
import { ReplyInput } from "./TaskReplies";
import { useWorkspace } from "./WorkspaceProvider";

const DECISIONS: { value: Decision; label: string }[] = [
  { value: "mvp", label: "В MVP" },
  { value: "later", label: "Позже" },
  { value: "no", label: "Не делаем" },
];

const GROUPS: { decision: Decision | null; title: string; empty?: string }[] = [
  { decision: null, title: "Обсуждаем", empty: "Всё решено. Новые идеи — в поле выше." },
  { decision: "mvp", title: "В первом MVP", empty: "Пока ничего не выбрано." },
  { decision: "later", title: "Позже" },
  { decision: "no", title: "Не делаем" },
];

/** Короткий итог по голосам, пока решения нет. */
function verdict(feature: Feature) {
  const { a, b } = feature.votes;
  if (!a || !b) return null;
  if (a === "yes" && b === "yes") return { text: "Оба за", tone: "yes" };
  if (a === "no" && b === "no") return { text: "Оба против", tone: "no" };
  return { text: "Мнения разошлись", tone: "split" };
}

function Votes({ feature }: { feature: Feature }) {
  const { state, updateFeature } = useWorkspace();
  const people: Assignee[] = ["a", "b"];
  return (
    <div className="votes">
      {people.map((who) => {
        const vote = feature.votes[who];
        const key = who === "a" ? "voteA" : "voteB";
        const name = state.people[who];
        return (
          <span key={who} className="vote">
            <span className="vote-name">{name}</span>
            <button
              className="vote-btn"
              aria-pressed={vote === "yes"}
              aria-label={`${name}: за`}
              title="За"
              onClick={() => updateFeature(feature.id, { [key]: vote === "yes" ? null : "yes" })}
            >
              👍
            </button>
            <button
              className="vote-btn"
              aria-pressed={vote === "no"}
              aria-label={`${name}: против`}
              title="Против"
              onClick={() => updateFeature(feature.id, { [key]: vote === "no" ? null : "no" })}
            >
              👎
            </button>
          </span>
        );
      })}
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const { updateFeature, deleteFeature } = useWorkspace();
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const summary = feature.decision ? null : verdict(feature);

  function finishTitle(input: HTMLInputElement, save: boolean) {
    const title = input.value.trim();
    if (save && title && title !== feature.title) updateFeature(feature.id, { title });
    setEditingTitle(false);
  }

  return (
    <li className="feature" data-decision={feature.decision ?? "open"} data-pending={feature.id < 0}>
      <div className="feature-head">
        {editingTitle ? (
          <input
            className="feature-title-edit"
            defaultValue={feature.title}
            maxLength={LIMITS.featureTitle}
            autoFocus
            enterKeyHint="done"
            aria-label="Название"
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") finishTitle(e.currentTarget, true);
              if (e.key === "Escape") finishTitle(e.currentTarget, false);
            }}
            onBlur={(e) => finishTitle(e.currentTarget, true)}
          />
        ) : (
          <span
            className="feature-title"
            role="button"
            tabIndex={0}
            title="Изменить"
            onClick={() => setEditingTitle(true)}
            onKeyDown={(e) => e.key === "Enter" && setEditingTitle(true)}
          >
            {feature.title}
          </span>
        )}
        {summary && (
          <span className="verdict" data-tone={summary.tone}>
            {summary.text}
          </span>
        )}
        <button className="delete" aria-label="Удалить кандидата" title="Удалить" onClick={() => deleteFeature(feature)}>
          ×
        </button>
      </div>

      {editingNote ? (
        <ReplyInput
          initial={feature.note}
          className="feature-note-input"
          label="Описание"
          placeholder="Что это, зачем, сколько займёт… Enter — сохранить"
          maxLength={LIMITS.featureNote}
          allowEmpty
          onSubmit={(note) => updateFeature(feature.id, { note })}
          onClose={() => setEditingNote(false)}
        />
      ) : feature.note ? (
        <div
          className="feature-note"
          role="button"
          tabIndex={0}
          title="Изменить описание"
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest("a")) setEditingNote(true);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.target === e.currentTarget && setEditingNote(true)}
        >
          <RichText text={feature.note} />
        </div>
      ) : (
        <button className="feature-note-add" onClick={() => setEditingNote(true)}>
          + описание
        </button>
      )}

      <div className="feature-foot">
        <Votes feature={feature} />
        <div className="decision" role="group" aria-label="Решение">
          {DECISIONS.map((d) => (
            <button
              key={d.value}
              aria-pressed={feature.decision === d.value}
              onClick={() => updateFeature(feature.id, { decision: feature.decision === d.value ? null : d.value })}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

/** «Решаем MVP»: кандидаты в первую версию, голоса обоих и общее решение. */
export function DecideView() {
  const { state, addFeature } = useWorkspace();
  const [draft, setDraft] = useState("");

  return (
    <div className="page">
      <h1>Решаем MVP</h1>
      <p className="lead muted">
        Предлагайте функции, голосуйте каждый за себя и вместе решайте, что войдёт в первую версию. Нажмите на решение
        ещё раз, чтобы вернуть кандидата в обсуждение.
      </p>

      <ul className="decide-summary">
        {GROUPS.map((g) => (
          <li key={g.title} data-decision={g.decision ?? "open"}>
            <span className="decide-count">{state.features.filter((f) => f.decision === g.decision).length}</span>
            {g.title}
          </li>
        ))}
      </ul>

      <input
        className="add-task feature-add"
        value={draft}
        maxLength={LIMITS.featureTitle}
        placeholder="Предложить функцию…"
        aria-label="Новый кандидат в MVP"
        enterKeyHint="done"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
          const title = draft.trim();
          if (title) addFeature(title);
          setDraft("");
        }}
      />

      {GROUPS.map((g) => {
        const features = state.features.filter((f) => f.decision === g.decision);
        if (features.length === 0 && !g.empty) return null;
        return (
          <section key={g.title} className="block">
            <h2>
              {g.title} <span className="count">{features.length}</span>
            </h2>
            {features.length === 0 ? (
              <p className="small muted">{g.empty}</p>
            ) : (
              <ul className="feature-list">
                {features.map((f) => (
                  <FeatureCard key={f.id} feature={f} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
