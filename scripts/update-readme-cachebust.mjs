// Bumps the ?v=<timestamp> query on the header image so GitHub's image proxy
// (camo) fetches the freshly generated SVG instead of a cached copy.
import { readFile, writeFile } from 'node:fs/promises';

const README = 'README.md';
const PATTERN = /(dynamic-svg\/header\.svg)\?v=\d+/g;

const before = await readFile(README, 'utf8');
if (!PATTERN.test(before)) {
  console.error('header.svg?v=<n> reference not found in README.md');
  process.exit(1);
}
const version = Math.floor(Date.now() / 1000);
await writeFile(README, before.replace(PATTERN, `$1?v=${version}`));
console.log(`Header cache-buster set to v=${version}`);
