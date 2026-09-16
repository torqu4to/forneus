/**
 * Sign in, sign out, and knowing who is here.
 *
 * Thin on purpose: Supabase owns the OAuth dance and the token refresh. What
 * this adds is a shape the UI can consume without importing Supabase types
 * everywhere, and a hard rule that every failure is a translation key rather
 * than a provider error string shown to a player.
 *
 * Two rules earned the hard way, both about trusting the right source:
 *
 *   * Being signed in is decided by the SERVER, never by what is in the
 *     browser's storage. `onAuthStateChange` hands us a session read straight
 *     out of `localStorage`, so anyone can forge one by typing a key into the
 *     console and the UI would happily draw them as signed in. It reveals
 *     nothing — Row Level Security rejects the forged token at the database —
 *     but an interface that lies about who you are is its own bug. So every
 *     event that claims a session is re-checked with `getUser()`.
 *
 *   * The listener is attached ONCE, at the moment the client is created, and
 *     the state is reconciled right after. Supabase is loaded on demand now,
 *     and events fired during that download would otherwise land with nobody
 *     listening — which is how "Sair" used to need a page refresh.
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

const listeners = new Set<(account: Account | null) => void>();
let hubStarted = false;

/** Last state we told listeners about, so we don't redraw for no reason. */
let known: Account | null = null;
let knownSet = false;

function publish(account: Account | null): void {
  if (knownSet && known?.id === account?.id) return;
  known = account;
  knownSet = true;
  for (const listener of listeners) listener(account);
}

/**
 * One Supabase subscription for the whole page, attached the first time
 * anybody cares. Several components listen; they must not each create a
 * client and a subscription of their own.
 */
async function startHub(): Promise<void> {
  if (hubStarted) return;
  hubStarted = true;

  if (!hasSessionHint()) {
    publish(null);
    return;
  }

  const supabase = await getSupabase();
  if (!supabase) {
    publish(null);
    return;
  }

  supabase.auth.onAuthStateChange((event) => {
    // Signing out needs no confirmation from anyone; believe it at once so
    // the header updates the instant the button is pressed.
    if (event === 'SIGNED_OUT') {
      publish(null);
      return;
    }
    // Every other event carries a session read from storage. Ask the server
    // who that actually is before drawing anyone as signed in.
    void currentAccount().then(publish);
  });

  // Reconcile: the subscription above may have missed events fired while the
  // client was still downloading, and `onAuthStateChange` replays only what
  // it knows. One authoritative check settles it either way.
  publish(await currentAccount());
}

/** Fires whenever the session changes, including token refreshes. */
export function onAccountChange(handler: (account: Account | null) => void): () => void {
  listeners.add(handler);
  // A listener added after the hub settled would otherwise wait for the next
  // event to learn anything.
  if (knownSet) handler(known);
  void startHub();
  return () => { listeners.delete(handler); };
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
  // Do not wait for the event: the button was just pressed, and the UI should
  // answer to that, not to a round trip.
  publish(null);
}
