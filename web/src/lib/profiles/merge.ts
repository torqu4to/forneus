/**
 * Merging the browser's profiles into an account.
 *
 * This runs once, on first sign-in, and it is the step most likely to lose
 * someone's data if it is careless — so it never deletes and never silently
 * overwrites. The rules:
 *
 *   * a profile that exists only locally is uploaded;
 *   * a profile that exists only remotely is kept as is;
 *   * the same id in both places keeps the NEWER `updated_at`, and the older
 *     one is reported as a conflict so the UI can say what happened.
 *
 * Returning the decisions instead of applying them keeps this pure and
 * testable; the caller performs the writes.
 */
import type { Profile } from './types.ts';

export interface MergePlan {
  /** Local profiles to write to the account. */
  upload: Profile[];
  /** Remote profiles that win over an older local copy. */
  keepRemote: Profile[];
  /** Same id in both, resolved by date — surfaced so the user is told. */
  conflicts: { id: string; winner: 'local' | 'remote'; name: string }[];
}

export function planMerge(local: Profile[], remote: Profile[]): MergePlan {
  const remoteById = new Map(remote.map((profile) => [profile.id, profile]));
  const plan: MergePlan = { upload: [], keepRemote: [], conflicts: [] };

  for (const profile of local) {
    const counterpart = remoteById.get(profile.id);
    if (!counterpart) {
      plan.upload.push(profile);
      continue;
    }
    // localeCompare on ISO 8601 orders correctly and avoids Date parsing.
    const localWins = profile.updated_at.localeCompare(counterpart.updated_at) > 0;
    plan.conflicts.push({
      id: profile.id,
      winner: localWins ? 'local' : 'remote',
      name: localWins ? profile.name : counterpart.name,
    });
    if (localWins) plan.upload.push(profile);
    else plan.keepRemote.push(counterpart);
  }

  for (const profile of remote) {
    if (!local.some((candidate) => candidate.id === profile.id)) {
      plan.keepRemote.push(profile);
    }
  }

  return plan;
}
