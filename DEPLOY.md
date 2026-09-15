# Deploy

The site is **static**: a folder of files, no server, no database, no
scheduled jobs. The optimizer runs in the visitor's browser.

That is not a shortcut — it is the measured consequence of the solver's cost.
The worst case reachable by ANY input is bounded by the game data (~0.8 s in
the browser, ~0.9 s in Python), because above the cost of maxing every catpal
the optimizer short-circuits instead of building arrays. A budget of nine
quadrillion returns instantly. With nothing to protect and nothing to scale,
a server would only add a bill, a cold start and an outage mode.

## Cloudflare Pages

1. Create a project → Connect to Git → `torqu4to/forneus`.
2. Framework preset: **Astro**.
3. **Root directory: `web`** — but the repository is cloned whole, which
   matters: the browser solver imports the game tables from
   `src/forneus_core/data/amigatos/tables.json`, outside `web/`. Setting the
   root to `web` only changes where the build command runs.
4. Build command: `npm run build` · Output directory: `dist`.
5. No environment variables are needed.

`web/public/_headers` ships the security and caching headers; Cloudflare
applies it automatically.

### Custom domain

Add `forneus.wiki` in the project's Custom domains tab. Cloudflare issues the
certificate. There is no CORS to configure — nothing is called
cross-origin any more.

## Checking a deploy

```bash
curl -sI https://forneus.wiki/pt/ | grep -i content-security-policy
```

Then open `/pt/ferramentas/amigatos/`, change the quantities and calculate.
If the numbers move, everything works — there is no backend that could be
down.

## Rollback

Cloudflare keeps every deployment. Pages → Deployments → "Rollback to this
deployment". Instant, because it is just files.

## What is NOT deployed, and why it is still in the repository

`src/forneus_core/api/` — the FastAPI application, with its tests, Dockerfile
and `railway.toml`. Nothing today needs it, and deploying it would cost money
for no gain. It stays because **Phase 3 (accounts) does need a server side**,
and because it is the reference implementation's HTTP surface.

For accounts the current plan is Supabase (Postgres, plus Discord, Google and
e-mail auth on the free tier) rather than reviving this API — decide that when
Phase 3 starts, not now. Note that a free Supabase project **pauses after a
week of inactivity**, which matters for a small community and does not apply
to the static site.

## The solver exists twice — keep it that way honestly

`forneus_core` (Python) is the reference implementation: it has the CLI, the
data loader, the schema checks. `web/src/lib/solver/` is the port that runs in
the browser. They read the SAME `tables.json`; only the algorithm is written
twice.

`scripts/generate_fixtures.py` writes `web/test/fixtures.json` from the Python
implementation, and `npm test` asserts the TypeScript reproduces all 68 cases.
**Run both after touching either solver:**

```bash
python scripts/generate_fixtures.py   # regenerate the oracle
cd web && npm test                    # 85 tests
cd .. && pytest -q                    # 129 tests
```

A change to one solver that is not mirrored in the other fails `npm test`.
That is the whole safety net; do not let it rot.
