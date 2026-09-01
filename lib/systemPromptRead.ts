// 系统提示（全局公告）已读状态：纯前端 localStorage（接口无已读概念，公告场景可接受换设备重显）。
// key = read_system_prompts，value = { [owner]: number[] }（公告 id 数组）；
// owner = 已登录用 userId、未登录用 "anon"。已读时机 = 点 X 关闭横幅；
// 登录时把 anon 已读合并进账号（见 components/UserBootstrap.tsx）。

const KEY = "read_system_prompts";
/** 未登录身份的 owner key。 */
export const ANON_OWNER = "anon";

type ReadMap = Record<string, number[]>;

function read(): ReadMap {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ReadMap;
    return {};
  } catch {
    return {};
  }
}

function write(map: ReadMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(map));
}

/** 某身份已读过的公告 id 列表。 */
export function getReadIds(owner: string): number[] {
  return read()[owner] ?? [];
}

/** 标记一条公告为已读（去重追加）。 */
export function markRead(owner: string, id: number): void {
  const map = read();
  const ids = map[owner] ?? [];
  if (!ids.includes(id)) {
    map[owner] = [...ids, id];
    write(map);
  }
}

/** 登录时调用：把匿名身份的已读合并进账号，并清掉匿名记录（幂等）。 */
export function mergeAnonInto(userId: string): void {
  const map = read();
  const anon = map[ANON_OWNER];
  if (!anon || anon.length === 0) return;
  map[userId] = [...new Set([...(map[userId] ?? []), ...anon])];
  delete map[ANON_OWNER];
  write(map);
}

/**
 * 拉到活跃公告列表后调用：清掉所有身份名下已不在活跃列表里的已读 id
 * （已过期/被删除的公告），防止 localStorage 越存越多。仅在接口成功返回后调用。
 */
export function pruneReadIds(activeIds: number[]): void {
  const map = read();
  const active = new Set(activeIds);
  let changed = false;
  for (const owner of Object.keys(map)) {
    const kept = map[owner].filter((id) => active.has(id));
    if (kept.length !== map[owner].length) {
      changed = true;
      if (kept.length > 0) map[owner] = kept;
      else delete map[owner];
    }
  }
  if (changed) write(map);
}
