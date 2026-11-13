import assert from "node:assert/strict";
import { allItems, guides, modules } from "../content.js";
import {
  fresh,
  sanitize,
  resumeItem,
  discover,
  discoveryExcerpt,
  confirmGuideStep,
  finishItem,
} from "../model.js";
const old = sanitize({
  completed: [1, 1, 999],
  saved: [29, 29, 999],
  positions: { 1: 3, 2: 2, 108: 3 },
  last: 2,
  chapter: 99,
});
assert.deepEqual(old.completed, [1]);
assert.deepEqual(old.saved, [29]);
assert.equal(old.chapter, modules.length - 1);
assert.equal(old.lessonProgress[2].practiced, true);
assert.deepEqual(old.guideDone[108], [0, 1, 2]);
assert.equal(resumeItem(old).id, 2);
const clean = sanitize(fresh());
assert.equal(resumeItem(clean).id, 1);
assert.ok(
  discover(allItems, { query: "  ПРЫЖОК  " }, clean).some((l) => l.id === 29),
);
assert.ok(
  discover(allItems, { query: "счет" }, clean).some((l) =>
    l.title.includes("Счёт"),
  ),
);
assert.ok(
  discover(allItems, { module: "5", type: "lesson" }, clean).every(
    (l) => l.module === 5 && l.kind === "lesson",
  ),
);
const guide = guides.find((g) => g.id === 108);
let step = confirmGuideStep(clean, guide, 4);
assert.equal(step, 0);
assert.deepEqual(clean.guideDone[108], [4]);
for (const i of [0, 1, 2]) confirmGuideStep(clean, guide, i);
step = confirmGuideStep(clean, guide, 3);
assert.equal(step, 5);
assert.equal(clean.completed.includes(108), false);
finishItem(clean, 108);
finishItem(clean, 108);
assert.equal(clean.completed.filter((x) => x === 108).length, 1);
const all = sanitize({ completed: allItems.map((i) => i.id) });
assert.equal(resumeItem(all), null);
const broken = sanitize({
  positions: [],
  saved: "no",
  completed: null,
  last: "x",
  guideDone: null,
  lessonProgress: [],
  theme: "bad",
});
assert.equal(broken.last, 1);
assert.equal(broken.theme, "light");
assert.deepEqual(broken.completed, []);
console.log(
  "PASS: legacy progress, search normalization, scoped filters, guide step tracking, no duplicate XP, completed-course state.",
);

assert.ok(
  discover(allItems, { query: "физика" }, sanitize(fresh())).some(
    (i) => i.id === 26,
  ),
);
assert.ok(
  discover(allItems, { query: "оркестратор" }, sanitize(fresh())).some(
    (i) => i.id === 11,
  ),
);

assert.ok(
  discover(allItems, { query: "Gatekeeper" }, sanitize(fresh())).some(
    (i) => i.id === 110,
  ),
);
assert.equal(
  sanitize({ pathLayout: "list", lessonReturn: { lessonId: 29, guideId: 105 } })
    .lessonReturn.lessonId,
  29,
);
assert.equal(
  sanitize({ lessonReturn: { lessonId: 999, guideId: 105 } }).lessonReturn,
  null,
);

const formerGraduate = sanitize({
  completed: [
    ...Array.from({ length: 50 }, (_, i) => i + 1),
    ...Array.from({ length: 10 }, (_, i) => i + 101),
  ],
});
assert.equal(resumeItem(formerGraduate).id, 51);
assert.equal(formerGraduate.completed.length, 60);
assert.equal(
  sanitize({ chapter: 11, discovery: { catalog: { module: "11" } } }).discovery
    .catalog.module,
  "11",
);

assert.ok(
  discoveryExcerpt(
    guides.find((g) => g.id === 110),
    "Gatekeeper",
  ).text.includes("Gatekeeper"),
);
