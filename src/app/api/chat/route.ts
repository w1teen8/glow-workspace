import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, HISTORY_LIMIT, buildSystemPrompt } from "@/lib/agent";
import { authorize, json, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { loadState } from "@/lib/state";
import type { ChatMessage } from "@/lib/types";
import { LIMITS, cleanText } from "@/lib/validate";

let anthropic: Anthropic | null = null;
function client() {
  anthropic ??= new Anthropic(); // ключ берётся из ANTHROPIC_API_KEY
  return anthropic;
}

export async function GET(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;
  const rows = await db()`
    SELECT id, role, content FROM (
      SELECT id, role, content FROM chat_messages ORDER BY id DESC LIMIT 200
    ) recent ORDER BY id
  `;
  return json(rows as ChatMessage[]);
}

/** Склеивает идущие подряд сообщения одной роли и убирает ответы модели в начале. */
function toApiMessages(rows: Pick<ChatMessage, "role" | "content">[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];
  for (const { role, content } of rows) {
    const last = messages.at(-1);
    if (!last && role === "assistant") continue;
    if (last?.role === role) last.content = `${last.content}\n\n${content}`;
    else messages.push({ role, content });
  }
  return messages;
}

export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;

  const body = await readJson(req);
  const content = cleanText(body?.content, LIMITS.chatMessage);
  if (!content) return json({ error: "empty message" }, 400);

  const sql = db();
  await sql`INSERT INTO chat_messages (role, content) VALUES ('user', ${content})`;
  const [state, history] = await Promise.all([
    loadState(),
    sql`
      SELECT role, content FROM (
        SELECT id, role, content FROM chat_messages ORDER BY id DESC LIMIT ${HISTORY_LIMIT}
      ) recent ORDER BY id
    `,
  ]);

  const stream = client().beta.messages.stream({
    model: AI_MODEL,
    max_tokens: 16000,
    system: buildSystemPrompt(state),
    messages: toApiMessages(history as ChatMessage[]),
    output_config: { effort: "medium" },
    cache_control: { type: "ephemeral" },
    // Если модель откажется отвечать, API сам повторит запрос на рекомендованной модели.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  const encoder = new TextEncoder();
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          // Браузер закрыл соединение — ответ всё равно дописываем и сохраняем.
        }
      };

      let answer = "";
      stream.on("text", (delta) => send(delta));
      try {
        const final = await stream.finalMessage();
        answer = final.content
          .flatMap((block) => (block.type === "text" ? [block.text] : []))
          .join("");
        if (final.stop_reason === "refusal") {
          answer = "Не могу ответить на этот запрос. Попробуй сформулировать иначе.";
        } else if (final.stop_reason === "max_tokens") {
          answer += "\n\n(Ответ получился слишком длинным и оборвался.)";
        }
      } catch (error) {
        console.error("chat failed", error);
        answer = "Не получилось получить ответ. Попробуй ещё раз через минуту.";
      }

      if (answer.trim()) {
        await sql`INSERT INTO chat_messages (role, content) VALUES ('assistant', ${answer})`;
      }
      try {
        controller.close();
      } catch {
        // уже закрыт
      }
    },
  });

  return new Response(body$, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
