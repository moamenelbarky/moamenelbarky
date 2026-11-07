// Shared helpers for the profile generator scripts (Node >= 20, no deps).

export const USERNAME = 'moamenelbarky';
export const TIMEZONE = 'Africa/Cairo';

/** Fetch JSON from the GitHub REST API, authenticated when a token exists. */
export async function github(path) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': `${USERNAME}-profile-generator`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API ${path} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Escape text so it is safe to embed inside SVG/XML. */
export function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Replace the text between `<!-- NAME:START -->` and `<!-- NAME:END -->`.
 * Returns the new document, or throws if the markers are missing.
 */
export function replaceBetweenMarkers(doc, name, body) {
  const re = new RegExp(
    `(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`,
  );
  if (!re.test(doc)) throw new Error(`Markers ${name}:START/END not found`);
  return doc.replace(re, `$1\n${body}\n$2`);
}
