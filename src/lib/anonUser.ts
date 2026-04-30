// Stable per-browser anonymous UUID, used as a stand-in user_id until auth ships.
const KEY = "anon_user_id";

export function getAnonUserId(): string {
  if (typeof window === "undefined") return "00000000-0000-0000-0000-000000000000";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto as any).randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`.replace(/[^0-9a-f]/gi, "0").padEnd(36, "0");
    localStorage.setItem(KEY, id);
  }
  return id;
}
