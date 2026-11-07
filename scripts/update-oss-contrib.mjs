// Rebuilds the "Open Source Contributions" table in README.md from the GitHub
// Search API: PRs authored by USERNAME in repositories owned by someone else.
import { readFile, writeFile } from 'node:fs/promises';
import { USERNAME, github, replaceBetweenMarkers } from './lib.mjs';

// Owners whose repos are "my own projects", not open-source contributions.
const EXCLUDED_OWNERS = [USERNAME, 'quiz-nova', 'mechanicshop'];
const MARKER = 'OSS-CONTRIB';
const README = 'README.md';

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
const cell = (s) => String(s).replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
const compact = (n) =>
  new Intl.NumberFormat('en', { notation: 'compact' }).format(n);

async function fetchPullRequests() {
  const q = [
    'is:pr',
    `author:${USERNAME}`,
    ...EXCLUDED_OWNERS.map((o) => `-user:${o}`),
  ].join(' ');
  const data = await github(
    `/search/issues?q=${encodeURIComponent(q)}&per_page=100&sort=updated`,
  );
  return data.items
    .map((it) => ({
      repo: it.repository_url.replace('https://api.github.com/repos/', ''),
      title: it.title,
      url: it.html_url,
      merged: it.pull_request?.merged_at ?? null,
      state: it.state,
      date: it.pull_request?.merged_at ?? it.created_at,
    }))
    // Keep merged and still-open PRs; closed-unmerged ones are noise.
    .filter((pr) => pr.merged || pr.state === 'open');
}

async function repoStars(repos) {
  const stars = {};
  await Promise.all(
    repos.map(async (r) => {
      try {
        stars[r] = (await github(`/repos/${r}`)).stargazers_count;
      } catch {
        stars[r] = null;
      }
    }),
  );
  return stars;
}

function renderTable(prs, stars) {
  if (prs.length === 0) return '_No public contributions yet — stay tuned!_';
  const latest = {};
  for (const pr of prs) {
    if (!latest[pr.repo] || pr.date > latest[pr.repo]) latest[pr.repo] = pr.date;
  }
  prs.sort(
    (a, b) =>
      latest[b.repo].localeCompare(latest[a.repo]) ||
      a.repo.localeCompare(b.repo) ||
      b.date.localeCompare(a.date),
  );
  const rows = prs.map((pr) => {
    const star = stars[pr.repo] ? ` ⭐ ${compact(stars[pr.repo])}` : '';
    const status = pr.merged
      ? `✅ Merged ${fmtDate(pr.merged)}`
      : `🟡 In review since ${fmtDate(pr.date)}`;
    return `| [${pr.repo}](https://github.com/${pr.repo})${star} | ` +
      `[${cell(pr.title)}](${pr.url}) | ${status} |`;
  });
  return [
    '| Project | Contribution | Status |',
    '| --- | --- | --- |',
    ...rows,
  ].join('\n');
}

async function main() {
  const prs = await fetchPullRequests();
  const stars = await repoStars([...new Set(prs.map((p) => p.repo))]);
  const table = renderTable(prs, stars);

  const before = await readFile(README, 'utf8');
  const after = replaceBetweenMarkers(before, MARKER, table);
  if (after === before) {
    console.log('OSS contributions unchanged.');
    return;
  }
  await writeFile(README, after);
  console.log(`OSS contributions updated: ${prs.length} PR(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
