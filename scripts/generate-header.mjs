// Generates dynamic-svg/header.svg: a time-aware greeting, live GitHub stats,
// the LeetCode solved count, and one of several animated themes.
import { mkdir, writeFile } from 'node:fs/promises';
import { USERNAME, TIMEZONE, github, escapeXml } from './lib.mjs';

const NAME = 'Moamen Elbarky';
const TITLE = 'Full-Stack Software Engineer · .NET · Angular · AWS SAA';
const W = 800;
const H = 200;

/** Total accepted LeetCode problems, or null when the API is unavailable. */
async function leetcodeSolved() {
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://leetcode.com',
        'User-Agent': `${USERNAME}-profile-generator`,
      },
      body: JSON.stringify({
        query: `query($u:String!){matchedUser(username:$u){
          submitStatsGlobal{acSubmissionNum{difficulty count}}}}`,
        variables: { u: USERNAME },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = await res.json();
    const all = json?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum
      ?.find((x) => x.difficulty === 'All');
    return all ? all.count : null;
  } catch (err) {
    console.warn(`LeetCode lookup skipped: ${err.message}`);
    return null;
  }
}

/** Greeting and timestamp in Cairo time (DST-aware via Intl). */
function cairoTime(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric', hourCycle: 'h23', timeZone: TIMEZONE,
    }).format(now),
  );
  const greeting =
    hour < 5 ? 'Good Night'
      : hour < 12 ? 'Good Morning'
        : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const stamp = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: TIMEZONE,
  }).format(now);
  return { greeting, stamp };
}

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------------------------------------------------------------- themes ---
// Each theme returns { background, accent, muted, font } for shared text.

function particles() {
  let dots = '';
  for (let i = 0; i < 24; i++) {
    const x = rand(10, W - 10).toFixed(0);
    const y = rand(10, H - 10).toFixed(0);
    const to = rand(10, H - 10).toFixed(0);
    dots += `<circle cx="${x}" cy="${y}" r="${rand(0.8, 2.2).toFixed(1)}"
      fill="#58a6ff" opacity="${rand(0.2, 0.6).toFixed(2)}">
      <animate attributeName="cy" values="${y};${to};${y}"
        dur="${rand(3, 7).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
  }
  return {
    name: 'particles',
    background: `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="50%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/></linearGradient></defs>
      <rect width="100%" height="100%" rx="12" fill="url(#bg)"/>${dots}`,
    accent: '#58a6ff', muted: '#8b949e', font: 'Segoe UI, Ubuntu, Arial',
  };
}

function starfield() {
  let stars = '';
  for (let i = 0; i < 45; i++) {
    stars += `<circle cx="${rand(0, W).toFixed(0)}" cy="${rand(0, H).toFixed(0)}"
      r="${rand(0.4, 1.6).toFixed(1)}" fill="#ffffff" opacity="0.4">
      <animate attributeName="opacity" values="0.15;0.9;0.15"
        dur="${rand(1.5, 4).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
  }
  return {
    name: 'starfield',
    background: `<rect width="100%" height="100%" rx="12" fill="#0a0a1a"/>
      ${stars}`,
    accent: '#7aa2f7', muted: '#a0a0b0', font: 'Segoe UI, Ubuntu, Arial',
  };
}

function aurora() {
  const band = (color, y, dur) => `<ellipse cx="400" cy="${y}" rx="520" ry="46"
      fill="${color}" opacity="0.22" filter="url(#blur)">
      <animate attributeName="cx" values="300;500;300" dur="${dur}s"
        repeatCount="indefinite"/></ellipse>`;
  return {
    name: 'aurora',
    background: `<defs><filter id="blur"><feGaussianBlur stdDeviation="28"/>
      </filter></defs>
      <rect width="100%" height="100%" rx="12" fill="#0d1117"/>
      ${band('#0f3460', 40, 9)}${band('#58a6ff', 110, 12)}
      ${band('#1a1a2e', 170, 10)}`,
    accent: '#79b8ff', muted: '#9da7b3', font: 'Segoe UI, Ubuntu, Arial',
  };
}

function matrix() {
  let drops = '';
  for (let i = 0; i < 22; i++) {
    const x = 18 + i * 36;
    drops += `<text x="${x}" y="-20" font-family="monospace" font-size="13"
      fill="#00ff41" opacity="0.25">${escapeXml(
        pick(['01', '10', '{}', '=>', '</>']),
      )}
      <animate attributeName="y" values="-20;${H + 20}"
        dur="${rand(2, 4).toFixed(1)}s" begin="${rand(0, 3).toFixed(1)}s"
        repeatCount="indefinite"/></text>`;
  }
  return {
    name: 'matrix',
    background: `<rect width="100%" height="100%" rx="12" fill="#050a05"/>
      ${drops}
      <rect x="70" y="22" width="660" height="156" rx="10" fill="#050a05"
        fill-opacity="0.82"/>`,
    accent: '#00ff41', muted: '#3ddc84', font: 'Fira Code, Consolas, monospace',
  };
}

const THEMES = [particles, starfield, aurora, matrix];

// ------------------------------------------------------------------ main ---

function render({ theme, greeting, stamp, stats }) {
  const t = theme();
  const line = stats.map(escapeXml).join('   •   ');
  console.log(`Header theme: ${t.name}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"
  viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(
    `${greeting}! I'm ${NAME}. ${TITLE}`,
  )}">
  ${t.background}
  <text x="400" y="68" text-anchor="middle" font-family="${t.font}"
    font-size="34" font-weight="700" fill="#ffffff">${escapeXml(
      `${greeting}! I'm ${NAME}`,
    )}<animate attributeName="opacity" values="0;1" dur="1.2s" fill="freeze"/>
  </text>
  <text x="400" y="104" text-anchor="middle" font-family="${t.font}"
    font-size="17" fill="${t.muted}">${escapeXml(TITLE)}</text>
  <text x="400" y="146" text-anchor="middle" font-family="${t.font}"
    font-size="15" fill="${t.accent}">${line}</text>
  <text x="${W - 14}" y="${H - 12}" text-anchor="end" font-family="${t.font}"
    font-size="10" fill="${t.muted}" opacity="0.6">${escapeXml(
      `updated ${stamp} (Cairo)`,
    )}</text>
</svg>
`;
}

async function main() {
  const [user, solved] = await Promise.all([
    github(`/users/${USERNAME}`),
    leetcodeSolved(),
  ]);
  const { greeting, stamp } = cairoTime();
  const stats = [
    `👥 ${user.followers} followers`,
    `📦 ${user.public_repos} repos`,
    ...(solved ? [`🧩 ${solved} LeetCode solved`] : []),
    '☁️ AWS Certified',
  ];
  await mkdir('dynamic-svg', { recursive: true });
  await writeFile(
    'dynamic-svg/header.svg',
    render({ theme: pick(THEMES), greeting, stamp, stats }),
  );
  console.log(`Header written for ${user.login}: ${stats.join(' | ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
