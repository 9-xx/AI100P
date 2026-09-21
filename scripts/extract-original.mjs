import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = "/Users/mac/Downloads/index (1).html";
const html = fs.readFileSync(src, "utf8");

const css = html.match(/<style>([\s\S]*?)<\/style>/)[1].trim() + "\n";
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const dataChunk = script.split("/* ===== 工具 ===== */")[0];
const logicChunk = script.split("/* ===== 工具 ===== */")[1];

const context = { console };
vm.createContext(context);
vm.runInContext(`${dataChunk}\nthis.CATEGORIES=CATEGORIES;this.TRACKS=TRACKS;this.PRODUCTS=PRODUCTS;this.TIMELINES=TIMELINES;`, context);

const { CATEGORIES, TRACKS, PRODUCTS, TIMELINES } = context;

/** 内部三档：lead 靠前 / core 中间 / watch 靠后。不展示名次。 */
const TIER = {
  chatgpt: "lead", claude: "lead", gemini: "lead", grok: "lead", deepseek: "lead",
  doubao: "lead", qwen: "lead", kimi: "lead", ernie: "core",

  copilot: "lead", cursor: "lead", claudecode: "core", windsurf: "core",
  v0: "core", replit: "core", bolt: "core", devin: "watch", trae: "watch",

  midjourney: "lead", dalle: "lead", flux: "lead", firefly: "core",
  jimeng: "lead", wanxiang: "core", ideogram: "core", recraft: "watch", leonardo: "core",

  sora: "lead", kling: "lead", runway: "lead", hailuo: "core",
  veo: "lead", pika: "core", luma: "watch", heygen: "core", capcut: "lead",

  suno: "lead", udio: "core", elevenlabs: "lead", murf: "watch",
  adobepodcast: "core", krisp: "core", tianyin: "watch", stableaudio: "core", fishaudio: "core",

  perplexity: "lead", metaso: "core", genspark: "core", phind: "core",
  felo: "watch", ima: "core", nami: "core", youcom: "watch",

  jasper: "core", copyai: "core", writesonic: "watch", grammarly: "lead",
  notionai: "lead", quillbot: "core", huoshan: "core", xiezuomao: "watch",

  m365copilot: "lead", notion: "lead", gamma: "core", otter: "core",
  fireflies: "core", feishu: "lead", wpsai: "lead",

  canva: "lead", figmaai: "lead", framer: "core", galileo: "watch",
  uizard: "core", mastergo: "core", looka: "watch", designsai: "watch",

  manus: "core", lindy: "core", zapier: "lead", make: "core",
  n8n: "core", coze: "lead", dify: "core", autoglm: "watch",

  characterai: "lead", replika: "core", xingye: "lead", talkie: "core",
  pi: "core", maoxiang: "core", kindroid: "watch", nomi: "watch",

  harvey: "lead", khanmigo: "core", duolingo: "lead", speak: "core",
  intercomfin: "lead", hippocratic: "watch", miaoya: "core", bloomberggpt: "watch",
};

const RSS = {
  chatgpt: ["https://openai.com/news/rss.xml"],
  dalle: ["https://openai.com/news/rss.xml"],
  sora: ["https://openai.com/news/rss.xml"],
  copilot: ["https://github.blog/changelog/feed/"],
  gemini: ["https://blog.google/rss/"],
  veo: ["https://deepmind.google/blog/feed/basic/"],
  claude: [],
  claudecode: [],
  flux: ["https://huggingface.co/blog/feed.xml"],
  qwen: ["https://huggingface.co/blog/feed.xml"],
  m365copilot: ["https://blogs.microsoft.com/ai/feed/"],
};

const products = PRODUCTS.map((p, i) => {
  const tier = TIER[p.id];
  if (!tier) throw new Error("missing tier: " + p.id);
  return {
    ...p,
    tier,
    seed: i,
    aliases: [p.name, p.company].filter(Boolean),
    rss: RSS[p.id] || [],
  };
});

const missing = products.filter((p) => !TIER[p.id]);
if (Object.keys(TIER).length !== products.length) {
  const extra = Object.keys(TIER).filter((id) => !products.some((p) => p.id === id));
  if (extra.length) console.warn("extra tier keys", extra);
}
if (missing.length) throw new Error("untiered " + missing.map((p) => p.id).join(","));

const counts = { lead: 0, core: 0, watch: 0 };
for (const p of products) counts[p.tier]++;
console.log("products", products.length, counts);

const dataDir = path.join(root, "data");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(path.join(root, "css"), { recursive: true });
fs.mkdirSync(path.join(root, "js"), { recursive: true });
fs.mkdirSync(path.join(root, "scripts"), { recursive: true });

fs.writeFileSync(path.join(root, "css/styles.css"), css);
fs.writeFileSync(path.join(dataDir, "categories.json"), JSON.stringify(CATEGORIES, null, 2) + "\n");
fs.writeFileSync(path.join(dataDir, "tracks.json"), JSON.stringify(TRACKS, null, 2) + "\n");
fs.writeFileSync(path.join(dataDir, "products.json"), JSON.stringify(products, null, 2) + "\n");
fs.writeFileSync(path.join(dataDir, "timelines.json"), JSON.stringify(TIMELINES, null, 2) + "\n");
fs.writeFileSync(path.join(root, "scripts/_logic-chunk.js"), logicChunk.trim() + "\n");

console.log("extracted to", root);
