// Browser-independent progress and discovery rules. Keep v1 progress compatible.
import {
  allItems,
  lessons,
  guides,
  modules,
} from "./content.js?v=20261114-course";
const validIds = new Set(allItems.map((i) => i.id));
export const fresh = () => ({
  completed: [],
  saved: [],
  positions: {},
  lessonProgress: {},
  guideDone: {},
  last: 1,
  chapter: 0,
  theme: "light",
  pathLayout: "map",
  returnContext: null,
  lessonReturn: null,
  discovery: {
    catalog: { query: "", filter: "all", module: "all", type: "all" },
    guides: { query: "", filter: "all", module: "all", type: "all" },
  },
});
const ids = (value) =>
  Array.isArray(value)
    ? [...new Set(value.filter((id) => validIds.has(id)))]
    : [];
export function sanitize(raw) {
  const state = {
    ...fresh(),
    ...(raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}),
  };
  state.completed = ids(state.completed);
  state.saved = ids(state.saved);
  state.last = validIds.has(state.last) ? state.last : 1;
  state.chapter = Number.isInteger(state.chapter)
    ? Math.max(0, Math.min(modules.length - 1, state.chapter))
    : 0;
  state.pathLayout = state.pathLayout === "list" ? "list" : "map";
  state.theme = state.theme === "dark" ? "dark" : "light";
  const discovery = fresh().discovery;
  for (const view of ["catalog", "guides"]) {
    const p = state.discovery?.[view] || {};
    discovery[view] = {
      query: typeof p.query === "string" ? p.query.slice(0, 500) : "",
      filter: ["all", "new", "done", "saved"].includes(p.filter)
        ? p.filter
        : "all",
      module:
        p.module === "all" ||
        (Number.isInteger(Number(p.module)) &&
          Number(p.module) >= 0 &&
          Number(p.module) < modules.length)
          ? String(p.module)
          : "all",
      type: ["all", "lesson", "guide"].includes(p.type) ? p.type : "all",
    };
  }
  state.discovery = discovery;
  const lr = state.lessonReturn;
  state.lessonReturn =
    lr &&
    lessons.some((l) => l.id === lr.lessonId) &&
    guides.some((g) => g.id === lr.guideId)
      ? { lessonId: lr.lessonId, guideId: lr.guideId }
      : null;
  const r = state.returnContext;
  state.returnContext =
    r && ["path", "catalog", "guides"].includes(r.view)
      ? {
          view: r.view,
          y: Number.isFinite(r.y) ? Math.max(0, r.y) : 0,
          chapter: Number.isInteger(r.chapter)
            ? Math.max(0, Math.min(modules.length - 1, r.chapter))
            : 0,
          selector:
            typeof r.selector === "string" &&
            /^\[data-open="\d+"\]$/.test(r.selector)
              ? r.selector
              : null,
          index: Number.isInteger(r.index) ? Math.max(0, r.index) : 0,
        }
      : null;

  for (const key of ["positions", "lessonProgress", "guideDone"])
    if (
      !state[key] ||
      typeof state[key] !== "object" ||
      Array.isArray(state[key])
    )
      state[key] = {};
  for (const item of allItems) {
    const max = item.kind === "guide" ? item.steps.length : 3;
    const value = state.positions[item.id];
    if (value !== undefined)
      state.positions[item.id] = Number.isInteger(value)
        ? Math.max(0, Math.min(max, value))
        : 0;
    if (item.kind === "guide") {
      const previous = state.guideDone[item.id];
      state.guideDone[item.id] = Array.isArray(previous)
        ? [
            ...new Set(
              previous.filter((v) => Number.isInteger(v) && v >= 0 && v < max),
            ),
          ]
        : Array.from(
            {
              length: state.completed.includes(item.id)
                ? max
                : Math.min(state.positions[item.id] || 0, max),
            },
            (_, i) => i,
          );
    } else {
      const p = state.lessonProgress[item.id];
      state.lessonProgress[item.id] = {
        practiced: !!p?.practiced || (state.positions[item.id] || 0) >= 2,
        selected:
          Number.isInteger(p?.selected) && p.selected >= 0 && p.selected < 3
            ? p.selected
            : null,
        feedback: ["correct", "wrong"].includes(p?.feedback)
          ? p.feedback
          : null,
      };
      if (
        state.lessonProgress[item.id].feedback === "correct" &&
        state.lessonProgress[item.id].selected !== item.correct
      )
        state.lessonProgress[item.id].feedback = null;
    }
  }
  return state;
}
export function nextLesson(state) {
  return lessons.find((l) => !state.completed.includes(l.id)) || null;
}
export function resumeItem(state) {
  const last = allItems.find((i) => i.id === state.last);
  if (
    last &&
    !state.completed.includes(last.id) &&
    state.positions[last.id] !== undefined
  )
    return last;
  return (
    nextLesson(state) ||
    guides.find((g) => !state.completed.includes(g.id)) ||
    null
  );
}
export const normalize = (text) =>
  text
    .toLocaleLowerCase("ru")
    .replaceAll("ё", "е")
    .replace(/годот|готот/g, "godot")
    .replace(/оркестратор/g, "orchestrator")
    .trim()
    .replace(/\s+/g, " ");
