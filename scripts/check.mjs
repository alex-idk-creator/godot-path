import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { lessons, guides, modules, allItems } from "../content.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
assert.equal(lessons.length, 60);
assert.equal(guides.length, 13);
assert.equal(modules.length, 12);
assert.equal(new Set(allItems.map((x) => x.id)).size, 73);
assert.equal(new Set(lessons.map((x) => x.title)).size, 60);
for (const m of modules)
  assert.equal(lessons.filter((l) => l.module === m.id).length, 5);
for (const l of lessons) {
  for (const field of [
    "idea",
    "detail",
    "practice",
    "question",
    "explanation",
    "expected",
  ])
    assert.ok(l[field]?.length > 20, `${l.id} ${field}`);
  assert.equal(l.answers.length, 3);
  assert.equal(new Set(l.answers).size, 3);
  assert.ok(l.correct >= 0 && l.correct < 3);
  assert.ok(l.source.startsWith("https://"));
  assert.ok(
    guides.some((g) => g.id === l.guideId),
    `Missing walkthrough for ${l.id}`,
  );
}
for (const g of guides) {
  assert.ok(g.steps.length >= 4);
  for (const s of g.steps)
    for (const f of ["title", "action", "expected", "help"])
      assert.ok(s[f]?.length > (f === "title" ? 3 : 10), `${g.id} ${f}`);
}
for (const file of ["app.js", "content.js", "model.js", "scripts/serve.mjs"])
  execFileSync(process.execPath, ["--check", path.join(root, file)]);
const html = readFileSync(path.join(root, "index.html"), "utf8");
assert.match(html, /lang="ru"/);
assert.match(html, /viewport/);
assert.ok(!html.includes("http://"));
console.log(
  "PASS: 60 unique lessons, 13 complete guides, 12 chapters, content and JavaScript checks.",
);

await import("./model-check.mjs");
