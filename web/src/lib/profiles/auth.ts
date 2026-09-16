/**
 * Sign in, sign out, and knowing who is here.
 *
 * Thin on purpose: Supabase owns the OAuth dance and the token refresh. What
 * this adds is a shape the UI can consume without importing Supabase types
 * everywhere, and a hard rule that every failure is a translation key rather
 * than a provider error string shown to a player.
 */
import { getSupabase, accountsEnabled, hasSessionHint } from './client.ts';

export { accountsEnabled };

export type Provider = 'discord' | 'google';

export interface Account {
  id: string;
  email: string | null;
  /** Display name from the provider, falling back to the email's local part. */
  name: string;
  avatarUrl: string | null;
}

function toAccount(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Account {
  const meta = user.user_metadata ?? {};
  const name = (meta.full_name ?? meta.name ?? meta.user_name) as string | undefined;
  return {
    id: user.id,
    email: user.email ?? null,
    name: name?.trim() || user.email?.split('@')[0] || '—',
    avatarUrl: (meta.avatar_url as string | undefined) ?? null,
  };
}

export async function currentAccount(): Promise<Account | null> {
  // Answered without loading Supabase when nobody is signed in — see
  // `hasSessionHint()`. This is what keeps the 215 KB client off the pages of
  // everyone who is just using the calculator.
  if (!hasSessionHint()) return null;
  const supabase = await getSupabase();
  if (!supabase) return null;
  // getUser() revalidates against the server; getSession() would trust
  // whatever is in storage, which is exactly what you do not want deciding
  // whether someone is signed in.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return toAccount(data.user);
}

/**
 * Fires whenever the session changes, including token refreshes.
 *
 * Subscribing is deferred: with no session hint there is nothing to listen
 * to, so we do not pay for the client. Signing in navigates away and the new
 * page subscribes with a hint in hand, so nothing is missed.
 *
 * Returns synchronously so callers stay simple; unsubscribing before the
 * client has loaded cancels the subscription that was on its way.
 */
export function onAccountChange(handler: (account: Account | null) => void): () => void {
  let unsubscribe = () => {};
  let cancelled = false;

  void (async () => {
    if (!hasSessionHint()) return;
    const supabase = await getSupabase();
    if (!supabase || cancelled) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      handler(session?.user ? toAccount(session.user) : null);
    });
    unsubscribe = () => data.subscription.unsubscribe();
  })();

  return () => { cancelled = true; unsubscribe(); };
}

export async function signInWith(provider: Provider, returnTo: string):
  Promise<{ ok: true } | { ok: false; key: string }> {
  // No hint check here: signing in is exactly the moment there is no session
  // yet, and the person asked for this, so the chunk is worth fetching.
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, key: 'error.accounts.unavailable' };

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      // Absolute URL against the current origin, so the same code works on
      // localhost, on workers.dev and on the real domain without a build-time
      // constant that would be wrong in two of the three.
      redirectTo: new URL(returnTo, globalThis.location.origin).href,
    },
  });
  return error ? { ok: false, key: 'error.signin.failed' } : { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  await supabase?.auth.signOut();
}
