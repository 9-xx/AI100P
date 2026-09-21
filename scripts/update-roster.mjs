import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--dry-run");
const UA = "Mozilla/5.0 (compatible; AIBaiXuan/1.0; weekly roster)";
const MAX_AUTO = 3;
const COOLDOWN_DAYS = 21;

const CAT_RULES = [
  ["coding", /code|coding|ide|github|copilot|developer|编程|代码|仓库/i],
  ["image", /image|img|midjourney|flux|illustration|绘图|图像|写真/i],
  ["video", /video|runway|sora|kling|视频|数字人/i],
  ["audio", /audio|voice|music|tts|suno|eleven|语音|配音|音乐/i],
  ["search", /search|perplexity|browser|搜索|浏览器/i],
  ["writing", /writ|grammar|copywriting|写作|文案|润色/i],
  ["office", /office|docs|meeting|notion|ppt|办公|会议|文档/i],
  ["design", /design|figma|canva|ui kit|设计|原型/i],
  ["agent", /agent|automat|workflow|n8n|zapier|智能体|工作流/i],
  ["companion", /companion|character|roleplay|陪伴|角色/i],
  ["vertical", /legal|health|educat|finance|法律|医疗|教育|金融/i],
  ["chat", /chat|assistant|gpt|claude|助手|对话/i],
];

const categories = JSON.parse(fs.readFileSync(path.join(root, "data/categories.json"), "utf8"));
const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
let products = JSON.parse(fs.readFileSync(path.join(root, "data/products.json"), "utf8"));
const news = fs.existsSync(path.join(root, "data/news.json"))
  ? JSON.parse(fs.readFileSync(path.join(root, "data/news.json"), "utf8"))
  : { items: {} };
const bench = JSON.parse(fs.readFileSync(path.join(root, "data/bench.json"), "utf8"));
const statePath = path.join(root, "data/roster-state.json");
const state = fs.existsSync(statePath)
  ? JSON.parse(fs.readFileSync(statePath, "utf8"))
  : { quietWeeks: {}, cooldowns: {}, applied: [] };

const today = new Date().toISOString().slice(0, 10);
const sinceSec = Math.floor(Date.now() / 1000) - 14 * 86400;

