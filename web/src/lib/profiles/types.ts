/**
 * What a saved team is.
 *
 * Shaped for two storage backends from the start: the browser today, a
 * Postgres row per profile tomorrow. That is why every profile carries its
 * own `id` and `updated_at` — without them, merging a browser's profiles into
 * an account on first sign-in has nothing to match or compare on.
 *
 * Field names are snake_case to match the solver's profile input and the
 * database columns, so a profile crosses all three layers unchanged.
 */
import type { Level } from '../solver/dataset.ts';

export interface SavedCatpal {
  /** Stable within a profile; how allocations are matched back to a catpal. */
  id: string;
  name: string;
  catpal_type: string;
  current_level: Level;
}

export interface Profile {
  id: string;
  name: string;
  catpals: SavedCatpal[];
  /** ISO 8601. Decides the winner when the same profile exists in two places. */
  updated_at: string;
}

export const PROFILE_NAME_MAX = 60;

export function newId(): string {
  // randomUUID needs a secure context; a plain http:// page in development
  // does not have one, and a profile id is not a security boundary.
  return globalThis.crypto?.randomUUID?.()
    ?? `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyProfile(name: string): Profile {
  return { id: newId(), name, catpals: [], updated_at: new Date().toISOString() };
}

/**
 * Accept a profile read back from storage, or reject it.
 *
 * Anything persisted is untrusted input: localStorage is editable by the
 * person, and a database row may have been written by an older version of
 * this code. A malformed profile is dropped, never repaired into something
 * that looks valid.
 */
export function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<Profile>;
  if (typeof profile.id !== 'string' || !profile.id) return false;
  if (typeof profile.name !== 'string') return false;
  if (typeof profile.updated_at !== 'string') return false;
  if (!Array.isArray(profile.catpals)) return false;

  const ids = new Set<string>();
  for (const catpal of profile.catpals) {
    if (!catpal || typeof catpal !== 'object') return false;
    const entry = catpal as Partial<SavedCatpal>;
    if (typeof entry.id !== 'string' || !entry.id) return false;
    if (typeof entry.name !== 'string') return false;
    if (typeof entry.catpal_type !== 'string') return false;
    if (typeof entry.current_level !== 'number' && entry.current_level !== 'Max') return false;
    if (ids.has(entry.id)) return false;
    ids.add(entry.id);
  }
  return true;
}
