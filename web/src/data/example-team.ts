/**
 * The team the site shows before the visitor calculates their own.
 *
 * The pages call the solver with this at BUILD time, so the example result is
 * always the current solver's current answer. It used to be a checked-in file
 * of numbers, which could quietly go stale the moment a table changed — now
 * there is nothing to keep in sync.
 */
export const EXAMPLE_TEAM: Record<string, number> = {
  RedR2: 1, RedR1: 1, GoldR2: 4, GoldR1: 5, Purple: 5,
};

export const EXAMPLE_BUDGET = 43671;
