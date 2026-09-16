/**
 * Where profiles come from, and what happens when that changes.
 *
 * The page asks this module for profiles and never learns whether they came
 * from the browser or the account. Signing in swaps the backing store and
 * merges what was local; signing out swaps back, leaving the local copies
 * intact — someone who signs out should not watch their teams disappear.
 *
 * The merge runs ONCE per account per browser. Repeating it would resurrect
 * profiles the person deleted from their account, which is the kind of bug
 * that makes people stop trusting a sync feature.
 */
import { LocalProfileStore } from './store.ts';
import { SupabaseProfileStore } from './supabase-store.ts';
import { planMerge, type MergePlan } from './merge.ts';
import type { ProfileStore } from './store.ts';
import type { Profile } from './types.ts';
import { accountsEnabled, currentAccount, onAccountChange, type Account } from './auth.ts';

const MERGED_KEY = 'forneus:merged-accounts:v1';

export interface ProfilesState {
  account: Account | null;
  profiles: Profile[];
  /** True while a sign-in merge is running, so the UI can say so. */
  syncing: boolean;
  /** Set once after a merge, for a one-time message. */
  lastMerge: MergePlan | null;
}

export class ProfileManager {
  #local = new LocalProfileStore();
  #remote = new SupabaseProfileStore();
  #state: ProfilesState = { account: null, profiles: [], syncing: false, lastMerge: null };
  #listeners = new Set<(state: ProfilesState) => void>();
  #unsubscribe: (() => void) | null = null;

  get state(): ProfilesState {
    return this.#state;
  }

  /** The store matching the current session. */
  get store(): ProfileStore {
    return this.#state.account ? this.#remote : this.#local;
  }

  subscribe(listener: (state: ProfilesState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  #emit(patch: Partial<ProfilesState>): void {
    this.#state = { ...this.#state, ...patch };
    for (const listener of this.#listeners) listener(this.#state);
  }

  async start(): Promise<void> {
    // Show whatever is in the browser immediately. Waiting on the network to
    // render a list that is already on disk makes the page feel broken on a
    // slow connection.
    this.#emit({ profiles: await this.#local.list() });

    if (!accountsEnabled) return;

    const account = await currentAccount();
    if (account) await this.#adopt(account);

    this.#unsubscribe = onAccountChange((next) => {
      if (next?.id === this.#state.account?.id) return;
      void (next ? this.#adopt(next) : this.#release());
    });
  }

  stop(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#listeners.clear();
  }

  async #adopt(account: Account): Promise<void> {
    this.#emit({ account, syncing: true });

    let lastMerge: MergePlan | null = null;
    try {
      if (!this.#hasMerged(account.id)) {
        const [local, remote] = await Promise.all([
          this.#local.list(), this.#remote.list(),
        ]);
        const plan = planMerge(local, remote);

        // Sequential on purpose: a burst of parallel writes against a free
        // tier is how you meet a rate limit halfway through a merge, with no
        // way to tell what landed.
        for (const profile of plan.upload) await this.#remote.save(profile);

        this.#markMerged(account.id);
        lastMerge = plan;
      }
      this.#emit({ profiles: await this.#remote.list(), syncing: false, lastMerge });
    } catch {
      // The account is unreachable — a paused free project, an offline
      // browser. Fall back to local rather than showing an empty list, and
      // do NOT mark the merge as done, so it runs when the account returns.
      this.#emit({ profiles: await this.#local.list(), syncing: false });
    }
  }

  async #release(): Promise<void> {
    this.#emit({ account: null, profiles: await this.#local.list(), lastMerge: null });
  }

  async save(profile: Profile): Promise<Profile> {
    const stored = await this.store.save(profile);
    // Signed in, also keep a local copy: it is what the page shows instantly
    // on the next visit, and what survives if the account is unreachable.
    if (this.#state.account) await this.#local.save(stored);
    this.#emit({ profiles: await this.store.list() });
    return stored;
  }

  async remove(id: string): Promise<void> {
    await this.store.remove(id);
    if (this.#state.account) await this.#local.remove(id);
    this.#emit({ profiles: await this.store.list() });
  }

  #hasMerged(accountId: string): boolean {
    return this.#mergedAccounts().includes(accountId);
  }

  #markMerged(accountId: string): void {
    const merged = new Set(this.#mergedAccounts());
    merged.add(accountId);
    try {
      globalThis.localStorage?.setItem(MERGED_KEY, JSON.stringify([...merged]));
    } catch { /* private mode: the merge simply runs again next time */ }
  }

  #mergedAccounts(): string[] {
    try {
      const raw = globalThis.localStorage?.getItem(MERGED_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
}
