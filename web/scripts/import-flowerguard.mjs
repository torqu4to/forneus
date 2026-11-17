// Import published JSON tables and game icons; never execute source scripts.
// Usage: node scripts/import-flowerguard.mjs /path/to/downloaded-page.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const html = readFileSync(process.argv[2], 'utf8');
const read = (id) => {
  const match = html.match(new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)</script>`));
  if (!match) throw new Error(`Missing ${id}`);
  return JSON.parse(match[1]);
};
const data = read('fg-data');
if (data.flowerguards.length !== 15 || data.gridLayout.length !== 61) throw new Error('Source schema changed; review before importing.');
const icons = read('fg-icons');
const assetDir = new URL('../public/assets/florais/', import.meta.url);
mkdirSync(assetDir, { recursive: true });
const names = {};
for (const [group, items] of Object.entries({ flowerguards: icons.flowerguardIcons, spiritus: icons.spiritusIcons })) {
  names[group] = {};
  for (const [name, uri] of Object.entries(items)) {
    const match = uri.match(/^data:image\/(png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw new Error(`Unsupported image: ${name}`);
    const file = `${group}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${match[1]}`;
    writeFileSync(new URL(file, assetDir), Buffer.from(match[2], 'base64'));
    names[group][name] = `/assets/florais/${file}`;
  }
}
const provenance = { url: 'https://flowerguard.online/', retrievedAt: new Date().toISOString(), sha256: createHash('sha256').update(JSON.stringify(data)).digest('hex'), note: 'Community data, not verified against the game. Names and skill labels retained as published.' };
writeFileSync(new URL('../src/data/florais.json', import.meta.url), JSON.stringify({ provenance, ...data, icons: names }, null, 2) + '\n');
console.log(`Imported ${data.flowerguards.length} guardians, ${data.gridLayout.length} cells.`);
