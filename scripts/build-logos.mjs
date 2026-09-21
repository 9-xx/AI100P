// 把 100 款产品的头像抓取到本地 assets/logos/，构建期完成，运行时零外部依赖。
// 抓取链（逐级回退）：
//   1) 产品站点 /favicon.ico
//   2) icons.duckduckgo.com/ip3/<host>.ico
//   3) 根域名 /favicon.ico
//   4) www.google.com/s2/favicons?sz=128
// 校验：HTTP 200 + 真实图片 + >= 200B（滤掉 1x1 占位与错误页）。
// 全部失败 → 不落盘 → 前端继续用字母徽标兜底。
// 用法：npm run build:logos；增量：已存在文件跳过（--force 全量重抓）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(root, "assets/logos");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const MIN_BYTES = 200;
const force = process.argv.includes("--force");

const products = JSON.parse(fs.readFileSync(path.join(root, "data/products.json"), "utf8"));

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, ".gitkeep"),
  "# 产品头像（构建期抓取，自托管）。重建：npm run build:logos -- --force\n"
);

function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function rootOf(h) {
  const parts = (h || "").split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : h;
}

// 判断 Buffer 是否真实图片（ico/png/jpg/webp/svg），滤掉 HTML 错误页与占位图
function isImage(buf) {
  if (!buf || buf.length < MIN_BYTES) return false;
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return true;
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString("latin1") === "PNG") return true;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true; // jpeg
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01) return true; // ico
  const head = buf.subarray(0, 5).toString().toLowerCase();
  if (head.startsWith("<svg") || head.startsWith("<?xml") || head.startsWith("<sv")) return true;
  return false;
}

async function fetchBin(url, timeoutMs = 9000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA } });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return isImage(buf) ? buf : null;
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

async function grabOne(p) {
  const host = p.logo || hostOf(p.url);
  if (!host) return { id: p.id, ok: false, why: "no-host" };
  const file = path.join(OUT_DIR, p.id + ".ico");
  if (!force && fs.existsSync(file) && fs.statSync(file).size >= MIN_BYTES) {
    return { id: p.id, ok: true, why: "cached" };
  }
  const r = rootOf(host);
  const urls = [
    `https://${host}/favicon.ico`,
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
    `https://${r}/favicon.ico`,
    `https://www.google.com/s2/favicons?sz=128&domain=${host}`,
  ];
  for (const u of urls) {
    const buf = await fetchBin(u);
    if (buf) {
      fs.writeFileSync(file, buf);
      return { id: p.id, ok: true, why: u };
    }
  }
  return { id: p.id, ok: false, why: "all-failed" };
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

const results = await pool(products, 6, grabOne);
const ok = results.filter((r) => r.ok);
const fail = results.filter((r) => !r.ok);
for (const r of fail) console.log("MISS", r.id, r.why);
console.log(`logos: ${ok.length}/${products.length} cached`);
if (fail.length) console.log(`提示：${fail.length} 款缺失，前端自动回退字母徽标。可重跑 npm run build:logos 补抓`);
