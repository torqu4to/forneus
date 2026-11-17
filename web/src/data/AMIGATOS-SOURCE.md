# Amigatos progression snapshot

The browser data in `amigatos-progression.json` was generated from the local Portuguese CTable export dated **2026-10-14**. Regenerate it with:

```text
python web/scripts/import-amigatos-progression.py "<path to forneus-extract>"
```

The generator takes these files from that directory:

- `amigatos_progression_decoded_pt_2026-10-14.json`
- `amigatos_atlas_atributos_por_nivel.csv`
- `amigatos_atlas_atributos_catalogo.csv`

The output records each input SHA-256 plus the original `config_eu_pt.cw` and `patch_eu_pt.cw` SHA-256 values. It contains 2,068 cost rows, 198 star rows, 4,004 spirit rows and 408 Atlas attribute increments. We intentionally keep class, quality, step, item and attribute IDs. The UI never silently merges resources from different ranks.

The named collection in `amigatos-roster.json` is generated from `data.config.item` in `amigatos_ctable_todas_tabelas_pt_2026-10-14.json`. Regenerate it and the exact portrait copies with:

```text
python web/scripts/import-amigatos-roster.py "<path to CTable JSON>" "<path to unity_textures>"
```

The importer keeps 74 base `cat_item` rows (item IDs below 10,000,000) and excludes 26 temporary variants. Each row's name, `class`, `quality`, `cat_star_id` and `spr_name` come directly from the same item record. All 74 star IDs have progression rows. The portrait is assigned only when its `spr_name` exactly matches a Sprite name in `unity_textures/manifest.csv`; 29 of 74 have such a match. The JSON records source hashes and, for each portrait, source-relative asset path, Unity path ID and image hash. When there are duplicate sprite names, the first source-relative path and path ID in sorted order is chosen. A missing portrait is shown with the general cat-system icon and an explicit caption, never another Catpal's artwork.

Two awakening rows have independent screenshot checks: Flora (class 2, quality 7, step 15) requires 3,300 item 1202 and 13,500 item 1001; Sakurako (class 1, quality 7, step 12) requires 1,800 item 1027 and 8,000 item 1001. The checks are in `web/test/amigatos-progression.test.ts`. The CTable values describe the local client configuration and do not establish live server rules or a complete combat power formula.

The existing team optimizer still reads `src/forneus_core/data/amigatos/tables.json`, captured **2026-09-17**. Its five tier 6 power curves were not rebuilt from this export. The new progression view is a separate material lookup so results cannot be mistaken for the optimizer's single-resource model. The 30% and 60% assistance rates are also present in the extracted `cat_education_const.help_attr_rate` mapping for qualities 3/4/6 and 7, respectively.

Coverage audit for the broader requested per-character, every-level data is in [`docs/amigatos-cobertura-progressao.md`](../../../docs/amigatos-cobertura-progressao.md). The REA/CTable extraction includes individual base stats, practice/awakening, star bonuses, spirit levels and item costs, but does not yet establish each character's five attributes at every ordinary level across all tiers. Do not present those datasets as a complete per-level character roster or infer the missing curve from `per_add_zhanli` or two screenshots.

The ordinary enhancement cost schedule itself is contiguous for steps 1–159 in all 12 configured class/quality combinations, and maps to all 74 base roster items. The supplied Flora screenshot confirms step 1 means level 1→2: the visible cost (item 1201 × 1,960 and item 1001 × 3,000) matches `cat_develop_cost.develop_cost` for class 2, quality 7, level 1. It also shows Agility +63 for that one character and step. The table contains no attribute deltas, so the full per-level stat curve remains unverified.

## Curated visual asset

`web/public/assets/amigatos/game-cat.png` is the `system_icon_cat` Sprite (98×112) from `StreamingAssets/patches/aebad011228933f5.asset.j`, path ID `6880479597229403047`, exported at `unity_textures/ac8bc8fd1b49/6880479597229403047_Sprite_system_icon_cat.png`. SHA-256: `b7062f1c7d40087da3b2f734b09828f837aa1bd914eae874e718eea8681e752f`. The icon identifies the game system, not a particular Catpal or material. The collection panel also uses `catmain` (path ID `5182992000426462369`, 546×151) and `bgcatbody241206` (path ID `5214771785966963873`, 194×329), both from `StreamingAssets/patches/970231ce5aafafd1.patch.j`. The full extraction stays outside the web bundle.

The extraction's `unity_textures/summary.json` reports 29,391 images and 230 failed image objects. Its manifest contains duplicate names and source-relative paths; names alone are not safe IDs. Additional material icons should be imported only after an item-to-sprite match and visual review.
