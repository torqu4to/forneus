"""Build the small, auditable browser snapshot from the local CTable export.

Usage: python web/scripts/import-amigatos-progression.py <forneus-extract directory>
The source directory is deliberately an argument; no developer-specific path is
required to reproduce the committed snapshot.
"""

import csv
import hashlib
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/data/amigatos-progression.json"
SOURCE_NAMES = (
    "amigatos_progression_decoded_pt_2026-10-14.json",
    "amigatos_atlas_atributos_por_nivel.csv",
    "amigatos_atlas_atributos_catalogo.csv",
)


def csv_rows(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def main(source: Path):
    source_files = {name: source / name for name in SOURCE_NAMES}
    for path in source_files.values():
        if not path.is_file():
            raise SystemExit(f"Missing source file: {path}")

    raw = json.loads(source_files[SOURCE_NAMES[0]].read_text(encoding="utf-8"))
    labels = {
        int(row["attribute_id"]): row["attribute_name_pt"]
        for row in csv_rows(source_files[SOURCE_NAMES[2]])
    }
    items = {
        int(item_id): details["name"]
        for item_id, details in raw["items_used_by_progression"].items()
    }
    # Tuples reduce the browser payload; field order is decoded in the TS module.
    cost_rows = [
        [row["system"], row["class"], row["quality"], row["step"], row["role_level"],
         row["frag_consume"], [[material["item_id"], material["amount"]] for material in row["materials"]]]
        for row in raw["cost_rows"]
    ]
    star_rows = [
        [row["cat_star_id"], row["star"], row["max_star"], row["skill_level"],
         row["core_score"], row["help_score"], [[attr["id"], attr["value"]] for attr in row["attrs"]]]
        for row in raw["cat_star_up_rows"]
    ]
    spirit_rows = [
        [row["quality"], row["level"], row["player_level"], row["exp"],
         [[int(key), value] for key, value in json.loads(row["attrs_json"]).items()]]
        for row in raw["spirit_level_rows"]
    ]
    atlas_rows = [
        [int(row["level"]), int(row["exp"]), int(row["attribute_id"]), float(row["amount"])]
        for row in csv_rows(source_files[SOURCE_NAMES[1]])
    ]
    # Keep integer attributes as integers in JSON; percentages remain floats.
    for row in atlas_rows:
        if row[3].is_integer():
            row[3] = int(row[3])

    document = {
        "snapshot_date": "2026-10-14",
        "locale": "pt-BR",
        "config_sha256": raw["source_sha256"],
        "patch_sha256": raw["overlay_patch_sha256"],
        "sources": {
            name: hashlib.sha256(path.read_bytes()).hexdigest()
            for name, path in source_files.items()
        },
        "items": items,
        "attributes": labels,
        "cost_rows": cost_rows,
        "star_rows": star_rows,
        "spirit_rows": spirit_rows,
        "atlas_rows": atlas_rows,
    }
    assert len(cost_rows) == 2068 and len(star_rows) == 198 and len(spirit_rows) == 4004
    OUTPUT.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(Path(sys.argv[1]))
