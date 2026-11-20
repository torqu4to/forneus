# Floral guardian data

Source: https://flowerguard.online/ (community calculator).
The snapshot metadata (retrieval time and JSON SHA-256) is in `florais.json`.
The source provides `fg-data` and `fg-icons` JSON blocks in its public HTML.
The import script extracts only data and game icons; source application code and design are not bundled.
Game art remains the property of its respective rights holders; repository code licensing does not grant rights to third-party art/data.

The runtime catalog supplements the 15 imported guardians with Mangosteen (Mangostão), verified from in-game absorption panels.

15 imported guardians, 9 guardian slots and 52 Spiritus slots. Cultivation 1–13;
stars 1–6; Spiritus R1/R2, single/dual attributes, levels 0–9.
Star bonuses (primary/secondary) are 0/0, 0/1, 1/1, 1/1, 1/2, 2/2.
Cardinal directions open at cultivation 1; NW/NE/SW/SE at 3/5/7/9.
Skill points map to source thresholds, are capped by cultivation, then receive star bonuses.
Costs accumulate the upgrades from level 1 to the selected cultivation, separately for each tier.

The source clamps effective skill levels beyond its bonus table to the final known value.
Forneus matches this calculation but flags such rows and totals as provisional.
The optional recommendation uses up to 24 improving position swaps, preserving the placed inventory,
cultivation, stars and levels. It prioritizes one skill bonus; other bonuses may decrease.
It is a heuristic, not a globally optimal solver. Unknown target bonus levels are excluded.
Combat power and its conversion formula are absent from the imported source; no power estimate is shown.
No official API or in-game validation is claimed. Guardian names use user-provided Portuguese translations;
skill labels retain their original source names.

## Inventory planner

The inventory planner is separate from saved gardens and stored locally per physical/magic class.
It conservatively uses at most one guardian per species. Spiritus are grouped by attributes,
rarity and level with exact quantities. Importing a garden merges missing entries using maximum
counts, not additive counts, so repeated imports do not duplicate inventory.

Two heuristic results are produced: owned inventory and a hypothetical target with custom ceilings.
Default ceilings equal the inventory maxima and occupied-item counts, capped at 9 guardians/52 Spiritus;
empty inventory starts at cultivation/star 1, Spiritus level/count 0, one guardian and R1.
Manual ceilings persist until explicitly reset. They do not alter owned item levels.
The target may acquire species and items absent from inventory but respects cultivation, star,
Spiritus level, rarity and slot-count ceilings. Unknown target skill levels are excluded.
Search uses three deterministic starting layouts, greedy placement and up to five local
refinement passes including reserve substitutions. It is not an exact/global optimum solver.
The gap list consumes each owned Spiritus once, distinguishes same-type upgrades from acquisition,
and does not assume fusion, rarity conversion, upgrade costs, combat-power or Nurture formulas.

Refresh from a locally downloaded HTML snapshot:

```sh
node scripts/import-flowerguard.mjs /path/to/flowerguard-source.html
npm test
```

Review schema, icon rights and upstream changes before updating. Runtime calculations use
the local snapshot: player data is never submitted to the source website.
