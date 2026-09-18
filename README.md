# Forneus

Optimization tools for **Tree of Savior Neo**, built as a hub rather than a
pile of one-off scripts. Live at [forneus.wiki](https://forneus.wiki).

| Tool | Status |
|---|---|
| Amigatos (catpal Fish Jelly allocation) | Available |
| Fantasmas (ghosts) | Planned |
| Guardiões Florais (floral guardians) | Planned |

## What this repository is

`forneus_core` is the shared Python core: the solvers, the game data and the
contract every tool speaks. It has no user interface of its own. The Astro
frontend and the FastAPI backend consume it.

```
src/forneus_core/
├── contract.py        # ToolResult, Notice, ToolSpec - the shape every tool speaks
├── registry.py        # the one list of tools the API and frontend read
├── dataio.py          # JSON dataset loading + validation
├── exports.py         # CSV/JSON, generic over ToolResult
├── i18n.py            # message catalogs and locale negotiation
├── data/              # game data as versioned JSON + schema
│   ├── _schema/tool_tables.schema.json
│   └── amigatos/tables.json
├── locales/           # pt-BR.json, en-US.json
├── tools/
│   └── amigatos/      # solver, profiles, CLI, tool.py (contract adapter)
└── web.py             # transitional Flask app - replaced in Phase 1
```

## The three rules

1. **Solvers are pure.** No printing, no I/O, no network. A solver takes data
   and returns a `ToolResult`.
2. **Game data is JSON, never Python.** A rebalance, a recapture or a new tier
   is an edit to `data/<tool>/tables.json`, guarded by the schema. CI validates
   every dataset on every pull request.
3. **No prose in Python.** Solvers and the API emit `Notice` objects carrying a
   translation key and its parameters. `forneus_core.i18n` resolves them per
   locale, so pt-BR and en-US are equal citizens rather than a translation
   bolted on afterwards.

## Adding a tool

1. Drop its dataset in `data/<tool>/tables.json`; the schema check runs in CI.
2. Add translation keys to `locales/pt-BR.json` and `locales/en-US.json`
   (a key missing from either catalog fails the test suite).
3. Write the solver under `tools/<tool>/`, returning a `ToolResult`.
4. Register a `ToolSpec` in `tools/<tool>/tool.py`.

CSV/JSON export, provenance, the API route and the "coming soon" card on the
landing page all follow from the registration. No serialization code needed.

## Amigatos: how to get your inputs from the game

This tool optimizes the jelly spent on catpals equipped in your **assist
slots**.

1. **Build your main team first.** Decide the lineup before spending jelly.
2. **Reset any catpal not in a main slot** - don't leave jelly invested in
   catpals that aren't equipped.
3. **Convert all of your jelly into r1 and r2** using the game's conversion.
4. **Enter your total r1 jelly amount.** The calculations always use the r1
   cost tables, even for r2 catpals.
5. **Check which catpals are in your assist slots** and enter the counts of
   Red, Gold and Purple - r1 or r2 alike - in the matching fields.

### Why it's a knapsack problem

Each catpal type has a table of levels whose listed cost is the cost **of that
bracket** (the marginal cost to reach that level), not a cumulative total, plus
an extra `"Max"` step beyond the last numbered level. Not all power counts
equally: Red catpals keep 60% of their table power as effective power, Purple
and Gold keep 30%.

Given N catpals and a jelly budget, you must decide *which level each catpal
stops at* to maximize total effective power without overspending - a
multiple-choice knapsack. It is solved exactly with dynamic programming, so the
result is optimal for the given data, not a greedy approximation.

### Known data limitations

- **All current categories use the maximum tier (6/6).** The dataset is still
  versioned and should be reviewed after future game rebalances.
- **Only Fish Jelly is modeled.** Silverleaf and Dried Fish costs are not
  considered anywhere. Treat results as jelly-optimal, not globally optimal.

Tier provenance lives in each category's `tier` field in the dataset.

## Development

```bash
pip install -e ".[dev]"
pytest
```

The transitional Flask interface (replaced in Phase 1) still runs locally:

```bash
pip install -e ".[web]"
python -m forneus_core.web        # http://127.0.0.1:5000
```

It binds to localhost with debug disabled and is for local use only. The public
frontend is deployed as static assets on Cloudflare Workers; the FastAPI app is
kept in the repository for future account-backed features and does not run in
the current free deployment.

The CLI is unchanged apart from its name:

```bash
forneus-amigatos --purple 5 --gold_r1 5 --gold_r2 4 --red_r1 1 --red_r2 1 --jelly 43671
forneus-amigatos                  # interactive
```

### Using the core as a library

```python
from forneus_core.tools.amigatos import solve
from forneus_core.exports import format_json

result = solve({"Purple": 5, "GoldR1": 5, "RedR1": 1}, total_jelly=43671)
print(result.totals["effective_power"])
print(format_json(result, "en-US"))
```

## Roadmap

- [x] Phase 0 - hub foundation: package rename, JSON game data, tool contract,
      translation keys
- [x] Phase 1 - Astro frontend, design system, bilingual landing page
- [x] Phase 2 - static production deploy on Cloudflare Workers
- [ ] Phase 3 - accounts (Discord, Google, e-mail) and saved profiles

### Launch priority - Amigatos

- [x] Complete and validate the Amigatos dataset at the maximum tier (6)
- [x] Add the "How to use" page for the Amigatos optimizer
- [x] Add team sharing by link
- [ ] Review bilingual copy and responsive behavior for the Amigatos flow
- [ ] Add and validate the Amigatos visual assets
- [ ] Model Silverleaf and Dried Fish costs (turns the solver into a
      multidimensional knapsack)

### Later tools

- [ ] Phase 4 - Fantasmas optimizer
- [ ] Phase 5 - Guardiões Florais
- [ ] Recapture Red r2 data at tier 6 of 6, if the data becomes available

## License

MIT - see `LICENSE`.
