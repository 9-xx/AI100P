import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logic = fs.readFileSync(path.join(root, "scripts/_logic-chunk.js"), "utf8");

const header = `/* 数据来自 js/data.js。内部按 lead/core/watch 分档排序，页面不展示名次。 */
const CATEGORIES = CATALOG.CATEGORIES;
const TRACKS = CATALOG.TRACKS;
const PRODUCTS = CATALOG.PRODUCTS;
const TIMELINES = CATALOG.TIMELINES;
const TIER_RANK = { lead: 0, core: 1, watch: 2 };
function catalogSort(a, b) {
  const ta = TIER_RANK[a.tier] ?? 1;
  const tb = TIER_RANK[b.tier] ?? 1;
  if (ta !== tb) return ta - tb;
  return (a.seed ?? 0) - (b.seed ?? 0);
}
function productsIn(pred) {
  return PRODUCTS.filter(pred).sort(catalogSort);
}

`;

fs.writeFileSync(path.join(root, "js/app.js"), header + logic);
console.log("wrote js/app.js");