export function discover(
  items,
  { query = "", filter = "all", module = "all", type = "all" } = {},
  state,
) {
  const tokens = normalize(query).split(" ").filter(Boolean);
  return items.filter((item) => {
    if (
      (filter === "saved" && !state.saved.includes(item.id)) ||
      (filter === "done" && !state.completed.includes(item.id)) ||
      (filter === "new" && state.completed.includes(item.id))
    )
      return false;
    if (module !== "all" && item.module !== Number(module)) return false;
    if (type !== "all" && item.kind !== type) return false;
    const hay = normalize(
      [
        item.title,
        modules[item.module].title,
        item.kind === "guide"
          ? [
              item.requires,
              ...item.steps.flatMap((s) => [
                s.title,
                s.action,
                s.expected,
                s.help,
              ]),
            ].join(" ")
          : [item.idea, item.detail, item.practice, item.expected].join(" "),
      ].join(" "),
    );
    return tokens.every((t) => hay.includes(t));
  });
}
export function confirmGuideStep(state, item, step) {
  const marked = new Set(state.guideDone[item.id] || []);
  marked.add(step);
  state.guideDone[item.id] = [...marked].sort((a, b) => a - b);
  if (marked.size === item.steps.length) return item.steps.length;
  for (let offset = 1; offset <= item.steps.length; offset++) {
    const next = (step + offset) % item.steps.length;
    if (!marked.has(next)) return next;
  }
  return 0;
}
export function finishItem(state, id) {
  if (!state.completed.includes(id)) state.completed.push(id);
}

// A result should explain why it matched, even when the title contains none of the query.
export function discoveryExcerpt(item, query) {
  const tokens = normalize(query).split(" ").filter(Boolean);
  const candidates =
    item.kind === "guide"
      ? [
          { text: item.requires, label: "Перед началом" },
          ...item.steps.map((s, i) => ({
            text: `${s.title}. ${s.action} ${s.expected} ${s.help}`,
            label: `Шаг ${i + 1}`,
          })),
        ]
      : [
          { text: item.idea, label: "Главная идея" },
          { text: item.detail, label: "Объяснение" },
          { text: item.practice, label: "Практика" },
          { text: item.expected, label: "Результат задания" },
        ];
  const match = tokens.length
    ? candidates
        .map((c) => ({
          ...c,
          score: tokens.filter((t) => normalize(c.text).includes(t)).length,
        }))
        .sort((a, b) => b.score - a.score)[0]
    : candidates[0];
  if (tokens.length && match.score) {
    const sentences = match.text
      .split(/(?<=[.!?])\s+(?=[А-ЯЁA-Z])/)
      .filter(Boolean);
    const sentence = sentences
      .map((text) => ({
        text,
        score: tokens.filter((t) => normalize(text).includes(t)).length,
      }))
      .sort((a, b) => b.score - a.score)[0];
    return { ...match, text: sentence.text };
  }
  return match;
}
