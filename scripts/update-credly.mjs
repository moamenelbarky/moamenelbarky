// Syncs public Credly badges into README.md between the CREDLY markers.
// Badge images are downloaded into assets/credly/ so the README never
// hotlinks Credly (and the GitLab README can reuse the same raw URLs).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { escapeXml, replaceBetweenMarkers } from "./lib.mjs";

const CREDLY_USER = "moamenelbarky";
const README = "README.md";
const OUT_DIR = "assets/credly";
const SIZE = 130;

const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function fetchBadges() {
  const res = await fetch(
    `https://www.credly.com/users/${CREDLY_USER}/badges.json`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!res.ok) throw new Error(`Credly badges -> ${res.status}`);
  const { data } = await res.json();
  const today = new Date().toISOString().slice(0, 10);
  return data
    .filter((b) => b.public && b.state === "accepted")
    .filter((b) => !b.expires_at_date || b.expires_at_date >= today)
    .sort((a, b) => b.issued_at_date.localeCompare(a.issued_at_date));
}

async function download(url, path) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Badge image ${url} -> ${res.status}`);
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const badges = await fetchBadges();
  await mkdir(OUT_DIR, { recursive: true });

  const cells = [];
  for (const b of badges) {
    const name = escapeXml(b.badge_template.name);
    const file = `${OUT_DIR}/${slug(b.badge_template.name)}.png`;
    const sized = b.image_url.replace("/images/", "/size/340x340/images/");
    await download(sized, file);
    cells.push(
      [
        `<a href="https://www.credly.com/badges/${b.id}">`,
        "  <img",
        `    width="${SIZE}"`,
        `    alt="${name}"`,
        `    title="${name}"`,
        `    src="./${file}"`,
        "  />",
        "</a>",
      ].join("\n"),
    );
  }

  const body = cells.length
    ? `<div align="center">\n\n${cells.join("\n")}\n\n</div>`
    : "<!-- no public Credly badges -->";
  const before = await readFile(README, "utf8");
  await writeFile(README, replaceBetweenMarkers(before, "CREDLY", body));
  console.log(`Synced ${cells.length} Credly badge(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
