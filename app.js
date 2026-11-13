import {
  modules,
  lessons,
  guides,
  allItems,
} from "./content.js?v=20261114-course";
import {
  fresh,
  sanitize,
  nextLesson as findNext,
  resumeItem as findResume,
  discover,
  discoveryExcerpt,
  confirmGuideStep,
  finishItem,
} from "./model.js?v=20261114-course";
const app = document.querySelector("#app"),
  KEY = "godot-path-v1";
let state,
  storageWarning = false;
try {
  state = sanitize(JSON.parse(localStorage.getItem(KEY) || "null"));
} catch {
  state = sanitize(fresh());
}
let view = "path",
  chapter = state.chapter,
  active = null,
  stage = 0,
  selected = null,
  feedback = null,
  practiced = false,
  reviewing = false,
  returnContext = state.returnContext || null;
const catalogState = state.discovery;
const done = (id) => state.completed.includes(id),
  saved = (id) => state.saved.includes(id);
const nextLesson = () => findNext(state),
  resumeItem = () => findResume(state);
const hasStarted = () =>
  Object.keys(state.positions).length > 0 || state.completed.length > 0;
const count = () => lessons.filter((l) => done(l.id)).length;
const percent = () => Math.round((count() / lessons.length) * 100);
const xp = () =>
  state.completed.reduce(
    (n, id) => n + (guides.some((g) => g.id === id) ? 30 : 20),
    0,
  );
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const plural = (n, one, few, many) =>
  n % 100 >= 11 && n % 100 <= 14
    ? many
    : n % 10 === 1
      ? one
      : n % 10 >= 2 && n % 10 <= 4
        ? few
        : many;
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageWarning = false;
  } catch {
    storageWarning = true;
  }
}
const terms = [
  "Godot|Orchestrator|Игровые правила",
  "project.godot|Import|Compatibility",
  "Scene|FileSystem|Inspector",
  "Node3D|Родитель|Дочерний узел",
  "Сцена|Экземпляр|.tscn",
  "X — стороны|Y — высота|Z — глубина",
  "Position|Rotation|Scale",
  "Mesh|Material|Albedo",
  "Camera3D|Current|Preview",
  "DirectionalLight3D|Поворот|Запуск",
  "GDExtension|Совместимость|macOS",
  "Orchestrator|EventGraph|.torch",
  "_ready|Print String|Начальная настройка",
  "Выполнение|Данные|Соединения",
  "Порядок|Связи|Комментарии",
  "Переменная|Тип|Начальное значение",
  "Get|Сложение|Set",
  "Условие|Branch|true / false",
  "AND|OR|NOT",
  "Функция|Аргумент|Вызов",
  "Input Map|Действие|Клавиши",
  "Pressed|Just Pressed|Input Action",
  "Vector3|Направление|Скорость",
  "_physics_process|delta|velocity",
  "get_vector|Длина|Диагональ",
  "CharacterBody3D|CollisionShape3D|Модель",
  "StaticBody3D|BoxShape3D|Пол",
  "Гравитация|velocity.y|Приземление",
  "jump|is_on_floor|move_and_slide",
  "Collision Layer|Collision Mask|World",
  "Сигнал|Обработчик|Подключение",
  "Area3D|body_entered|Monitoring",
  "Группа|player|is_in_group",
  "collected|add_score|queue_free",
  "Timer|Wait Time|timeout",
  "PackedScene|instantiate|add_child",
  "randf_range|Диапазон|Высота",
  "round_over|Состояние|Победа",
  "AnimationPlayer|Ключи|Цикл",
  "Blender|GLB|Visual",
  "CanvasLayer|Control|Label",
  "Якоря|Контейнеры|Размер окна",
  "score|str|Label.text",
  "Button|pressed|reload_current_scene",
  "paused|Process Mode|Продолжение",
  "Событие|Проверка|Результат",
  "Monitors|FPS|Время кадра",
  "Игровая петля|Крайние случаи|Повтор",
  "Export Templates|macOS|Сборка",
  "Исходники|GitHub|Резервная копия",
  "FileSystem|Зависимости|Перемещение",
  "Material|Make Unique|Ресурс",
  "value|exported|Экземпляр",
  "get_node_or_null|is_instance_valid|Путь",
  "game_manager|call|Аргументы",
  "checkpoint_position|Vector3|global_position",
  "respawn|velocity|Граница падения",
  "Area3D|Marker3D|set_checkpoint",
  "ConfigFile|user://|save",
  "load|get_value|Проверка типа",
];
const technical =
  /\b(?:[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+|[A-Za-z][A-Za-z0-9_]*\.(?:torch|tscn|godot|blend|dylib|glb)|[A-Z][A-Za-z0-9]*(?:3D|2D)|Vector3|PackedScene|AnimationPlayer|CanvasLayer|Control|Label|Button|Timer|EventGraph|Input|Main|Player|Ground|Item|Visual|Branch|Compatibility|Inspector|FileSystem|true|false|int|float|bool)\b/g;
function rich(text) {
  let out = "",
    end = 0;
  for (const match of text.matchAll(technical)) {
    out += esc(text.slice(end, match.index)) + `<code>${esc(match[0])}</code>`;
    end = match.index + match[0].length;
  }
  return out + esc(text.slice(end));
}
function actions(text) {
  return text.split(/(?<=[.!?])\s+(?=[А-ЯЁA-Z])/).filter(Boolean);
}
function stageName(item, position) {
  return item.kind === "guide"
    ? `Шаг ${Math.min(position + 1, item.steps.length)} из ${item.steps.length}`
    : ["Знакомство", "Практика", "Проверка"][Math.min(position, 2)];
}
function labelFor(id) {
  const item = allItems.find((i) => i.id === id);
  return done(id)
    ? "Повторить"
    : state.positions[id] !== undefined
      ? "Продолжить"
      : "Открыть";
}
const returnLabel = () =>
  active?.id === state.lessonReturn?.guideId
    ? `К уроку ${state.lessonReturn.lessonId}`
    : returnContext?.view === "catalog"
      ? "К каталогу"
      : returnContext?.view === "guides"
        ? "К гайдам"
        : "К пути обучения";
const icons = {
  compass:
    '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
  cube: '<path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 9 9-4M12 12 3 8m9 4v10"/>',
  nodes:
    '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 6h6v12M9 18h6"/><rect x="3" y="15" width="6" height="6" rx="1"/>',
  branch:
    '<path d="M6 4v8c0 4 12 0 12 5v3M6 12v8m12-16v3c0 4-12 0-12 5"/><circle cx="6" cy="3" r="1"/><circle cx="18" cy="3" r="1"/>',
  gamepad:
    '<path d="M7 7h10c3 0 5 10 3 11-2 2-4-2-5-2H9c-1 0-3 4-5 2C2 17 4 7 7 7Z"/><path d="M8 10v5m-2.5-2.5h5M16 11h.1M18 14h.1"/>',
  layers: '<path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5"/>',
  spark:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/><path d="M4 5v14"/>',
  window:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18m-14-3h.1M10 6h.1M7 13h5m-5 3h9"/>',
  flag: '<path d="M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  bookmark: '<path d="M6 3h12v19l-6-5-6 5V3Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  github:
    '<path d="M9 19c-5 1-5-2-7-2m14 5v-4c0-1-.4-2-1-2 4 0 7-2 7-6 0-2-1-3-2-4 0-1 0-2-.5-3-2 0-3 1-4 2a13 13 0 0 0-7 0C7 4 6 3 4 3c-.5 1-.5 2-.5 3-1 1-2 2-2 4 0 4 3 6 7 6-1 1-1 2-1 3v3"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;
function illustration() {
  return `<div class="hero-art" aria-label="Схема: событие, условие и результат в 3D-сцене" role="img"><div class="art-top"><span><i></i> ТВОЯ ПЕРВАЯ ИГРА</span><span>3D / VISUAL SCRIPT</span></div><svg viewBox="0 0 560 310" class="scene-art" aria-hidden="true"><defs><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" opacity=".15"/></pattern><linearGradient id="platform" x2="0" y2="1"><stop stop-color="#dbeeed"/><stop offset="1" stop-color="#c8dede"/></linearGradient></defs><rect width="560" height="310" fill="url(#grid)"/><ellipse cx="295" cy="248" rx="168" ry="32" fill="#0b6d6f" opacity=".05"/><path d="m116 185 166-88 166 88-166 90Z" fill="url(#platform)" stroke="#9dbdbb"/><path d="M116 185v17l166 91v-18m0 0 166-90v17l-166 91" fill="#adcdcb" stroke="#92b6b4"/><path d="m165 186 117-62 117 62-117 64Z" fill="none" stroke="#a7c9c6"/><path d="m207 119 74-40 74 40-74 40Z" fill="#f8df7b" stroke="#c9ad4b"/><path d="M207 119v65l74 40v-65Z" fill="#e4bf45" stroke="#c9ad4b"/><path d="m281 159 74-40v65l-74 40Z" fill="#efd064" stroke="#c9ad4b"/><path d="M280 72V30m-7 7 7-7 7 7" stroke="#0b6d6f" stroke-width="2"/><text x="291" y="38" fill="#0b6d6f" font-size="12" font-family="system-ui">Y</text><path d="M374 205h68m-7-7 7 7-7 7" stroke="#da7064" stroke-width="2"/><text x="450" y="209" fill="#c56459" font-size="12" font-family="system-ui">X</text><path d="m175 215-40 24m3-10-3 10 10-1" stroke="#5b8fb0" stroke-width="2"/><text x="119" y="253" fill="#5b8fb0" font-size="12" font-family="system-ui">Z</text></svg><div class="art-flow"><span class="flow-node event-node"><i></i> Ready</span><span class="flow-wire"></span><span class="flow-node"><i></i> Твоя идея</span><span class="flow-wire"></span><span class="flow-node result-node">${icon("play")} Игра</span></div><p class="art-caption">Маленькие шаги. Настоящие игровые механики.</p></div>`;
}

function themeButton() {
  return `<button class="icon-button" data-action="theme" aria-label="${state.theme === "dark" ? "Светлая" : "Тёмная"} тема" title="${state.theme === "dark" ? "Светлая" : "Тёмная"} тема">${icon(state.theme === "dark" ? "sun" : "moon")}</button>`;
}
function header() {
  return `<header class="header"><a class="brand" href="#path" aria-label="Godot Path — главная"><img src="./mark.svg" width="39" height="39" alt=""><span>Godot<span class="brand-light"> Path</span><small>СОЗДАВАЙ. ШАГ ЗА ШАГОМ.</small></span></a><nav class="top-nav" aria-label="Основная навигация">${[
    ["path", "Путь обучения"],
    ["guides", "Гайды"],
    ["catalog", "Каталог"],
  ]
    .map(
      ([key, label]) =>
        `<a href="#${key}" ${view === key ? 'aria-current="page"' : ""}>${label}</a>`,
    )
    .join(
      "",
    )}</nav><div class="header-tools"><span class="xp" title="Очки за пройденные уроки и гайды" aria-label="${xp()} очков опыта">${icon("spark")}<b>${xp()}</b> XP</span>${themeButton()}</div></header>`;
}
function progressCard() {
  return `<aside class="progress-card"><div class="card-heading"><span>Твой прогресс</span>${icon("flag")}</div><div class="progress-number">${count()}<span> / ${lessons.length} уроков</span></div><div class="meter" role="progressbar" aria-label="Пройдено уроков" aria-valuemin="0" aria-valuemax="${lessons.length}" aria-valuenow="${count()}"><i style="width:${percent()}%"></i></div><p>${count() === 0 ? "Начни с первой сцены — дальше шаг за шагом." : count() === lessons.length ? "Все уроки пройдены. Нужная механика всегда есть в каталоге." : "Твои уроки и отмеченные шаги сохраняются автоматически."}</p><span class="small-meta">${guides.filter((g) => done(g.id)).length} из ${guides.length} гайдов пройдено</span></aside>`;
}
function pathView() {
  const mod = modules[chapter],
    group = lessons.filter((l) => l.module === chapter),
    recommend =
      guides.find((g) => g.module === chapter) ||
      guides.find((g) => g.id === group[0].guideId),
    resume = resumeItem();
  const started = hasStarted();
  return `<section class="hero ${started ? "is-returning" : ""}"><div class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> GODOT + ORCHESTRATOR</div><h1>${started && !resume ? "Ты прошёл<br><em>весь путь.</em>" : started ? "Следующий шаг<br>к <em>своей игре.</em>" : "От первой сцены<br>до <em>своей игры.</em>"}</h1><p>${started && !resume ? `Все ${lessons.length} уроков и ${guides.length} гайдов пройдены.<br class="desktop-br"> Возвращайся к нужной теме в любой момент.` : started ? 'Твой маршрут сохранён. Продолжай с того места,<br class="desktop-br"> где остановился.' : 'Создавай 3D-игры, соединяя блоки логики.<br class="desktop-br"> Один понятный шаг за раз — в твоём темпе.'}</p>${started && resume ? `<div class="resume-context"><span>${resume.kind === "guide" ? "ПОШАГОВЫЙ ГАЙД" : `УРОК ${String(resume.id).padStart(2, "0")}`} · ${stageName(resume, state.positions[resume.id] || 0)}</span><strong>${resume.title}</strong></div>` : ""}<div class="hero-actions">${resume ? `<button class="button primary" data-open="${resume.id}">${started ? "Продолжить обучение" : "Начать путь"} ${icon("arrow")}</button>` : `<a class="button primary" href="#catalog">Весь курс пройден · открыть каталог ${icon("check")}</a>`}<a class="button ghost" href="${started ? "#path" : "#guides"}" ${started ? 'data-action="show-path"' : ""}>${started ? "К дорожке уроков" : "Открыть гайды"} ${icon(started ? "compass" : "book")}</a></div>${started ? `<div class="inline-progress"><span><b>${count()}</b> из ${lessons.length} уроков</span><div class="meter" role="progressbar" aria-label="Пройдено уроков" aria-valuemin="0" aria-valuemax="${lessons.length}" aria-valuenow="${count()}"><i style="width:${percent()}%"></i></div><span>${percent()}%</span></div>` : `<div class="hero-facts"><span><b>${lessons.length}</b> уроков</span><span><b>${guides.length}</b> пошаговых гайдов</span><span><b>0 ₽</b> за весь курс</span></div>`}</div>${illustration()}</section><section class="learning-section" id="learning"><div class="section-title"><div><div class="eyebrow">ТВОЙ МАРШРУТ</div><h2>От идеи до первой игры</h2></div><span class="version-label">Godot 4.7 · Orchestrator 2.5</span></div><div class="learning-layout"><aside class="chapters"><span class="rail-title">${modules.length} ГЛАВ ПУТИ</span><label class="mobile-chapter-select">Выбрать главу<select id="chapter-select">${modules.map((m) => `<option value="${m.id}" ${m.id === chapter ? "selected" : ""}>${m.number}. ${m.title}</option>`).join("")}</select></label><nav aria-label="Главы курса">${modules.map((m) => `<button class="chapter ${m.id === chapter ? "active" : ""}" data-chapter="${m.id}" ${m.id === chapter ? 'aria-current="step"' : ""}><span class="chapter-number">${lessons.filter((l) => l.module === m.id && done(l.id)).length === 5 ? icon("check") : m.number}</span><span>${m.title}<small>${lessons.filter((l) => l.module === m.id && done(l.id)).length} из 5 пройдено</small></span></button>`).join("")}</nav></aside><div class="path-panel"><div class="chapter-banner"><div><small>ГЛАВА ${mod.number} · 5 УРОКОВ</small><h3>${mod.title}</h3><p>${mod.description}</p></div><span class="banner-icon">${icon(mod.icon)}</span></div><div class="path-toolbar"><span>Уроки главы</span><div class="layout-switch" role="group" aria-label="Вид уроков">${[
    ["map", "Дорожка"],
    ["list", "Список"],
  ]
    .map(
      ([value, label]) =>
        `<button data-layout="${value}" aria-pressed="${state.pathLayout === value}">${label}</button>`,
    )
    .join(
      "",
    )}</div></div><div class="lesson-path ${state.pathLayout === "list" ? "is-list" : ""}"><svg class="path-line" viewBox="0 0 450 650" preserveAspectRatio="none" aria-hidden="true"><path d="M225 45C225 110 330 110 330 170S225 230 225 295 120 355 120 420 225 480 225 545"/></svg>${group.map((l, i) => `<button class="path-stop stop-${i}" data-open="${l.id}" aria-label="Урок ${l.id}: ${esc(l.title)}${done(l.id) ? ", пройден" : l.id === nextLesson()?.id ? ", следующий урок" : ""}"><span class="lesson-orb ${done(l.id) ? "done" : l.id === nextLesson()?.id ? "current" : ""}">${done(l.id) ? icon("check") : icon(i === 0 ? mod.icon : i === 4 ? "flag" : "book")}</span><span class="stop-label"><small>УРОК ${String(l.id).padStart(2, "0")} · ${l.minutes} МИН</small><strong>${l.title}</strong>${l.id === nextLesson()?.id ? `<span class="path-current-label">${hasStarted() ? "Следующий урок" : "Начни здесь"}</span>` : ""}</span></button>`).join("")}</div><div class="chapter-pager"><button class="button ghost" data-action="prev-chapter" ${chapter === 0 ? "disabled" : ""} aria-label="Предыдущая глава">← Назад</button><span>Глава ${chapter + 1} из ${modules.length}</span><button class="button ghost" data-action="next-chapter" ${chapter === modules.length - 1 ? "disabled" : ""} aria-label="Следующая глава">Дальше →</button></div></div><aside class="path-aside">${progressCard()}<article class="guide-promo"><span class="pill">ПОШАГОВЫЙ ГАЙД</span>${icon(mod.icon, "promo-icon")}<h3>${recommend.title}</h3><p>Конкретные действия, ожидаемый результат и помощь на каждом шаге.</p><button class="text-button" data-open="${recommend.id}">${labelFor(recommend.id)} гайд ${icon("arrow")}</button></article></aside></div></section>`;
}
function bookmarkButton(item) {
  return `<button class="icon-button save ${saved(item.id) ? "is-saved" : ""}" data-save="${item.id}" aria-label="${saved(item.id) ? "Убрать из сохранённого" : "Сохранить"}: ${esc(item.title)}" aria-pressed="${saved(item.id)}" title="${saved(item.id) ? "Убрать из сохранённого" : "Сохранить материал"}">${icon("bookmark")}</button>`;
}
function card(item) {
  const excerpt = discoveryExcerpt(item, catalogState[view]?.query || "");
  const inProgress = !done(item.id) && state.positions[item.id] !== undefined;
  return `<article class="content-card ${inProgress ? "in-progress" : ""}"><div class="card-top"><span class="pill ${item.kind === "guide" ? "guide-pill" : ""}">${item.kind === "guide" ? `Гайд · ${item.steps.length} ${plural(item.steps.length, "шаг", "шага", "шагов")}` : `Урок ${String(item.id).padStart(2, "0")}`}</span>${bookmarkButton(item)}</div><a class="card-open" href="#${item.kind}/${item.id}" data-open="${item.id}" aria-label="${labelFor(item.id)}: ${esc(item.title)}"><small class="small-meta">Глава ${modules[item.module].number} · ${modules[item.module].title}</small><h3>${item.title}</h3><p>${catalogState[view]?.query ? `<span class="match-label">${excerpt.label}</span>` : ""}${esc(excerpt.text)}</p><div class="card-bottom"><span class="${inProgress ? "in-progress-label" : ""}">${done(item.id) ? `${icon("check")} Пройдено` : inProgress ? `${icon("play")} ${item.kind === "guide" ? `${(state.guideDone[item.id] || []).length} из ${item.steps.length} шагов` : stageName(item, state.positions[item.id])}` : `${item.minutes} мин · ${item.kind === "guide" ? 30 : 20} XP`}</span><span class="text-button">${labelFor(item.id)} ${icon("arrow")}</span></div></a></article>`;
}
function catalogResults() {
  const cfg = catalogState[view],
    isGuides = view === "guides";
  const items = discover(isGuides ? guides : allItems, cfg, state);
  const emptySaved =
    cfg.filter === "saved" &&
    !cfg.query &&
    !(isGuides ? guides : allItems).some((i) => saved(i.id));
  return `<div class="results-meta" role="status" aria-live="polite" aria-atomic="true">${items.length} ${plural(items.length, "материал", "материала", "материалов")}${cfg.query.trim() ? ` по запросу «${esc(cfg.query.trim())}»` : ""}</div><div class="content-grid">${items.map(card).join("")}</div>${!items.length ? `<div class="empty">${icon(cfg.filter === "saved" ? "bookmark" : "search")}<h2>${emptySaved ? "Пока ничего не сохранено" : "Ничего не нашлось"}</h2><p>${emptySaved ? "Нажми на закладку у нужного материала — он появится здесь." : "Попробуй короче сформулировать запрос или сбрось фильтры."}</p><button class="button" data-action="clear-search">${emptySaved ? "Посмотреть все материалы" : "Сбросить поиск и фильтры"}</button></div>` : ""}`;
}
function catalogView() {
  const isGuides = view === "guides",
    cfg = catalogState[view];
  return `<section class="catalog"><div class="catalog-intro"><div class="eyebrow">${isGuides ? "РЯДОМ С ТВОИМ РЕДАКТОРОМ" : "ВСЁ ДЛЯ ТВОЕЙ ПЕРВОЙ ИГРЫ"}</div><h1>${isGuides ? "Подсказка на каждом шаге." : "Найди свой следующий шаг."}</h1><p>${isGuides ? `${guides.length} гайдов: что нажать, что должно получиться и как исправить ошибку.` : `${lessons.length} уроков и ${guides.length} гайдов. Учись по пути или сразу открой нужную механику.`}</p></div><div class="catalog-controls"><div class="catalog-tools"><label class="search">${icon("search")}<input id="course-search" type="search" placeholder="${isGuides ? "Название гайда или действие…" : "Например: камера, прыжок, материал…"}" aria-label="Поиск по курсу" value="${esc(cfg.query)}" autocomplete="off"></label><label class="chapter-filter"><span class="sr-only">Фильтр по главе</span><select id="catalog-chapter" aria-label="Фильтр по главе"><option value="all">Все главы</option>${modules.map((m) => `<option value="${m.id}" ${String(m.id) === String(cfg.module) ? "selected" : ""}>${m.number}. ${m.title}</option>`).join("")}</select></label>${isGuides ? "" : `<label class="type-filter"><span class="sr-only">Тип материала</span><select id="catalog-type" aria-label="Тип материала"><option value="all" ${cfg.type === "all" ? "selected" : ""}>Уроки и гайды</option><option value="lesson" ${cfg.type === "lesson" ? "selected" : ""}>Только уроки</option><option value="guide" ${cfg.type === "guide" ? "selected" : ""}>Только гайды</option></select></label>`}</div><div class="filter-row"><div class="filters" aria-label="Статус материалов">${[
    ["all", "Все"],
    ["new", "Не пройдены"],
    ["saved", "Сохранённые"],
    ["done", "Пройдены"],
  ]
    .map(
      ([v, t]) =>
        `<button data-filter="${v}" class="${v === cfg.filter ? "active" : ""}" aria-pressed="${v === cfg.filter}">${t}</button>`,
    )
    .join(
      "",
    )}</div><button class="text-button reset-filters" data-action="clear-search" ${cfg.query || cfg.filter !== "all" || cfg.module !== "all" || cfg.type !== "all" ? "" : "hidden"}>Сбросить фильтры ${icon("close")}</button></div></div><div id="catalog-results">${catalogResults()}</div></section>`;
}
function footer() {
  return `<footer class="footer"><a class="brand footer-brand" href="#path"><img src="./mark.svg" width="29" height="29" alt=""><b>Godot Path</b></a><p>От идеи до игры. В твоём темпе.</p><div><a href="https://docs.godotengine.org/en/stable/" target="_blank" rel="noopener noreferrer">Godot ↗</a><a href="https://github.com/CraterCrash/godot-orchestrator/tree/2.5" target="_blank" rel="noopener noreferrer">Orchestrator ↗</a><a href="https://github.com/alex-idk-creator/godot-path" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div><small>Прогресс хранится в этом браузере. Практику выполняй в Godot — сайт не подключён к редактору.</small></footer>`;
}
function revealChapter() {
  const rail = document.querySelector(".chapters nav");
  const current = document.querySelector(".chapter.active");
  if (!rail?.clientHeight || !current) return;
  const r = rail.getBoundingClientRect(),
    c = current.getBoundingClientRect();
  const visibleHeight = Math.max(
    c.height,
    Math.min(rail.clientHeight, innerHeight - r.top - 20),
  );
  rail.scrollTop += c.top - r.top - (visibleHeight - c.height) / 2;
}
function render(options = {}) {
  const y = scrollY,
    expanded = [...app.querySelectorAll("details[open][id]")].map((e) => e.id);
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name="theme-color"]').content =
    state.theme === "dark" ? "#0e1319" : "#f6f8fb";
  document.title = active
    ? `${active.title} — Godot Path`
    : "Godot Path — от идеи до игры";
  app.innerHTML = active
    ? reader()
    : `${header()}<main id="main" tabindex="-1">${view === "path" ? pathView() : catalogView()}</main>${footer()}`;
  if (storageWarning) {
    const p = document.createElement("p");
    p.className = "storage-warning";
    p.setAttribute("role", "status");
    p.textContent =
      "Не удалось сохранить прогресс в браузере. До закрытия вкладки он остаётся здесь.";
    app.prepend(p);
  }
  if (options.preserve) {
    expanded.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.open = true;
    });
    window.scrollTo({ top: y, behavior: "instant" });
  }
  revealChapter();
  if (options.focus) {
    const target = document.querySelector(options.focus);
    target?.focus({ preventScroll: true });
    if (options.reveal)
      target?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
}
function reader() {
  const guide = active.kind === "guide",
    max = guide ? active.steps.length : 3,
    finished = stage === max;
  const guideChecks = state.guideDone[active.id] || [];
  const progress = finished
    ? 100
    : guide
      ? Math.round(((reviewing ? stage : guideChecks.length) / max) * 100)
      : Math.round((stage / 3) * 100);
  const label = finished
    ? "Готово"
    : guide
      ? `Шаг ${stage + 1} из ${max}`
      : ["Знакомство", "Практика", "Проверка"][stage];
  return `<div class="reader"><header class="reader-header"><button class="icon-button" data-action="exit" aria-label="${returnLabel()}" title="${returnLabel()}">${icon("close")}</button><div class="reader-meter"><div class="reader-context"><span>${guide ? "Гайд" : `Урок ${String(active.id).padStart(2, "0")}`}${reviewing ? " · повторение" : ""}<span class="reader-item-title"> · ${esc(active.title)}</span></span><strong>${label}</strong></div><div class="meter" role="progressbar" aria-label="Прогресс материала" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div></div><div class="reader-tools">${bookmarkButton(active)}${themeButton()}</div></header><main id="main" class="reader-main" tabindex="-1">${finished ? finishScreen() : guide ? guideScreen() : lessonScreen()}</main>${finished ? "" : readerFooter()}</div>`;
}
function readerFooter() {
  const guide = active.kind === "guide",
    checks = state.guideDone[active.id] || [];
  const willFinish =
    guide &&
    (reviewing
      ? stage === active.steps.length - 1
      : checks.length === active.steps.length - 1 && !checks.includes(stage));
  const quiz = !guide && stage === 2;
  const label = guide
    ? willFinish
      ? "Завершить гайд"
      : checks.includes(stage)
        ? "Следующий шаг"
        : "Шаг сделан"
    : stage === 0
      ? "К практике"
      : stage === 1
        ? "Проверить себя"
        : feedback === "correct"
          ? "Завершить урок"
          : feedback === "wrong"
            ? "Проверить ещё раз"
            : "Проверить ответ";
  const disabled =
    !guide && ((stage === 1 && !practiced) || (quiz && selected === null));
  return `<footer class="reader-footer"><div class="reader-footer-inner"><button class="button ghost" data-action="back" ${stage === 0 ? "disabled" : ""}>← Назад</button><span class="footer-context ${feedback === "correct" ? "is-correct" : ""}">${quiz ? (feedback === "correct" ? `${icon("check")} Ответ верный` : feedback === "wrong" ? "Можно попробовать ещё" : "Выбери один ответ") : guide ? `${checks.length} из ${active.steps.length} шагов отмечено` : stage === 1 ? (practiced ? "Практика отмечена" : "Сначала попробуй задание") : "Без спешки, в своём темпе"}</span><button class="button primary" data-action="advance" ${disabled ? "disabled" : ""}>${label} ${icon(quiz && feedback !== "correct" ? "check" : "arrow")}</button></div></footer>`;
}
function stageTabs() {
  return `<nav class="lesson-stages" aria-label="Этапы урока">${["Разобраться", "Попробовать", "Проверить"].map((s, i) => `<button data-stage="${i}" ${i === stage ? 'aria-current="step"' : ""} ${i === 2 && !practiced ? 'disabled title="Сначала отметь выполнение практики"' : ""}><span>${i + 1}</span>${s}</button>`).join("")}</nav>`;
}
function practiceGuide() {
  const g =
    guides.find((g) => g.id === active.guideId) ||
    guides.find((g) => g.module === active.module);
  return g
    ? `<aside class="practice-guide"><div>${icon("nodes")}<span><b>Нужны действия по шагам?</b><small>${esc(g.title)}</small></span></div><button class="text-button" data-open="${g.id}" data-related="true">Открыть гайд ${icon("arrow")}</button></aside>`
    : "";
}
function lessonScreen() {
  const nav = stageTabs();
  if (stage === 0)
    return `${nav}<div class="reader-eyebrow">${icon(modules[active.module].icon)} ГЛАВА ${modules[active.module].number} · ${modules[active.module].title.toUpperCase()}</div><h1>${active.title}</h1><p class="lesson-lead">${rich(active.idea)}</p><div class="lesson-terms"><span>В этом уроке</span><ul>${terms[
      active.id - 1
    ]
      .split("|")
      .map((t) => `<li>${rich(t)}</li>`)
      .join(
        "",
      )}</ul></div><div class="explanation"><h2>Как это работает</h2><p>${rich(active.detail)}</p></div><a class="source-link" href="${active.source}" target="_blank" rel="noopener noreferrer">Официальная справка ↗</a>`;
  if (stage === 1)
    return `${nav}<div class="reader-eyebrow">${icon("play")} ПРАКТИКА</div><h1>${active.title}</h1><p class="lesson-subtitle">Выполни действия и сравни результат. Если нужен Godot, держи проект рядом.</p><div class="practice-box"><h2>Твоё задание</h2><ol class="action-list">${actions(
      active.practice,
    )
      .map((s) => `<li>${rich(s)}</li>`)
      .join(
        "",
      )}</ol><div class="practice-outcome expected">${icon("check")}<div><b>Проверь результат</b><p>${rich(active.expected)}</p></div></div></div>${practiceGuide()}<label class="practice-confirm"><input type="checkbox" id="practiced" ${practiced ? "checked" : ""}><span>Я выполнил практическое задание</span>${practiced ? icon("check") : ""}</label><p class="privacy-note">Ты сам отмечаешь выполнение. Отметка сохранится, если вернёшься к объяснению или закроешь урок.</p><a class="source-link" href="${active.source}" target="_blank" rel="noopener noreferrer">Свериться с документацией ↗</a>`;
  return `${nav}<div class="reader-eyebrow">${icon("spark")} ПРОВЕРКА НОВОЙ ИДЕИ</div><h1>${active.question}</h1><p class="lesson-subtitle">Один ответ. Ошибаться можно — попытки не ограничены.</p><fieldset class="answers"><legend class="sr-only">Варианты ответа</legend>${answersFor(
    active,
  )
    .map(
      (a, i) =>
        `<label class="answer ${selected === a.index ? "selected" : ""} ${selected === a.index && feedback ? (feedback === "correct" ? "correct" : "incorrect") : ""}"><input type="radio" name="answer" value="${a.index}" ${selected === a.index ? "checked" : ""} ${feedback === "correct" ? "disabled" : ""}><span class="answer-letter">${i + 1}</span><span>${rich(a.text)}</span>${feedback === "correct" && selected === a.index ? icon("check") : ""}</label>`,
    )
    .join(
      "",
    )}</fieldset><div class="feedback ${feedback || ""}" role="status" aria-live="polite" tabindex="-1">${feedback ? `<b>${feedback === "correct" ? "Да, именно так." : "Пока не так. Попробуй ещё раз."}</b><p>${rich(active.explanation)}</p>` : ""}</div>`;
}
function answersFor(l) {
  const values = l.answers.map((text, index) => ({ text, index }));
  const shift = l.id % values.length;
  return [...values.slice(shift), ...values.slice(0, shift)];
}
function guideScreen() {
  const s = active.steps[stage],
    checks = state.guideDone[active.id] || [];
  return `<div class="reader-eyebrow">${icon("nodes")} ПОШАГОВЫЙ ГАЙД · ${active.minutes} МИН</div><h1>${active.title}</h1><p class="guide-requires">${rich(active.requires)}</p><div class="guide-navigation"><nav class="guide-steps" aria-label="Шаги гайда">${active.steps.map((s, i) => `<button data-step="${i}" class="${i === stage ? "current" : checks.includes(i) ? "passed" : ""}" aria-label="Шаг ${i + 1}: ${esc(s.title)}${checks.includes(i) ? ", отмечен" : ""}" title="${esc(s.title)}" ${i === stage ? 'aria-current="step"' : ""}>${checks.includes(i) && i !== stage ? icon("check") : i + 1}</button>`).join("")}</nav><details class="guide-outline" id="guide-outline"><summary>Все шаги ${icon("chevron")}</summary><ol>${active.steps.map((s, i) => `<li><button data-step="${i}" ${i === stage ? 'aria-current="step"' : ""}><span>${checks.includes(i) ? icon("check") : i + 1}</span>${s.title}</button></li>`).join("")}</ol></details></div><article class="guide-step"><span class="eyebrow">ШАГ ${stage + 1} ИЗ ${active.steps.length}${checks.includes(stage) ? " · ОТМЕЧЕН" : ""}</span><h2>${s.title}</h2><div class="step-action">${
    actions(s.action).length > 1
      ? `<ol class="action-list">${actions(s.action)
          .map((t) => `<li>${rich(t)}</li>`)
          .join("")}</ol>`
      : `<p>${rich(s.action)}</p>`
  }</div><div class="expected">${icon("check")}<div><b>Должно получиться</b><p>${rich(s.expected)}</p></div></div><details class="help" id="step-help"><summary>Не получилось? Открыть подсказку</summary><p>${rich(s.help)}</p></details></article><a class="source-link" href="${active.source}" target="_blank" rel="noopener noreferrer">Официальная справка ↗</a>`;
}
function finishScreen() {
  const collection = active.kind === "guide" ? guides : lessons;
  const next =
    collection.find((i) => i.id > active.id && !done(i.id)) ||
    collection.find((i) => !done(i.id));
  return `<div class="finish"><div class="finish-emblem">${icon("flag")}</div><span class="eyebrow">ЕЩЁ ОДИН ШАГ К СВОЕЙ ИГРЕ</span><h1>${active.kind === "guide" ? "Гайд пройден!" : "Урок пройден!"}</h1><p>${active.title}</p><div class="earned"><span>${icon("spark")} ${reviewing ? "Повторение" : `+${active.kind === "guide" ? 30 : 20} XP`}</span><span>${icon("check")} ${storageWarning ? "Прогресс в этой вкладке" : "Прогресс сохранён"}</span></div>${next ? `<div class="next-preview"><span>СЛЕДУЮЩИЙ ${next.kind === "guide" ? "ГАЙД" : "УРОК"}</span><strong>${next.title}</strong><small>${next.minutes} мин</small></div>` : `<p class="finish-note">${active.kind === "guide" ? `Все ${guides.length} гайдов пройдены.` : `Все ${lessons.length} уроков пройдены.`} Ты можешь вернуться к любой теме в каталоге.</p>`}<div class="finish-actions">${next ? `<button class="button primary" data-open="${next.id}">Следующий ${next.kind === "guide" ? "гайд" : "урок"} ${icon("arrow")}</button>` : '<a class="button primary" href="#catalog">Открыть каталог</a>'}<button class="button ghost" data-action="exit">${returnLabel()}</button></div></div>`;
}
function saveReader() {
  if (!active) return;
  state.last = active.id;
  state.positions[active.id] = stage;
  if (active.kind === "lesson")
    state.lessonProgress[active.id] = { practiced, selected, feedback };
  persist();
}
function openItem(id, fromRoute = false, trigger) {
  const item = allItems.find((l) => l.id === Number(id));
  if (!item) return;
  const returningFromGuide =
    active?.id === state.lessonReturn?.guideId &&
    item.id === state.lessonReturn?.lessonId;
  if (!active && !(fromRoute && state.returnContext)) {
    returnContext = {
      view,
      y: scrollY,
      chapter,
      selector: trigger?.matches("[data-open]") ? `[data-open="${id}"]` : null,
      index: trigger
        ? [...document.querySelectorAll(`[data-open="${id}"]`)].indexOf(trigger)
        : 0,
    };
    state.returnContext = returnContext;
    state.discovery = catalogState;
  }
  if (fromRoute && state.returnContext) {
    returnContext = state.returnContext;
    view = returnContext.view;
  }
  if (
    active?.kind === "lesson" &&
    item.kind === "guide" &&
    trigger?.dataset.related
  ) {
    state.lessonReturn = { lessonId: active.id, guideId: item.id };
  } else if (state.lessonReturn?.guideId !== item.id) state.lessonReturn = null;
  active = item;
  reviewing = done(item.id);
  state.last = item.id;
  const max = item.kind === "guide" ? item.steps.length : 3;
  const restoreReview =
    returningFromGuide ||
    (reviewing && fromRoute && Number(state.positions[item.id]) < max);
  stage =
    reviewing && !restoreReview
      ? 0
      : Math.min(Number(state.positions[item.id] || 0), max - 1);
  const p = state.lessonProgress[item.id] || {};
  practiced = reviewing && !restoreReview ? false : !!p.practiced;
  selected = reviewing && !restoreReview ? null : (p.selected ?? null);
  feedback = reviewing && !restoreReview ? null : (p.feedback ?? null);
  saveReader();
  if (!fromRoute)
    location.hash = `${item.kind === "guide" ? "guide" : "lesson"}/${item.id}`;
  render({ focus: "#main" });
  window.scrollTo({ top: 0, behavior: "instant" });
}
function goStage(position) {
  stage = position;
  saveReader();
  render({ focus: "#main" });
  window.scrollTo({ top: 0, behavior: "instant" });
}
function advance() {
  if (!active) return;
  if (active.kind === "lesson") {
    if (stage === 1 && !practiced) return;
    if (stage === 2 && feedback !== "correct") {
      if (selected === null) return;
      feedback = selected === active.correct ? "correct" : "wrong";
      saveReader();
      render({ focus: ".feedback", reveal: true });
      return;
    }
    stage++;
  } else stage = reviewing ? stage + 1 : confirmGuideStep(state, active, stage);
  const max = active.kind === "guide" ? active.steps.length : 3;
  if (stage === max) finishItem(state, active.id);
  saveReader();
  render({ focus: "#main" });
  window.scrollTo({ top: 0, behavior: "instant" });
}
function closeReader() {
  if (!active) return;
  saveReader();
  if (active.id === state.lessonReturn?.guideId) {
    const id = state.lessonReturn.lessonId;
    openItem(id);
  } else location.hash = returnContext?.view || "path";
}
function route() {
  const hash = location.hash.slice(1),
    match = /^(lesson|guide)\/(\d+)$/.exec(hash);
  if (match) {
    const item = allItems.find(
      (i) => i.id === Number(match[2]) && i.kind === match[1],
    );
    if (item) {
      if (active?.id !== item.id) openItem(item.id, true);
      return;
    }
  }
  const target = ["catalog", "guides"].includes(hash) ? hash : "path";
  const restore = !!active && returnContext?.view === target;
  active = null;
  state.lessonReturn = null;
  persist();
  view = target;
  if (restore) chapter = returnContext.chapter;
  render();
  {
    window.scrollTo({
      top: restore ? returnContext.y : 0,
      behavior: "instant",
    });
    if (restore && returnContext.selector) {
      const target = document.querySelectorAll(returnContext.selector)[
        Math.max(0, returnContext.index || 0)
      ];
      target?.focus({ preventScroll: true });
      if (target) {
        const r = target.getBoundingClientRect(),
          header =
            document.querySelector(".header")?.getBoundingClientRect().bottom ||
            0;
        if (r.top < header || r.bottom > innerHeight)
          target.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
    }
  }
}
function selectChapter(value) {
  chapter = Math.max(0, Math.min(modules.length - 1, Number(value)));
  state.chapter = chapter;
  persist();
  render({
    focus:
      innerWidth <= 680 ? "#chapter-select" : `[data-chapter="${chapter}"]`,
  });
  document
    .querySelector(innerWidth <= 680 ? "#learning" : ".path-panel")
    .scrollIntoView({ block: "start", behavior: "instant" });
  revealChapter();
}
function refreshResults() {
  persist();
  document.querySelector("#catalog-results").innerHTML = catalogResults();
  const cfg = catalogState[view];
  document.querySelectorAll("[data-filter]").forEach((b) => {
    const on = b.dataset.filter === cfg.filter;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", String(on));
  });
  const reset = document.querySelector(".reset-filters");
  reset.hidden = !(
    cfg.query ||
    cfg.filter !== "all" ||
    cfg.module !== "all" ||
    cfg.type !== "all"
  );
}
function toggleBookmark(button) {
  const id = Number(button.dataset.save);
  state.saved = saved(id)
    ? state.saved.filter((v) => v !== id)
    : [...state.saved, id];
  persist();
  const item = allItems.find((i) => i.id === id);
  if (!active && catalogState[view]?.filter === "saved") {
    refreshResults();
    document
      .querySelector('[data-filter="saved"]')
      .focus({ preventScroll: true });
  } else {
    button.classList.toggle("is-saved", saved(id));
    button.setAttribute("aria-pressed", String(saved(id)));
    button.setAttribute(
      "aria-label",
      `${saved(id) ? "Убрать из сохранённого" : "Сохранить"}: ${item.title}`,
    );
    button.title = saved(id) ? "Убрать из сохранённого" : "Сохранить материал";
  }
  document.querySelector("#announcer").textContent = saved(id)
    ? "Материал сохранён"
    : "Материал убран из сохранённых";
}
app.addEventListener("click", (e) => {
  const button = e.target.closest("button,a");
  if (!button || button.disabled) return;
  if (
    button.tagName === "A" &&
    button.getAttribute("href") === location.hash &&
    !button.dataset.action
  ) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  if (button.dataset.open) {
    e.preventDefault();
    openItem(button.dataset.open, false, button);
    return;
  }
  if (button.dataset.save) {
    toggleBookmark(button);
    return;
  }
  if (button.dataset.layout) {
    state.pathLayout = button.dataset.layout;
    persist();
    render({ focus: `[data-layout="${state.pathLayout}"]`, preserve: true });
    return;
  }
  if (button.dataset.chapter !== undefined) {
    selectChapter(button.dataset.chapter);
    return;
  }
  if (button.dataset.filter) {
    catalogState[view].filter = button.dataset.filter;
    refreshResults();
    return;
  }
  if (button.dataset.stage !== undefined) {
    goStage(Number(button.dataset.stage));
    return;
  }
  if (button.dataset.step !== undefined) {
    goStage(Number(button.dataset.step));
    return;
  }
  switch (button.dataset.action) {
    case "theme":
      state.theme = state.theme === "dark" ? "light" : "dark";
      persist();
      render({ focus: '[data-action="theme"]', preserve: true });
      break;
    case "show-path":
      e.preventDefault();
      document.querySelector("#learning").scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
      break;
    case "next-chapter":
      selectChapter(chapter + 1);
      break;
    case "prev-chapter":
      selectChapter(chapter - 1);
      break;
    case "exit":
      closeReader();
      break;
    case "advance":
      advance();
      break;
    case "back":
      goStage(Math.max(0, stage - 1));
      break;
    case "clear-search":
      catalogState[view] = {
        query: "",
        filter: "all",
        module: "all",
        type: "all",
      };
      state.discovery = catalogState;
      persist();
      render({ focus: "#course-search", preserve: true });
      break;
  }
});
app.addEventListener("change", (e) => {
  if (e.target.id === "chapter-select") {
    selectChapter(e.target.value);
    return;
  }
  if (e.target.id === "catalog-chapter" || e.target.id === "catalog-type") {
    catalogState[view][e.target.id === "catalog-chapter" ? "module" : "type"] =
      e.target.value;
    refreshResults();
    return;
  }
  if (e.target.id === "practiced") {
    practiced = e.target.checked;
    saveReader();
    render({ focus: "#practiced", preserve: true });
    return;
  }
  if (e.target.name === "answer") {
    selected = Number(e.target.value);
    feedback = null;
    saveReader();
    render({
      focus: `input[name="answer"][value="${selected}"]`,
      preserve: true,
    });
  }
});
function searchInput(e) {
  if (e.target.id !== "course-search" || e.isComposing) return;
  catalogState[view].query = e.target.value;
  refreshResults();
}
app.addEventListener("input", searchInput);
app.addEventListener("compositionend", searchInput);
document.querySelector(".skip").addEventListener("click", (e) => {
  e.preventDefault();
  const main = document.querySelector("#main");
  main.focus();
  main.scrollIntoView({ block: "start", behavior: "instant" });
});
window.addEventListener("hashchange", route);
window.addEventListener("resize", revealChapter);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && active) closeReader();
});
history.scrollRestoration = "manual";
route();
