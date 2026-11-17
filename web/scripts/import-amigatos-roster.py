"""Import named Catpals and portraits with exact CTable sprite-name matches."""
import argparse
import csv
import hashlib
import json
import shutil
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('ctable', type=Path)
    parser.add_argument('textures', type=Path)
    args = parser.parse_args()
    manifest_path = args.textures / 'manifest.csv'
    data = json.loads(args.ctable.read_text(encoding='utf-8'))
    items = data['layers'][0]['tables']['data.config.item']['map']
    cats = [entry['map'] for entry in items.values()
            if entry['map'].get('sub_type_name') == 'cat_item' and entry['map']['id'] < 10000000]
    matches: dict[str, list[dict[str, str]]] = {}
    with manifest_path.open(encoding='utf-8-sig', newline='') as stream:
        for row in csv.DictReader(stream):
            if row['object_type'] == 'Sprite':
                matches.setdefault(row['asset_name'], []).append(row)

    output_dir = Path(__file__).resolve().parents[1] / 'public/assets/amigatos'
    portrait_dir = output_dir / 'portraits'
    portrait_dir.mkdir(parents=True, exist_ok=True)
    portraits = {}
    roster = []
    for cat in sorted(cats, key=lambda cat: (cat['name'].casefold(), cat['id'])):
        sprite = cat.get('spr_name', '')
        portrait = None
        candidates = sorted(matches.get(sprite, []), key=lambda row: (row['source_relative'], row['path_id']))
        if candidates:
            source = args.textures / candidates[0]['output_relative']
            if not source.is_file():
                raise FileNotFoundError(source)
            filename = f"{cat['id']}.png"
            shutil.copyfile(source, portrait_dir / filename)
            portrait = f'/assets/amigatos/portraits/{filename}'
            portraits[str(cat['id'])] = {
                'source_relative': candidates[0]['source_relative'],
                'path_id': candidates[0]['path_id'],
                'texture_path': candidates[0]['output_relative'],
                'sha256': sha256(source),
            }
        roster.append({
            'id': cat['id'], 'name': cat['name'], 'class': cat['class'],
            'quality': cat['quality'], 'cat_star_id': cat['cat_star_id'],
            'spr_name': sprite, 'portrait': portrait,
        })
    output = {
        'ctable_sha256': sha256(args.ctable),
        'ctable_layer_sha256': data['layers'][0]['sha256'],
        'manifest_sha256': sha256(manifest_path),
        'cats': roster,
        'portrait_sources': portraits,
    }
    target = Path(__file__).resolve().parents[1] / 'src/data/amigatos-roster.json'
    target.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'Imported {len(roster)} named Catpals; {len(portraits)} exact portraits.')


if __name__ == '__main__':
    main()
