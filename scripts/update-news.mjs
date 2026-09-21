import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WINDOW_DAYS = 14;
const MAX_ITEMS = 5;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const GENERIC_ORGS = new Set([
  "OpenAI", "Google", "Google DeepMind", "Anthropic", "Microsoft", "GitHub · 微软",
  "字节跳动", "阿里巴巴", "百度", "腾讯", "Adobe", "xAI", "Cognition", "MiniMax",
  "Stability AI", "Canva", "Notion Labs", "Notion", "Vercel", "快手", "网易", "360",
  "智谱 AI", "月之暗面", "深度求索", "金山办公",
]);

/** 补充检索别名；不用公司名，避免同厂产品串味 */
const EXTRA_ALIASES = {
  chatgpt: ["ChatGPT"],
  claude: ["Claude"],
  gemini: ["Gemini"],
  grok: ["Grok"],
  deepseek: ["DeepSeek", "深度求索"],
  doubao: ["豆包"],
  qwen: ["通义千问", "千问", "Qwen"],
  kimi: ["Kimi"],
  ernie: ["文心一言", "文小言"],
  copilot: ["GitHub Copilot"],
  cursor: ["Cursor AI", "Cursor IDE", "Anysphere"],
  claudecode: ["Claude Code"],
  windsurf: ["Windsurf"],
  v0: ["v0.dev", "Vercel v0"],
  replit: ["Replit Agent", "Replit"],
  bolt: ["Bolt.new"],
  devin: ["Devin AI"],
  trae: ["Trae"],
  midjourney: ["Midjourney"],
  dalle: ["DALL·E", "DALL-E", "GPT Image"],
  flux: ["FLUX.1", "Black Forest Labs"],
  firefly: ["Adobe Firefly", "Firefly"],
  jimeng: ["即梦"],
  wanxiang: ["通义万相", "万相"],
  ideogram: ["Ideogram"],
  recraft: ["Recraft"],
  leonardo: ["Leonardo.Ai", "Leonardo AI"],
  sora: ["Sora"],
  kling: ["可灵", "Kling"],
  runway: ["Runway"],
  hailuo: ["海螺", "Hailuo"],
  veo: ["Veo"],
  pika: ["Pika Labs", "Pika"],
  luma: ["Dream Machine", "Luma AI"],
  heygen: ["HeyGen"],
  capcut: ["剪映", "CapCut"],
  suno: ["Suno"],
  udio: ["Udio"],
  elevenlabs: ["ElevenLabs"],
  murf: ["Murf"],
  adobepodcast: ["Adobe Podcast"],
  krisp: ["Krisp"],
  tianyin: ["网易天音", "天音"],
  stableaudio: ["Stable Audio"],
  fishaudio: ["Fish Audio"],
  perplexity: ["Perplexity"],
  metaso: ["秘塔"],
  genspark: ["Genspark"],
  phind: ["Phind"],
  felo: ["Felo"],
  ima: ["腾讯 ima", "ima.qq"],
  nami: ["纳米 AI", "纳米AI"],
  youcom: ["You.com"],
  jasper: ["Jasper AI", "Jasper"],
  copyai: ["Copy.ai"],
  writesonic: ["Writesonic"],
  grammarly: ["Grammarly"],
  notionai: ["Notion AI"],
  quillbot: ["QuillBot"],
  huoshan: ["火山写作"],
  xiezuomao: ["写作猫", "秘塔写作猫"],
  m365copilot: ["Microsoft 365 Copilot", "M365 Copilot"],
  notion: ["Notion"],
  gamma: ["Gamma.app", "Gamma"],
  otter: ["Otter.ai"],
  fireflies: ["Fireflies.ai"],
  feishu: ["飞书"],
  wpsai: ["WPS AI"],
  canva: ["Canva Magic Studio", "Canva"],
  figmaai: ["Figma AI", "Figma"],
  framer: ["Framer"],
  galileo: ["Galileo AI"],
  uizard: ["Uizard"],
  mastergo: ["MasterGo", "莫高"],
  looka: ["Looka"],
  designsai: ["Designs.ai"],
  manus: ["Manus"],
  lindy: ["Lindy"],
  zapier: ["Zapier Agents", "Zapier"],
  make: ["Make.com"],
  n8n: ["n8n"],
  coze: ["扣子", "Coze"],
  dify: ["Dify"],
  autoglm: ["AutoGLM"],
  characterai: ["Character.AI", "Character AI"],
  replika: ["Replika"],
  xingye: ["星野"],
  talkie: ["Talkie"],
  pi: ["Pi.ai", "Inflection Pi"],
  maoxiang: ["猫箱"],
  kindroid: ["Kindroid"],
  nomi: ["Nomi AI", "Nomi"],
  harvey: ["Harvey AI"],
  khanmigo: ["Khanmigo"],
  duolingo: ["Duolingo Max", "Duolingo"],
  speak: ["Speak.com"],
  intercomfin: ["Intercom Fin"],
  hippocratic: ["Hippocratic AI"],
  miaoya: ["妙鸭相机", "妙鸭"],
  bloomberggpt: ["BloombergGPT"],
};

