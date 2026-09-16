/**
 * Where profiles live.
 *
 * One interface, two implementations. The page never learns which one it is
 * talking to, so signing in changes where profiles are stored without
 * changing a line of the UI — and signing out falls back to the browser
 * instead of losing everything.
 *
 * Every method is async even though the local one never awaits anything:
 * a synchronous interface would have to be rewritten the day Supabase
 * arrives, and every caller with it.
 */
import { isProfile, type Profile } from './types.ts';

export interface ProfileStore {
  /** Newest first. Never throws on corrupt storage — it drops what it cannot read. */
  list(): Promise<Profile[]>;
  get(id: string): Promise<Profile | null>;
  /** Insert or replace by id, stamping `updated_at`. Returns what was stored. */
  save(profile: Profile): Promise<Profile>;
  remove(id: string): Promise<void>;
}

/** Bumped only when the stored shape changes incompatibly. */
export const STORAGE_KEY = 'forneus:profiles:v1';

export class LocalProfileStore implements ProfileStore {
  #storage: Storage | null;

  constructor(storage: Storage | null = safeLocalStorage()) {
    this.#storage = storage;
  }

  async list(): Promise<Profile[]> {
    return this.#read().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async get(id: string): Promise<Profile | null> {
    return this.#read().find((profile) => profile.id === id) ?? null;
  }

  async save(profile: Profile): Promise<Profile> {
    const stored: Profile = { ...profile, updated_at: new Date().toISOString() };
    const profiles = this.#read().filter((existing) => existing.id !== stored.id);
    profiles.push(stored);
    this.#write(profiles);
    return stored;
  }

  async remove(id: string): Promise<void> {
    this.#write(this.#read().filter((profile) => profile.id !== id));
  }

  #read(): Profile[] {
    if (!this.#storage) return [];
    let parsed: unknown;
    try {
      const raw = this.#storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      parsed = JSON.parse(raw);
    } catch {
      // Unparseable storage is treated as empty rather than fatal: a profile
      // is a convenience, and refusing to load the page over it would be a
      // worse outcome than losing it.
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isProfile);
  }

  #write(profiles: Profile[]): void {
    if (!this.#storage) return;
    try {
      this.#storage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch {
      // Private mode, or the quota is full. Nothing useful to do here; the
      // caller's in-memory copy still works for this session.
    }
  }
}

/** localStorage throws on access in some privacy modes — not just on write. */
function safeLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
