import { todayIso } from "./dates";
import type { Day, Entry, Habit, HabitKind, InputType, Me, StatsResponse, Week } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let slowListener: ((slow: boolean) => void) | null = null;
/** Lets the UI say "waking up the server" when a free-tier backend is cold-starting. */
export function onSlowRequest(fn: (slow: boolean) => void) {
  slowListener = fn;
}
let inflight = 0;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  inflight++;
  const timer = setTimeout(() => slowListener?.(true), 3500);
  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
    if (res.status === 401 && !path.startsWith("/auth")) {
      if (typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
        location.href = "/login";
      }
      throw new ApiError(401, "Signed out");
    }
    if (!res.ok) {
      let msg = res.statusText || "Request failed";
      try {
        const j = await res.json();
        if (j?.error) msg = j.error;
      } catch {}
      throw new ApiError(res.status, msg);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(0, "Can't reach the server. Check your connection.");
  } finally {
    clearTimeout(timer);
    inflight--;
    if (inflight === 0) slowListener?.(false);
  }
}

const t = () => `today=${todayIso()}`;

export interface HabitInput {
  name?: string;
  alias?: string;
  kind?: HabitKind;
  inputType?: InputType;
  options?: string[];
  /** old label → new label; rewrites past entries so history follows a renamed option */
  optionRenames?: Record<string, string>;
  multiSelect?: boolean;
  weeklyTarget?: number;
  isPrivate?: boolean;
  color?: string;
  startDate?: string;
  archived?: boolean;
}

export interface LogPayload {
  value?: string | null;
  values?: string[];
  note?: string | null;
}

export const api = {
  register: (email: string, password: string) => request<Me>("POST", "/auth/register", { email, password }),
  login: (email: string, password: string) => request<Me>("POST", "/auth/login", { email, password }),
  logout: () => request<void>("POST", "/auth/logout"),

  me: () => request<Me>("GET", "/me"),
  settings: (s: Partial<Pick<Me, "weekStart" | "lockMinutes" | "discreetDefault">>) => request<Me>("PATCH", "/me/settings", s),
  setPin: (pin: string | null, password: string) => request<Me>("PUT", "/me/pin", { pin, password }),
  unlock: (pin: string) => request<{ ok: boolean }>("POST", "/me/unlock", { pin }),
  changePassword: (current: string, next: string) => request<void>("PUT", "/me/password", { current, next }),
  exportData: () => request<unknown>("GET", "/me/export"),
  importData: (payload: unknown) => request<{ habitsCreated: number; entriesImported: number; restDays: number }>("POST", `/me/import?${t()}`, payload),
  deleteAccount: (password: string) => request<void>("POST", "/me/delete", { password }),

  habits: () => request<Habit[]>("GET", "/habits"),
  createHabit: (h: HabitInput) => request<Habit>("POST", `/habits?${t()}`, h),
  updateHabit: (id: string, h: HabitInput) => request<Habit>("PATCH", `/habits/${id}`, h),
  reorderHabits: (ids: string[]) => request<void>("POST", "/habits/reorder", { ids }),
  deleteHabit: (id: string) => request<void>("DELETE", `/habits/${id}`),

  week: (date?: string) => request<Week>("GET", `/week?${t()}${date ? `&date=${date}` : ""}`),
  /** value: TEXT text; values: SELECT picks; note: CHECK/SELECT extra. Returns habit fields that logging can change. */
  log: (habitId: string, date: string, p: LogPayload) =>
    request<{ entry: Entry; options: string[]; startDate: string }>("PUT", "/entries", { habitId, date, ...p }),
  unlog: (habitId: string, date: string) => request<void>("DELETE", `/entries?habitId=${habitId}&date=${date}`),
  /** target null = back to the usual weekly target. Returns the week rescored. */
  setWeekTarget: (habitId: string, date: string, target: number | null) =>
    request<Week>("PUT", `/week-targets?${t()}`, { habitId, date, target }),
  setDay: (date: string, d: { restDay?: boolean; note?: string }) => request<Day>("PUT", `/days/${date}`, d),

  stats: (weeks: number) => request<StatsResponse>("GET", `/stats?weeks=${weeks}&${t()}`),
};
