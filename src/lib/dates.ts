function localToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Разница в днях между датой YYYY-MM-DD и сегодняшним днём (в часовом поясе браузера). */
export function daysFromToday(iso: string) {
  return Math.round((parseDay(iso).getTime() - localToday().getTime()) / 86_400_000);
}

/** Метка времени ISO → день YYYY-MM-DD в часовом поясе браузера. */
export function localDay(timestamp: string) {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDue(iso: string) {
  const diff = daysFromToday(iso);
  if (diff === 0) return "сегодня";
  if (diff === 1) return "завтра";
  if (diff === -1) return "вчера";
  const date = parseDay(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date
    .toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" })
    .replace(/\.$/, "")
    .replace(" г", "");
}
