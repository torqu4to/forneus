/**
 * Profiles stored in the account.
 *
 * Implements the same `ProfileStore` interface as the local one, so the page
 * swaps between them without knowing which is which. Two rules kept
 * throughout:
 *
 *   * `user_id` is taken from the SESSION, never from the caller. A store
 *     that accepted a user id as an argument would be one typo away from
 *     writing into someone else's row — and Row Level Security would reject
 *     it, which is a server error rather than a bug caught here.
 *
 *   * a failed read returns empty and a failed write throws. Losing the list
 *     for a moment is survivable; pretending a save worked is not.
 */
import { getSupabase } from './client.ts';
import { isProfile, type Profile } from './types.ts';
import type { ProfileStore } from './store.ts';

const TABLE = 'profiles';

interface Row {
  id: string;
  name: string;
  catpals: unknown;
  updated_at: string;
}

function toProfile(row: Row): Profile | null {
  const candidate = {
    id: row.id,
    name: row.name ?? '',
    catpals: row.catpals ?? [],
    updated_at: row.updated_at,
  };
  // Rows may predate a shape change, or have been written by an older build.
  // Validate on the way in, exactly as the local store does.
  return isProfile(candidate) ? candidate : null;
}

export class SupabaseProfileStore implements ProfileStore {
  async list(): Promise<Profile[]> {
    const supabase = await getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from(TABLE)
      .select('id, name, catpals, updated_at')
      .order('updated_at', { ascending: false });

    if (error || !data) return [];
    return (data as Row[]).map(toProfile).filter((p): p is Profile => p !== null);
  }

  async get(id: string): Promise<Profile | null> {
    const supabase = await getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from(TABLE)
      .select('id, name, catpals, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return toProfile(data as Row);
  }

  async save(profile: Profile): Promise<Profile> {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('accounts unavailable');

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('not signed in');

    // upsert on (user_id, id) — the table's primary key. Saving an existing
    // profile updates it; a new one inserts. `updated_at` is deliberately not
    // sent: the database trigger stamps it, so a client cannot backdate a
    // profile to win a merge it should lose.
    const { data, error } = await supabase
      .from(TABLE)
      .upsert({
        user_id: auth.user.id,
        id: profile.id,
        name: profile.name,
        catpals: profile.catpals,
      }, { onConflict: 'user_id,id' })
      .select('id, name, catpals, updated_at')
      .single();

    if (error || !data) throw new Error(error?.message ?? 'save failed');

    const stored = toProfile(data as Row);
    if (!stored) throw new Error('the database returned a profile this build cannot read');
    return stored;
  }

  async remove(id: string): Promise<void> {
    const supabase = await getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}