function read(p) {
  return products.find((x) => x.id === p);
}
function inCatalog(nameOrId) {
  const n = (nameOrId || "").toLowerCase();
  return products.some(
    (p) =>
      p.id === nameOrId ||
      p.name.toLowerCase() === n ||
      (p.aliases || []).some((a) => a.toLowerCase() === n)
  );
}
function inferCat(text) {
  const hits = CAT_RULES.filter(([, re]) => re.test(text || "")).map(([id]) => id);
  if (hits.length === 1) return { cat: hits[0], confidence: "high" };
  if (hits.length === 2 && hits.includes("chat")) {
    const other = hits.find((x) => x !== "chat");
    return { cat: other, confidence: "mid" };
  }
  return { cat: hits[0] || "", confidence: "low" };
}
function plausibleName(name) {
  if (!name) return false;
  const n = name.trim();
  if (n.length < 2 || n.length > 28) return false;
  if (n.split(/\s+/).length > 4) return false;
  if (/[.!?,]|share your|learn from|based |how to |why we |\band\b/i.test(n)) return false;
  return true;
}
function slug(name) {
  const s = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return s || "p" + Date.now().toString(36);
}
function abbr(name) {
  const cn = (name || "").match(/[\u4e00-\u9fff]/g);
  if (cn && cn.length) return cn.slice(0, 2).join("");
  return (name || "AI").replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "AI";
}
async function fetchJson(url, opts = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal, headers: { "User-Agent": UA, ...(opts.headers || {}) } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

function newsScore(id) {
  const items = news.items?.[id] || [];
  let s = 0;
  for (const it of items) {
    if (it.source === "official") s += 4;
    else if (it.source === "cn-media") s += 3;
    else if (it.source === "hn") s += 2;
    else s += 1;
  }
  return { count: items.length, score: Math.min(20, s) };
}

function updateQuiet(id, count) {
  const prev = state.quietWeeks?.[id] || 0;
  if (state.updatedAt === today) return prev;
  const next = count === 0 ? prev + 1 : 0;
  state.quietWeeks = state.quietWeeks || {};
  state.quietWeeks[id] = next;
  return next;
}

function cooldownOk(cat) {
  const until = state.cooldowns?.[cat];
  if (!until) return true;
  return (Date.parse(today) - Date.parse(until)) / 86400000 >= COOLDOWN_DAYS;
}

const incumbents = products.map((p) => {
  const ns = newsScore(p.id);
  const quietWeeks = updateQuiet(p.id, ns.count);
  return {
    id: p.id,
    name: p.name,
    cat: p.cat,
    tier: p.tier,
    news: ns.count,
    score: ns.score,
    quietWeeks,
  };
});
const byId = Object.fromEntries(incumbents.map((x) => [x.id, x]));

const candidates = [];

for (const b of bench) {
  if (inCatalog(b.id) || inCatalog(b.name)) continue;
  candidates.push({
    ...b,
    origin: "bench",
    score: b.desiredTier === "lead" ? 22 : b.desiredTier === "core" ? 16 : 12,
    confidence: "high",
    evidence: b.reason,
  });
}

const hn = await fetchJson(
  `https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=show_hn&numericFilters=points>20,created_at_i>${sinceSec}&hitsPerPage=40`
);
for (const h of hn?.hits || []) {
  const m = (h.title || "").match(/^Show HN:\s*([^–—|:]+)/i);
  const name = (m ? m[1] : "").trim();
  if (!plausibleName(name) || inCatalog(name)) continue;
  const blob = `${h.title} ${h.story_text || ""} ${h.url || ""}`;
  const inf = inferCat(blob);
  if (!inf.cat) continue;
  const points = h.points || 0;
  candidates.push({
    id: slug(name),
    name,
    company: h.author ? `HN @${h.author}` : "—",
    cat: inf.cat,
    abbr: abbr(name),
    accent: catMap[inf.cat]?.accent || "#486A7E",
    pricing: "免费 + 订阅",
    url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    tagline: (h.title || "").replace(/^Show HN:\s*/i, "").slice(0, 42),
    tags: ["新上"],
    intro: `近期在开发者社区讨论较多的新工具。${h.title}。能力与定价请以官网为准。`,
    tier: "watch",
    aliases: [name],
    rss: [],
    desiredTier: "watch",
    autoEligible: inf.confidence === "high" && points >= 50 && !/news\.ycombinator\.com/.test(h.url || ""),
    origin: "hn",
    score: Math.min(24, Math.round(points / 5)),
    confidence: inf.confidence,
    evidence: `Hacker News Show HN ${points} 分`,
  });
}

const token = process.env.PRODUCTHUNT_TOKEN || "";
if (token) {
  const postedAfter = new Date(Date.now() - 14 * 86400000).toISOString();
  const data = await fetchJson("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{ posts(order: VOTES, postedAfter: "${postedAfter}", first: 20, topic: "artificial-intelligence") { edges { node { name tagline url votesCount website } } } }`,
    }),
  });
  for (const e of data?.data?.posts?.edges || []) {
    const n = e.node;
    if (!n?.name || inCatalog(n.name)) continue;
    const inf = inferCat(`${n.name} ${n.tagline || ""}`);
    if (!inf.cat) continue;
    const votes = n.votesCount || 0;
    candidates.push({
      id: slug(n.name),
      name: n.name,
      company: "—",
      cat: inf.cat,
      abbr: abbr(n.name),
      accent: catMap[inf.cat]?.accent || "#486A7E",
      pricing: "免费 + 订阅",
      url: n.website || n.url,
      tagline: n.tagline || n.name,
      tags: ["新上"],
      intro: `${n.name}：${n.tagline || "近期在 Product Hunt 获得较高关注的 AI 产品。"}能力与定价请以官网为准。`,
      tier: "watch",
      aliases: [n.name],
      rss: [],
      desiredTier: "watch",
      autoEligible: inf.confidence !== "low" && votes >= 200,
      origin: "product-hunt",
      score: Math.min(24, Math.round(votes / 25)),
      confidence: inf.confidence,
      evidence: `Product Hunt ${votes} 票`,
    });
  }
}

function weakestWatch(cat) {
  return incumbents
    .filter((x) => x.cat === cat && x.tier === "watch")
    .sort((a, b) => a.score - b.score || b.quietWeeks - a.quietWeeks)[0];
}

function toCard(c) {
  const { origin, score, confidence, evidence, desiredTier, autoEligible, reason, ...card } = c;
  return {
    ...card,
    tier: "watch",
    seed: Date.now() % 100000,
    addedAt: today,
    addedBy: "auto-roster",
  };
}

