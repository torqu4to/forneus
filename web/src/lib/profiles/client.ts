/**
 * The Supabase client, created once, only if configured, and only on demand.
 *
 * Accounts are an ENHANCEMENT here, never a requirement. If the environment
 * variables are absent — a fork, a preview build, someone running the site
 * without a Supabase project — `getSupabase()` resolves to null and the whole
 * site keeps working against localStorage. Nothing in the UI may assume a
 * client exists.
 *
 * The import is dynamic on purpose. `@supabase/supabase-js` is ~215 KB, and a
 * static import put it in the header bundle of EVERY page — including the
 * calculator, which needs none of it. Dynamic means the bundler emits it as
 * its own chunk, fetched only when something actually asks for a client.
 * Combined with `hasSessionHint()` below, a signed-out visitor never
 * downloads it at all.
 *
 * The anon key belongs in the browser bundle: it identifies the project and
 * authorizes nothing on its own. What protects one player's teams from
 * another is Row Level Security in `supabase/001_profiles.sql`. If that file
 * was never run, this key is a master key — the policies are the security
 * boundary, not the key.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.PUBLIC_SUPABASE_URL;
const ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/** Whether accounts are available at all in this build. */
export const accountsEnabled = Boolean(URL && ANON_KEY);

let pending: Promise<SupabaseClient | null> | null = null;

export function getSupabase(): Promise<SupabaseClient | null> {
  // Cache the PROMISE, not the client: two callers racing on first load must
  // share one client, or each gets its own auth listener and token refresh.
  pending ??= create();
  return pending;
}

async function create(): Promise<SupabaseClient | null> {
  if (!URL || !ANON_KEY) return null;

  const { createClient } = await import('@supabase/supabase-js');
  return createClient(URL, ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // The OAuth providers redirect back with the session in the URL; this
      // reads it and then the callback page cleans the address bar.
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
}

/**
 * Whether it is worth loading Supabase at all to ask who is here.
 *
 * Supabase persists its session under a `sb-<ref>-auth-token` key. No such
 * key and no OAuth redirect in the address bar means nobody is signed in,
 * which we can answer for free — no chunk fetched, no request made. This is a
 * HINT, never an authorization: a forged key gets you a client that then
 * fails `getUser()` against the server.
 */
export function hasSessionHint(): boolean {
  if (!accountsEnabled) return false;

  try {
    const { search, hash } = globalThis.location ?? { search: '', hash: '' };
    // Coming back from a provider, the session is in the URL and not yet in
    // storage — so the redirect itself is a hint.
    if (search.includes('code=') || hash.includes('access_token=')) return true;
  } catch { /* no location: server render, or a sandbox */ }

  try {
    const storage = globalThis.localStorage;
    if (!storage) return false;
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) return true;
    }
  } catch { /* private mode: treat as signed out, the site still works */ }

  return false;
}