const CN_FEEDS = [
  { id: "36kr", name: "36氪", url: "https://www.36kr.com/feed" },
  { id: "qbitai", name: "量子位", url: "https://www.qbitai.com/feed" },
];

const args = new Set(process.argv.slice(2));
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice(7).split(",").filter(Boolean) : null;

const since = Date.now() - WINDOW_DAYS * 86400 * 1000;
const cache = new Map();

function decode(s) {
  return (s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&nbsp;/g, " ")
    .trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

function linkOf(block) {
  const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  if (href) return href[1].trim();
  const plain = tag(block, "link");
  if (plain) return plain;
  const guid = tag(block, "guid");
  return guid.startsWith("http") ? guid : "";
}

function parseFeed(xml) {
  const chunks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return chunks.map((b) => ({
    title: tag(b, "title"),
    url: linkOf(b),
    date: tag(b, "pubDate") || tag(b, "updated") || tag(b, "published") || tag(b, "dc:date"),
  })).filter((x) => x.title && x.url);
}

function toMs(d) {
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : 0;
}

function ymd(ms) {
  const d = new Date(ms || Date.now());
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function needlesFor(p) {
  const extra = EXTRA_ALIASES[p.id] || [];
  const fromData = (p.aliases || []).filter((a) => !GENERIC_ORGS.has(a));
  return [...new Set([p.name, ...extra, ...fromData].map((s) => s.trim()).filter(Boolean))];
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const NEED_CONTEXT = {
  cursor: /\b(AI|IDE|Anysphere|editor|coding|Copilot|agent)\b/i,
  gamma: /Gamma\.app|Gamma AI|AI (PPT|presentation|幻灯|演示)/i,
  pika: /Pika (Labs|AI)|pika\.art/i,
  bolt: /Bolt\.new|StackBlitz/i,
  make: /Make\.com|Integromat|Make AI/i,
  speak: /Speak\.com|Speak AI|口语/i,
  pi: /Pi\.ai|Inflection/i,
  looka: /Looka|logo/i,
  notion: /Notion AI|Notion\.so|Notion Labs/i,
};

function titleMatches(title, needles, id) {
  if (!title) return false;
  const hit = needles.some((n) => {
    if (/[\u4e00-\u9fff]/.test(n)) return title.includes(n);
    const q = n.toLowerCase();
    const t = title.toLowerCase();
    if (q.length <= 3) return new RegExp(`(?:^|[^a-z0-9])${escapeRe(q)}(?:$|[^a-z0-9])`, "i").test(title);
    return t.includes(q);
  });
  if (!hit) return false;
  const extra = NEED_CONTEXT[id];
  return extra ? extra.test(title) : true;
}

async function fetchText(url) {
  if (cache.has(url)) return cache.get(url);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, application/json, */*" },
    });
    const text = r.ok ? await r.text() : "";
    cache.set(url, text);
    return text;
  } catch {
    cache.set(url, "");
    return "";
  } finally {
    clearTimeout(to);
  }
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const cur = i++;
      out[cur] = await fn(items[cur], cur);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

const SOURCE_RANK = { official: 0, "google-news": 1, hn: 2, "cn-media": 3 };

function scoreItem(it, needles) {
  const t = it.title;
  let s = 0;
  if (it.source === "official") s += 6;
  if (it.source === "cn-media") s += 3;
  if (it.source === "google-news") s += 1;
  if (/发布|更新|上线|版本|推出|融资|IPO|Introducing|launch|changelog|outage|GA\b/i.test(t)) s += 2;
  if (/FAQ|合作参考清单|懂球帝|赔率|球探|真实生活状态|到底靠谱|怎么选|测评合集|预测.{0,12}vs/i.test(t)) s -= 6;
  if (it.source === "hn") {
    const head = t.slice(0, 56);
    const focused = needles.some((n) => head.toLowerCase().includes(n.toLowerCase()) || head.includes(n));
    if (!focused) s -= 3;
  }
  return s;
}

function normTitle(t) {
  return t
    .replace(/\s*[-–—|]\s*[^-–—|]{1,20}$/, "")
    .replace(/\s+/g, "")
    .slice(0, 28);
}

function mergeItems(list, needles) {
  const seen = new Set();
  const cleaned = [];
  for (const it of list) {
    const ms = toMs(it.date);
    if (ms && ms < since) continue;
    const title = it.title.replace(/\s+/g, " ").trim();
    const q = scoreItem({ ...it, title }, needles);
    if (q < 0) continue;
    const key = normTitle(title) || (it.url || "").replace(/[?#].*$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push({
      title,
      url: it.url,
      date: ymd(ms || Date.now()),
      ts: ms || Date.now(),
      source: it.source,
      score: q,
    });
  }
  cleaned.sort((a, b) => (SOURCE_RANK[a.source] ?? 9) - (SOURCE_RANK[b.source] ?? 9) || b.score - a.score || b.ts - a.ts);
  return cleaned.slice(0, MAX_ITEMS).map(({ ts, score, ...rest }) => rest);
}

const products = JSON.parse(fs.readFileSync(path.join(root, "data/products.json"), "utf8"))
  .filter((p) => !only || only.includes(p.id));

const stats = { official: 0, google: 0, hn: 0, cn: 0, withNews: 0 };

async function officialItems(p) {
  const urls = [...new Set(p.rss || [])];
  const needles = needlesFor(p);
  const found = [];
  for (const url of urls) {
    const xml = await fetchText(url);
    if (!xml) continue;
    for (const it of parseFeed(xml)) {
      if (titleMatches(it.title, needles, p.id)) {
        found.push({ ...it, source: "official" });
        stats.official++;
      }
    }
  }
  return found;
}

async function cnItems(feeds, p) {
  const needles = needlesFor(p);
  const found = [];
  for (const feed of feeds) {
    for (const it of feed.items) {
      if (titleMatches(it.title, needles, p.id)) {
        found.push({ ...it, source: "cn-media" });
        stats.cn++;
      }
    }
  }
  return found;
}

async function hnItems(p) {
  const q = encodeURIComponent(p.name);
  const sinceSec = Math.floor(since / 1000);
  const url = `https://hn.algolia.com/api/v1/search_by_date?query=${q}&tags=story&numericFilters=points>8,created_at_i>${sinceSec}&hitsPerPage=12`;
  const text = await fetchText(url);
  if (!text) return [];
  try {
    const d = JSON.parse(text);
    const needles = needlesFor(p);
    const hits = [];
    for (const h of d.hits || []) {
      if (!h.title || !titleMatches(h.title, needles, p.id)) continue;
      hits.push({
        title: h.title,
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        date: h.created_at,
        source: "hn",
      });
      stats.hn++;
    }
    return hits;
  } catch {
    return [];
  }
}

function googleUrl(query, locale) {
  if (locale === "en") return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  if (locale === "cn-site") {
    return `https://news.google.com/rss/search?q=${encodeURIComponent(`(${query}) (site:36kr.com OR site:jiqizhixin.com OR site:qbitai.com OR site:ithome.com)`)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
  }
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
}

const SEARCH_QUERY = {
  cursor: 'Cursor AI OR "Cursor IDE" OR Anysphere',
  chatgpt: "ChatGPT",
  doubao: "豆包 AI",
  kling: "可灵 AI",
  pi: "Pi.ai Inflection",
  gamma: "Gamma.app AI",
  pika: "Pika Labs AI",
  bolt: "Bolt.new",
  make: "Make.com AI",
};

async function googleItems(p, locale, source = "google-news") {
  const query = SEARCH_QUERY[p.id] || `"${(EXTRA_ALIASES[p.id] || [p.name])[0]}"`;
  const needles = needlesFor(p);
  const xml = await fetchText(googleUrl(query, locale));
  if (!xml) return [];
  const found = [];
  for (const it of parseFeed(xml)) {
    if (!titleMatches(it.title, needles, p.id)) continue;
    found.push({ ...it, source });
    if (source === "google-news") stats.google++;
    else stats.cn++;
  }
  return found;
}

console.log(`fetching weekly news for ${products.length} products, last ${WINDOW_DAYS} days`);

const cnFeeds = [];
for (const feed of CN_FEEDS) {
  const xml = await fetchText(feed.url);
  const items = xml ? parseFeed(xml) : [];
  cnFeeds.push({ ...feed, items });
  console.log(`  ${feed.name}: ${items.length} entries`);
}

const news = {};
await pool(products, 4, async (p) => {
  const bag = [];
  bag.push(...await officialItems(p));
  bag.push(...await cnItems(cnFeeds, p));
  bag.push(...await googleItems(p, "cn-site", "cn-media"));
  bag.push(...await hnItems(p));
  bag.push(...await googleItems(p, /[\u4e00-\u9fff]/.test(p.name) ? "zh" : "en"));
  const merged = mergeItems(bag, needlesFor(p));
  news[p.id] = merged;
  if (merged.length) stats.withNews++;
  process.stdout.write(`  ${p.id.padEnd(14)} ${String(merged.length).padStart(1)}  \r`);
});

let items = news;
if (only && fs.existsSync(path.join(root, "data/news.json"))) {
  try {
    const prev = JSON.parse(fs.readFileSync(path.join(root, "data/news.json"), "utf8"));
    items = { ...(prev.items || {}), ...news };
  } catch { /* ignore */ }
}

const payload = {
  updatedAt: new Date().toISOString().slice(0, 10),
  windowDays: WINDOW_DAYS,
  stats: { products: products.length, withNews: stats.withNews, hits: { official: stats.official, google: stats.google, hn: stats.hn, cn: stats.cn } },
  items,
};

fs.writeFileSync(path.join(root, "data/news.json"), JSON.stringify(payload, null, 2) + "\n");

const meta = JSON.parse(fs.readFileSync(path.join(root, "data/meta.json"), "utf8"));
meta.newsUpdatedAt = payload.updatedAt;
fs.writeFileSync(path.join(root, "data/meta.json"), JSON.stringify(meta, null, 2) + "\n");

console.log("\nwrote data/news.json", stats);