function canAuto(out, inn) {
  if (!out || out.tier !== "watch") return { ok: false, why: "只自动替换观察档" };
  if (inn.desiredTier && inn.desiredTier !== "watch") return { ok: false, why: "候选属于靠前/中间档，不能静默塞进观察档" };
  if (inn.autoEligible === false) return { ok: false, why: inn.reason || "候选不允许自动进入" };
  if (!plausibleName(inn.name)) return { ok: false, why: "候选名称不像独立产品" };
  if (inn.confidence === "low") return { ok: false, why: "分类把握不足" };
  if (!inn.url || /news\.ycombinator\.com/.test(inn.url)) return { ok: false, why: "没有可访问的产品官网" };
  if (!cooldownOk(out.cat)) return { ok: false, why: "该分类 21 天内已换过，避免抖动" };
  const trusted = inn.origin === "bench" || inn.origin === "product-hunt";
  const big = trusted && inn.score >= 18 && out.score <= 2 && out.quietWeeks >= 1;
  const slow = out.quietWeeks >= 2 && out.score <= 3 && inn.score >= 14 && inn.score >= Math.max(14, out.score * 3);
  if (big) return { ok: true, why: `观察档连续无声（${out.quietWeeks} 周，资讯分 ${out.score}），候选来源可靠且信号明显更强（${inn.score}）` };
  if (slow) return { ok: true, why: `观察档已连续 ${out.quietWeeks} 周偏弱，候选约为其 ${Math.round(inn.score / Math.max(1, out.score))} 倍信号` };
  return { ok: false, why: "差距还不够大，本周保持名单稳定" };
}

const suggest = [];
const auto = [];
const usedOut = new Set();
const usedIn = new Set();
const usedCat = new Set();

const rankedIn = [...candidates].sort((a, b) => b.score - a.score);
for (const inn of rankedIn) {
  if (usedIn.has(inn.id) || inCatalog(inn.id) || inCatalog(inn.name)) continue;
  const out = weakestWatch(inn.cat);
  const row = {
    cat: inn.cat,
    catName: catMap[inn.cat]?.short || inn.cat,
    out: out ? { id: out.id, name: out.name, tier: out.tier, score: out.score, quietWeeks: out.quietWeeks } : null,
    in: { id: inn.id, name: inn.name, origin: inn.origin, score: inn.score, evidence: inn.evidence, desiredTier: inn.desiredTier || "watch" },
  };
  if (!out) {
    suggest.push({ ...row, auto: false, why: "该分类没有观察档席位，不能无人值守换人" });
    continue;
  }
  if (usedOut.has(out.id) || usedCat.has(out.cat)) continue;
  const gate = canAuto(out, inn);
  if (gate.ok && auto.length < MAX_AUTO) {
    auto.push({ ...row, auto: true, why: gate.why });
    usedOut.add(out.id);
    usedIn.add(inn.id);
    usedCat.add(out.cat);
  } else {
    suggest.push({ ...row, auto: false, why: gate.why });
  }
}

for (const b of rankedIn.filter((x) => x.origin === "bench")) {
  if (suggest.some((s) => s.in.id === b.id) || auto.some((s) => s.in.id === b.id)) continue;
  const same = incumbents.filter((x) => x.cat === b.cat).sort((a, b2) => (a.tier === "watch" ? 0 : 1) - (b2.tier === "watch" ? 0 : 1) || a.score - b2.score)[0];
  suggest.push({
    cat: b.cat,
    catName: catMap[b.cat]?.short || b.cat,
    out: same ? { id: same.id, name: same.name, tier: same.tier, score: same.score, quietWeeks: same.quietWeeks } : null,
    in: { id: b.id, name: b.name, origin: "bench", score: b.score, evidence: b.evidence, desiredTier: b.desiredTier },
    auto: false,
    why: b.reason || "规模缺口，需动靠前档，只建议不自动",
  });
}

const quietWatch = incumbents.filter((x) => x.tier === "watch" && x.quietWeeks >= 1 && x.score <= 2);
for (const q of quietWatch) {
  if (auto.some((a) => a.out?.id === q.id) || suggest.some((s) => s.out?.id === q.id)) continue;
  suggest.push({
    cat: q.cat,
    catName: catMap[q.cat]?.short || q.cat,
    out: { id: q.id, name: q.name, tier: q.tier, score: q.score, quietWeeks: q.quietWeeks },
    in: null,
    auto: false,
    why: `观察档已 ${q.quietWeeks} 周几乎无资讯，下周若同分类出现强信号新品将自动替换`,
  });
}

if (!dry) {
  const alumniPath = path.join(root, "data/alumni.json");
  const alumni = fs.existsSync(alumniPath) ? JSON.parse(fs.readFileSync(alumniPath, "utf8")) : [];
  for (const sw of auto) {
    const outgoing = products.find((p) => p.id === sw.out.id);
    const incoming = rankedIn.find((c) => c.id === sw.in.id);
    if (!outgoing || !incoming) continue;
    alumni.push({ ...outgoing, removedAt: today, replacedBy: incoming.id });
    products = products.filter((p) => p.id !== outgoing.id);
    products.push(toCard(incoming));
    state.cooldowns = state.cooldowns || {};
    state.cooldowns[sw.cat] = today;
    state.applied = state.applied || [];
    state.applied.push({ at: today, out: outgoing.id, in: incoming.id, cat: sw.cat, why: sw.why });
  }
  fs.writeFileSync(alumniPath, JSON.stringify(alumni, null, 2) + "\n");
  fs.writeFileSync(path.join(root, "data/products.json"), JSON.stringify(products, null, 2) + "\n");
}

