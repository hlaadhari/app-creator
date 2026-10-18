import type { Files } from "./exercises";

const key = (id: string) => `bacsti:${id}`;

export type Saved = { files: Files; best?: number | undefined; savedAt: number };

export function load(id: string): Saved | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(key(id)) || "null");
  } catch {
    return null;
  }
}

export function save(id: string, data: Saved) {
  localStorage.setItem(key(id), JSON.stringify(data));
}

export function clear(id: string) {
  localStorage.removeItem(key(id));
}
