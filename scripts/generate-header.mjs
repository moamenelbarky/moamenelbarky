// Generates dynamic-svg/header.svg: name, title, the live LeetCode solved
// count and an "updated" stamp, on a single animated brand theme.
import { mkdir, writeFile } from "node:fs/promises";
import { USERNAME, TIMEZONE, escapeXml } from "./lib.mjs";

const NAME = "Moe Elbarky";
const TITLE = "Full-Stack & Cloud Software Engineer";
const W = 800;
const H = 200;

/** Total accepted LeetCode problems, or null when the API is unavailable. */
async function leetcodeSolved() {
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
        "User-Agent": `${USERNAME}-profile-generator`,
      },
      body: JSON.stringify({
        query: `query($u:String!){matchedUser(username:$u){
          submitStatsGlobal{acSubmissionNum{difficulty count}}}}`,
        variables: { u: USERNAME },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = await res.json();
    const all =
      json?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum?.find(
        (x) => x.difficulty === "All",
      );
    return all ? all.count : null;
  } catch (err) {
    console.warn(`LeetCode lookup skipped: ${err.message}`);
    return null;
  }
}

/** Human-readable timestamp in Cairo time (DST-aware via Intl). */
function cairoStamp(now = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIMEZONE,
  }).format(now);
}

const rand = (min, max) => min + Math.random() * (max - min);

// ----------------------------------------------------------------- theme ---
// Navy gradient with slowly drifting particles, matching the README palette.

function particles() {
  let dots = "";
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
    background: `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="50%" stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/></linearGradient></defs>
      <rect width="100%" height="100%" rx="12" fill="url(#bg)"/>${dots}`,
    accent: "#58a6ff",
    muted: "#8b949e",
    font: "Segoe UI, Ubuntu, Arial",
  };
}

// ------------------------------------------------------------------ main ---

function render({ stamp, stats }) {
  const t = particles();
  const line = stats.map(escapeXml).join("   •   ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"
  viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(
    `Hi, I'm ${NAME}. ${TITLE}`,
  )}">
  ${t.background}
  <text x="400" y="68" text-anchor="middle" font-family="${t.font}"
    font-size="34" font-weight="700" fill="#ffffff">${escapeXml(
      `Hi, I'm ${NAME}`,
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
  const solved = await leetcodeSolved();
  const stats = [
    "☁️ AWS Solutions Architect – Associate",
    ...(solved ? [`🧩 ${solved} LeetCode solved`] : []),
    "🔓 Open-source contributor",
  ];
  await mkdir("dynamic-svg", { recursive: true });
  await writeFile(
    "dynamic-svg/header.svg",
    render({ stamp: cairoStamp(), stats }),
  );
  console.log(`Header written: ${stats.join(" | ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