state.updatedAt = today;
if (!dry) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}

const suggestView = suggest.filter((s) => {
  if (!s.in) return true;
  if (s.in.origin === "bench") return true;
  if (s.in.origin === "product-hunt") return true;
  if (s.why && s.why.includes("不允许自动进入")) return false;
  if (s.in.origin === "hn") return plausibleName(s.in.name) && s.in.score >= 14;
  return true;
}).slice(0, 16);

const report = {
  updatedAt: today,
  dryRun: dry,
  totals: { products: products.length, auto: auto.length, suggest: suggestView.length },
  auto,
  suggest: suggestView,
  rules: [
    "只自动替换观察档；靠前 / 中间档只进建议清单",
    "同分类 1 换 1，每周最多 3 个，同一分类 21 天内不连换",
    "必须「观察档连续偏弱」且「候选明显更强」才自动换",
    "分类不确定、或候选本应靠前的产品（如夸克、元宝）绝不静默写入",
  ],
};
fs.writeFileSync(path.join(root, "data/roster-report.json"), JSON.stringify(report, null, 2) + "\n");

function rowHTML(s, applied) {
  const tierName = { lead: "靠前", core: "中间", watch: "观察档" };
  const inn = s.in ? `${s.in.name}（${s.in.origin === "bench" ? "备选" : s.in.origin || "候选"}）` : "暂无合适候选";
  const out = s.out ? `${s.out.name}（${tierName[s.out.tier] || s.out.tier}）` : "—";
  return `<tr><td>${s.catName}</td><td>${out}</td><td>${inn}</td><td>${applied ? "已自动替换" : "仅建议"}</td><td>${s.why}</td></tr>`;
}

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>AI100P · 选品更新</title>
<link rel="stylesheet" href="css/styles.css"/>
<style>
  .roster{max-width:980px;margin:0 auto;padding:100px 24px 60px}
  .roster h1{font-size:28px;margin-bottom:8px}
  .roster table{width:100%;border-collapse:collapse;font-size:14px;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}
  .roster th,.roster td{padding:12px 14px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line-2)}
  .roster th{font-size:12px;color:var(--muted);font-weight:600}
  .note{color:var(--muted);font-size:14px;margin:8px 0 22px;line-height:1.7}
</style>
</head>
<body>
<header class="nav solid"><div class="wrap"><a href="index.html" class="brand"><span class="mark"></span><b>AI100<span>P</span> · 选品更新</b></a></div></header>
<main class="roster">
  <h1>选品更新</h1>
  <p class="note">更新于 ${today}${dry ? "（演练，未写入名单）" : ""}。观察档在信号差距足够大时会自动 1 换 1；靠前 / 中间档只出现在建议里，避免名单每周抖动。</p>
  <h2 style="font-size:18px;margin:28px 0 12px">本周自动替换（${auto.length}）</h2>
  <table><thead><tr><th>分类</th><th>移出</th><th>纳入</th><th>状态</th><th>原因</th></tr></thead>
  <tbody>${auto.length ? auto.map((s) => rowHTML(s, true)).join("") : "<tr><td colspan=5>本周没有达到自动替换门槛，名单保持稳定。</td></tr>"}</tbody></table>
  <h2 style="font-size:18px;margin:32px 0 12px">建议换人清单（${report.suggest.length}）</h2>
  <table><thead><tr><th>分类</th><th>可考虑移出</th><th>可考虑纳入</th><th>状态</th><th>原因</th></tr></thead>
  <tbody>${report.suggest.length ? report.suggest.map((s) => rowHTML(s, false)).join("") : "<tr><td colspan=5>暂无建议。</td></tr>"}</tbody></table>
  <p class="note" style="margin-top:28px">${report.rules.map((r) => "· " + r).join("<br/>")}</p>
  <p class="note"><a href="index.html">返回 AI100P</a></p>
</main>
</body></html>
`;
fs.writeFileSync(path.join(root, "roster.html"), html);

console.log(dry ? "dry-run" : "applied", { auto: auto.length, suggest: report.suggest.length, products: products.length });
for (const s of auto) console.log("AUTO", s.cat, s.out?.name, "->", s.in?.name);
for (const s of report.suggest.slice(0, 8)) console.log("SUGGEST", s.catName, s.out?.name || "—", "->", s.in?.name || "—", "|", s.why);
