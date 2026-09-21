import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--dry-run");

function run(file) {
  const args = [file];
  if (dry && file.endsWith("update-roster.mjs")) args.push("--dry-run");
  const r = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status) process.exit(r.status);
}

console.log("[weekly]", new Date().toISOString(), dry ? "dry-run" : "live");
run("scripts/update-news.mjs");
run("scripts/update-roster.mjs");
run("scripts/build-data.mjs");
// 新产品周更换人后自动补抓头像（增量，已有的跳过）
run("scripts/build-logos.mjs");

const report = JSON.parse(fs.readFileSync(path.join(root, "data/roster-report.json"), "utf8"));
const news = JSON.parse(fs.readFileSync(path.join(root, "data/news.json"), "utf8"));
const summary = {
  ranAt: new Date().toISOString(),
  dryRun: dry,
  news: {
    updatedAt: news.updatedAt,
    withNews: news.stats?.withNews ?? 0,
    products: news.stats?.products ?? 0,
  },
  roster: report.totals,
};
fs.writeFileSync(path.join(root, "data/weekly-run.json"), JSON.stringify(summary, null, 2) + "\n");
console.log("[weekly] done", JSON.stringify(summary));
