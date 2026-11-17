import { parseGarden } from './florais.ts';
import type { Garden } from './florais.ts';

export interface SavedGarden { id: string; name: string; garden: Garden }
export interface GardenLibrary { version: 1; active: string; gardens: SavedGarden[] }
export function parseLibrary(value: unknown): GardenLibrary {
  const v = value as GardenLibrary;
  if (!v || v.version !== 1 || !Array.isArray(v.gardens) || !v.gardens.length || v.gardens.length > 100) throw new Error('Invalid library');
  const ids = new Set<string>();
  const gardens = v.gardens.map(g => {
    if (!g || typeof g.id !== 'string' || !g.id || ids.has(g.id) || typeof g.name !== 'string' || !g.name.trim() || g.name.length > 60) throw new Error('Invalid entry');
    ids.add(g.id); return { id: g.id, name: g.name.trim(), garden: parseGarden(g.garden) };
  });
  if (!ids.has(v.active)) throw new Error('Invalid active garden');
  return { version: 1, active: v.active, gardens };
}
export function encodeGarden(garden: Garden): string {
  return btoa(JSON.stringify(parseGarden(garden))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function decodeGarden(token: string): Garden {
  if (!token || token.length > 20000 || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error('Invalid link');
  return parseGarden(JSON.parse(atob(token.replaceAll('-', '+').replaceAll('_', '/'))));
}
