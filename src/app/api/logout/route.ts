import { logOut } from "@/lib/auth";
import { authorize, json } from "@/lib/api";

export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;
  await logOut();
  return json({ ok: true });
}
