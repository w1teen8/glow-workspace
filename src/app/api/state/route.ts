import { authorize, json } from "@/lib/api";
import { loadState } from "@/lib/state";

export async function GET(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;
  return json(await loadState());
}
