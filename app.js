import { modules, lessons, guides, allItems } from "./content.js";
const app = document.querySelector("#app");
const KEY = "godot-path-v1";
const fresh = () => ({
  completed: [],
  saved: [],
  positions: {},
  last: 1,
  theme: "light",
});
let state;
try {
  const raw = JSON.parse(localStorage.getItem(KEY) || "null");
  state = raw && typeof raw === "object" ? { ...fresh(), ...raw } : fresh();
  state.completed = Array.isArray(state.completed)
    ? [
        ...new Set(
          state.completed.filter((id) => allItems.some((i) => i.id === id)),
        ),
      ]
    : [];
  state.saved = Array.isArray(state.saved)
    ? state.saved.filter((id) => allItems.some((i) => i.id === id))
    : [];
  state.positions =
    state.positions && typeof state.positions === "object"
      ? state.positions
      : {};
} catch {
  state = fresh();
}
let storageWarning = false;
let view = "path",
  chapter = 0,
  query = "",
  filter = "all",
  active = null,
  stage = 0,
  selected = null,
  feedback = null,
  practiced = false;
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageWarning = false;
  } catch {
    storageWarning = true;
  }
}
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
const done = (id) => state.completed.includes(id);
const saved = (id) => state.saved.includes(id);
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
const nextLesson = () => lessons.find((l) => !done(l.id)) || lessons[0];
const resumeItem = () =>
  !done(state.last) && state.positions[state.last] !== undefined
    ? state.last
    : nextLesson().id;
const hasStarted = () =>
  Object.keys(state.positions).length > 0 || state.completed.length > 0;
const count = () => lessons.filter((l) => done(l.id)).length;
const xp = () => state.completed.reduce((n, id) => n + (id > 100 ? 30 : 20), 0);
function header() {
  return `<header class="header"><a class="brand" href="#path" aria-label="Godot Path — главная"><img src="./mark.svg" width="39" height="39" alt=""><span>Godot<span class="brand-light"> Path</span><small>СОЗДАВАЙ. ШАГ ЗА ШАГОМ.</small></span></a><nav class="top-nav" aria-label="Основная навигация">${[
    ["path", "Путь обучения"],
    ["guides", "Гайды"],
    ["catalog", "Все уроки"],
  ]
    .map(
      ([key, label]) =>
        `<a href="#${key}" ${view === key ? 'aria-current="page"' : ""}>${label}</a>`,
    )
    .join(
      "",
    )}</nav><div class="header-tools"><span class="xp">${icon("spark")}<b>${xp()}</b> XP</span><button class="icon-button" data-action="theme" aria-label="${state.theme === "dark" ? "Светлая" : "Тёмная"} тема">${icon(state.theme === "dark" ? "sun" : "moon")}</button></div></header>`;
}
function illustration() {
  return `<div class="hero-art" aria-label="Схема: событие, условие и результат в 3D-сцене" role="img"><div class="art-top"><span><i></i> ТВОЯ ПЕРВАЯ ИГРА</span><span>3D / VISUAL SCRIPT</span></div><svg viewBox="0 0 560 310" class="scene-art" aria-hidden="true"><defs><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" opacity=".15"/></pattern><linearGradient id="platform" x2="0" y2="1"><stop stop-color="#dbeeed"/><stop offset="1" stop-color="#c8dede"/></linearGradient></defs><rect width="560" height="310" fill="url(#grid)"/><ellipse cx="295" cy="248" rx="168" ry="32" fill="#0b6d6f" opacity=".05"/><path d="m116 185 166-88 166 88-166 90Z" fill="url(#platform)" stroke="#9dbdbb"/><path d="M116 185v17l166 91v-18m0 0 166-90v17l-166 91" fill="#adcdcb" stroke="#92b6b4"/><path d="m165 186 117-62 117 62-117 64Z" fill="none" stroke="#a7c9c6"/><path d="m207 119 74-40 74 40-74 40Z" fill="#f8df7b" stroke="#c9ad4b"/><path d="M207 119v65l74 40v-65Z" fill="#e4bf45" stroke="#c9ad4b"/><path d="m281 159 74-40v65l-74 40Z" fill="#efd064" stroke="#c9ad4b"/><path d="M280 72V30m-7 7 7-7 7 7" stroke="#0b6d6f" stroke-width="2"/><text x="291" y="38" fill="#0b6d6f" font-size="12" font-family="system-ui">Y</text><path d="M374 205h68m-7-7 7 7-7 7" stroke="#da7064" stroke-width="2"/><text x="450" y="209" fill="#c56459" font-size="12" font-family="system-ui">X</text><path d="m175 215-40 24m3-10-3 10 10-1" stroke="#5b8fb0" stroke-width="2"/><text x="119" y="253" fill="#5b8fb0" font-size="12" font-family="system-ui">Z</text></svg><div class="art-flow"><span class="flow-node event-node"><i></i> Ready</span><span class="flow-wire"></span><span class="flow-node"><i></i> Твоя идея</span><span class="flow-wire"></span><span class="flow-node result-node">${icon("play")} Игра</span></div><p class="art-caption">Маленькие шаги. Настоящие игровые механики.</p></div>`;
}
function progressCard() {
  return `<aside class="progress-card"><div class="card-heading"><span>Твой прогресс</span>${icon("flag")}</div><div class="progress-number">${count()}<span> / 50 уроков</span></div><div class="meter" role="progressbar" aria-label="Пройдено уроков" aria-valuemin="0" aria-valuemax="50" aria-valuenow="${count()}"><i style="width:${count() * 2}%"></i></div><p>${count() === 0 ? "Первый шаг — уже начало большой игры." : count() === 50 ? "Весь путь пройден. Возвращайся к нужным механикам." : "Каждый урок добавляет новую часть твоей игры."}</p><span class="small-meta">${guides.filter((g) => done(g.id)).length} из 10 гайдов пройдено</span></aside>`;
}
function pathView() {
  const mod = modules[chapter],
    group = lessons.filter((l) => l.module === chapter),
    recommend = guides.find((g) => g.module === chapter) || guides[chapter];
  return `<section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> GODOT + ORCHESTRATOR</div><h1>От первой сцены<br>до <em>своей игры.</em></h1><p>Создавай 3D-игры, соединяя блоки логики.<br class="desktop-br"> Один понятный шаг за раз — в твоём темпе.</p><div class="hero-actions"><button class="button primary" data-open="${resumeItem()}">${hasStarted() ? "Продолжить обучение" : "Начать путь"} ${icon("arrow")}</button><a class="button ghost" href="#guides">Открыть гайды ${icon("book")}</a></div><div class="hero-facts"><span><b>50</b> уроков</span><span><b>10</b> пошаговых гайдов</span><span><b>0 ₽</b> за весь курс</span></div></div>${illustration()}</section><section class="learning-section" id="learning"><div class="section-title"><div><div class="eyebrow">ТВОЙ МАРШРУТ</div><h2>Каждая игра начинается с первого шага</h2></div><span class="version-label">Godot 4.7 · Orchestrator 2.5</span></div><div class="learning-layout"><aside class="chapters"><span class="rail-title">10 ГЛАВ ПУТИ</span><nav aria-label="Главы курса">${modules.map((m) => `<button class="chapter ${m.id === chapter ? "active" : ""}" data-chapter="${m.id}" ${m.id === chapter ? 'aria-current="step"' : ""}><span class="chapter-number">${lessons.filter((l) => l.module === m.id && done(l.id)).length === 5 ? icon("check") : m.number}</span><span>${m.title}<small>${lessons.filter((l) => l.module === m.id && done(l.id)).length} / 5 уроков</small></span>${m.id === chapter ? icon("chevron") : ""}</button>`).join("")}</nav></aside><div class="path-panel"><div class="chapter-banner"><div><small>ГЛАВА ${mod.number}</small><h3>${mod.title}</h3><p>${mod.description}</p></div><span class="banner-icon">${icon(mod.icon)}</span></div><div class="lesson-path"><svg class="path-line" viewBox="0 0 450 545" preserveAspectRatio="none" aria-hidden="true"><path d="M225 40C225 100 330 100 330 150S225 210 225 260 120 310 120 370 225 420 225 480"/></svg>${group.map((l, i) => `<div class="path-stop stop-${i}"><button class="lesson-orb ${done(l.id) ? "done" : l.id === nextLesson().id ? "current" : ""}" data-open="${l.id}" aria-label="Урок ${l.id}: ${esc(l.title)}${done(l.id) ? ", пройден" : ""}">${done(l.id) ? icon("check") : icon(i === 0 ? mod.icon : i === 4 ? "flag" : "book")}${l.id === nextLesson().id ? '<span class="start-tag">НАЧНИ ЗДЕСЬ</span>' : ""}</button><button class="stop-label" data-open="${l.id}"><small>УРОК ${String(l.id).padStart(2, "0")} · ${l.minutes} МИН</small><strong>${l.title}</strong></button></div>`).join("")}</div><div class="chapter-pager"><button class="button ghost" data-prev-chapter ${chapter === 0 ? "disabled" : ""}>← Назад</button><span>${chapter + 1} / 10</span><button class="button ghost" data-next-chapter ${chapter === 9 ? "disabled" : ""}>Дальше →</button></div></div><aside class="path-aside">${progressCard()}<article class="guide-promo"><span class="pill">ПОШАГОВЫЙ ГАЙД</span>${icon("nodes", "promo-icon")}<h3>${recommend.title}</h3><p>Открой рядом с редактором. Делай по одному действию и сверяй результат.</p><button class="text-button" data-open="${recommend.id}">Пройти по шагам ${icon("arrow")}</button></article><div class="quiet-note">${icon("bookmark")}<p>Понравился урок?<br>Сохрани его, чтобы быстро найти в каталоге.</p></div></aside></div></section>`;
}
function card(item) {
  return `<article class="content-card"><div class="card-top"><span class="pill ${item.kind === "guide" ? "guide-pill" : ""}">${item.kind === "guide" ? `${item.steps.length} ${plural(item.steps.length, "шаг", "шага", "шагов")}` : `Урок ${String(item.id).padStart(2, "0")}`}</span><button class="icon-button save ${saved(item.id) ? "is-saved" : ""}" data-save="${item.id}" aria-label="${saved(item.id) ? "Убрать из сохранённого" : "Сохранить"}: ${esc(item.title)}" aria-pressed="${saved(item.id)}">${icon("bookmark")}</button></div><span class="tile-icon">${icon(modules[item.module].icon)}</span><small class="small-meta">${modules[item.module].title}</small><h3><button data-open="${item.id}">${item.title}</button></h3><p>${item.kind === "guide" ? item.requires : item.idea}</p><div class="card-bottom"><span>${done(item.id) ? `${icon("check")} Пройдено` : `${item.minutes} мин · ${item.kind === "guide" ? 30 : 20} XP`}</span><button class="text-button" data-open="${item.id}">${done(item.id) ? "Повторить" : "Открыть"} ${icon("arrow")}</button></div></article>`;
}
function catalogView() {
  const isGuides = view === "guides";
  let items = (isGuides ? guides : allItems).filter(
    (l) =>
      (filter === "all" ||
        (filter === "saved" && saved(l.id)) ||
        (filter === "done" && done(l.id)) ||
        (filter === "new" && !done(l.id))) &&
      `${l.title} ${modules[l.module].title} ${l.kind === "guide" ? l.requires : l.idea + " " + l.practice}`
        .toLocaleLowerCase("ru")
        .includes(query.toLocaleLowerCase("ru")),
  );
  return `<section class="catalog"><div class="catalog-intro"><div class="eyebrow">${isGuides ? "РЯДОМ С ТВОИМ РЕДАКТОРОМ" : "УЧИСЬ В СВОЁМ ПОРЯДКЕ"}</div><h1>${isGuides ? "Подсказка на каждом шаге." : "Вся мастерская — перед тобой."}</h1><p>${isGuides ? "10 гайдов: что нажать, что должно получиться и куда посмотреть, если что-то пошло не так." : "50 уроков с новым материалом и 10 практических гайдов. Можно открыть любой."}</p></div><div class="catalog-tools"><label class="search">${icon("search")}<input id="course-search" type="search" placeholder="${isGuides ? "Найти гайд…" : "Найти урок или механику…"}" aria-label="Поиск по курсу" value="${esc(query)}"></label><div class="filters" aria-label="Фильтр уроков">${[
    ["all", "Все"],
    ["new", "Не пройдены"],
    ["saved", "Сохранённые"],
    ["done", "Пройдены"],
  ]
    .map(
      ([v, t]) =>
        `<button data-filter="${v}" class="${v === filter ? "active" : ""}" aria-pressed="${v === filter}">${t}</button>`,
    )
    .join(
      "",
    )}</div></div><div class="results-meta" role="status">${items.length} ${plural(items.length, "материал", "материала", "материалов")}</div><div class="content-grid">${items.map(card).join("")}</div>${!items.length ? `<div class="empty">${icon(filter === "saved" ? "bookmark" : "search")}<h2>${filter === "saved" && !query ? "Пока ничего не сохранено" : "Ничего не нашлось"}</h2><p>${filter === "saved" && !query ? "Нажми на закладку у урока — он появится здесь." : "Попробуй другое слово или убери фильтр."}</p><button class="button" data-action="clear-search">Показать все</button></div>` : ""}</section>`;
}
function footer() {
  return `<footer class="footer"><a class="brand footer-brand" href="#path"><img src="./mark.svg" width="29" height="29" alt=""><b>Godot Path</b></a><p>От идеи до игры. В твоём темпе.</p><div><a href="https://docs.godotengine.org/en/stable/" target="_blank" rel="noopener noreferrer">Godot ↗</a><a href="https://github.com/CraterCrash/godot-orchestrator/tree/2.5" target="_blank" rel="noopener noreferrer">Orchestrator ↗</a><a href="https://github.com/alex-idk-creator/godot-path" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div><small>Прогресс хранится только в этом браузере. Учебные схемы не являются скриншотами редактора.</small></footer>`;
}
function render(options = {}) {
  document.documentElement.dataset.theme =
    state.theme === "dark" ? "dark" : "light";
  document.title = active
    ? `${active.title} — Godot Path`
    : "Godot Path — от идеи до игры";
  app.innerHTML = active
    ? reader()
    : `${header()}<main id="main">${view === "path" ? pathView() : catalogView()}</main>${footer()}`;
  bind();
  const rail = document.querySelector(".chapters nav"),
    current = document.querySelector(".chapter.active");
  if (rail && current && innerWidth <= 680) {
    const r = rail.getBoundingClientRect(),
      c = current.getBoundingClientRect();
    rail.scrollLeft += c.left - r.left - (rail.clientWidth - c.width) / 2;
  }
  if (storageWarning) {
    const n = document.createElement("p");
    n.className = "storage-warning";
    n.setAttribute("role", "status");
    n.textContent =
      "Браузер не разрешил сохранить прогресс. Сейчас он доступен только до закрытия страницы.";
    app.prepend(n);
  }
  if (options.focus)
    document.querySelector(options.focus)?.focus({ preventScroll: true });
}
function lessonDiagram() {
  return `<div class="lesson-visual"><span class="diagram-caption">УЧЕБНАЯ СХЕМА · ${modules[active.module].title.toUpperCase()}</span><div class="mini-flow">${icon(modules[active.module].icon)}<span>${active.module < 2 ? "Сцена" : active.module < 5 ? "Событие" : "Действие"}</span><i></i><span>${active.module < 2 ? "Узлы" : active.module < 5 ? "Проверка" : "Правило"}</span><i></i><span class="mini-result">${active.module < 2 ? "Мир игры" : "Результат"} ${icon("check")}</span></div></div>`;
}
function answersFor(l) {
  const values = l.answers.map((text, index) => ({ text, index }));
  const shift = l.id % values.length;
  return [...values.slice(shift), ...values.slice(0, shift)];
}
function reader() {
  const guide = active.kind === "guide",
    max = guide ? active.steps.length : 3,
    completedScreen = stage === max;
  const pct = completedScreen ? 100 : Math.round((stage / max) * 100);
  return `<div class="reader"><header class="reader-header"><button class="icon-button" data-action="exit" aria-label="Закрыть урок">${icon("close")}</button><div class="reader-meter"><div class="meter"><i style="width:${pct}%"></i></div><span>${guide ? "Гайд" : `Урок ${active.id}`} · ${completedScreen ? "Готово" : `${stage + 1} из ${max}`}</span></div><button class="icon-button save ${saved(active.id) ? "is-saved" : ""}" data-save="${active.id}" aria-label="${saved(active.id) ? "Убрать из сохранённого" : "Сохранить материал"}" aria-pressed="${saved(active.id)}">${icon("bookmark")}</button></header><main id="main" class="reader-main" tabindex="-1">${completedScreen ? finishScreen() : guide ? guideScreen() : lessonScreen()}</main>${!completedScreen ? `<footer class="reader-footer"><div class="reader-footer-inner"><button class="button ghost" data-action="back" ${stage === 0 ? "disabled" : ""}>← Назад</button><span>${guide ? "Делай в Godot, отмечай здесь" : stage === 0 ? "Сначала разберёмся" : stage === 1 ? "Теперь попробуй в редакторе" : "Ошибаться можно — попытки не ограничены"}</span><button class="button primary" data-action="next" ${!guide && ((stage === 1 && !practiced) || (stage === 2 && feedback !== "correct")) ? "disabled" : ""}>${guide ? (stage === max - 1 ? "Завершить гайд" : "Шаг сделан") : stage === 0 ? "Попробовать" : stage === 1 ? "Проверить себя" : "Завершить урок"} ${icon("arrow")}</button></div></footer>` : ""}</div>`;
}
function lessonScreen() {
  if (stage === 0)
    return `<div class="reader-eyebrow">${icon(modules[active.module].icon)} ГЛАВА ${modules[active.module].number} · НОВОЕ ПОНЯТИЕ</div><h1>${active.title}</h1><p class="lesson-lead">${active.idea}</p>${lessonDiagram()}<div class="explanation"><h2>Как это работает</h2><p>${active.detail}</p></div><a class="source-link" href="${active.source}" target="_blank" rel="noopener noreferrer">Открыть первоисточник ↗</a>`;
  if (stage === 1)
    return `<div class="reader-eyebrow">${icon("play")} ПРАКТИКА В РЕДАКТОРЕ</div><h1>Теперь твоя очередь</h1><p class="lesson-subtitle">${active.title}</p><div class="practice-box"><span class="task-number">${String(active.id).padStart(2, "0")}</span><div><h2>Небольшое задание</h2><p>${active.practice}</p></div></div><label class="practice-confirm"><input type="checkbox" id="practiced" ${practiced ? "checked" : ""}><span>Я выполнил практическое задание</span></label><p class="privacy-note">Сайт не видит твой проект: ты сам отмечаешь выполнение. Можно вернуться к объяснению в любой момент.</p><a class="source-link" href="${active.source}" target="_blank" rel="noopener noreferrer">Свериться с документацией ↗</a>`;
  return `<div class="reader-eyebrow">${icon("spark")} ПРОВЕРКА НОВОЙ ИДЕИ</div><h1>${active.question}</h1><p class="lesson-subtitle">Выбери один ответ. Можно подумать и попробовать ещё.</p><fieldset class="answers"><legend class="sr-only">Варианты ответа</legend>${answersFor(
    active,
  )
    .map(
      (a, i) =>
        `<label class="answer ${selected === a.index ? "selected" : ""} ${feedback === "correct" && selected === a.index ? "correct" : ""}"><input type="radio" name="answer" value="${a.index}" ${selected === a.index ? "checked" : ""}><span class="answer-letter">${i + 1}</span><span>${esc(a.text)}</span>${feedback === "correct" && selected === a.index ? icon("check") : ""}</label>`,
    )
    .join(
      "",
    )}</fieldset><button class="button ${feedback === "correct" ? "ghost" : "primary"}" data-action="check" ${selected === null || feedback === "correct" ? "disabled" : ""}>Проверить ответ</button><div class="feedback ${feedback || ""}" role="status">${feedback === "correct" ? `<b>Да, именно так.</b><p>${active.explanation}</p>` : feedback === "wrong" ? `<b>Попробуй ещё раз.</b><p>${active.explanation}</p>` : ""}</div>`;
}
function guideScreen() {
  const s = active.steps[stage];
  return `<div class="reader-eyebrow">${icon("nodes")} ПОШАГОВЫЙ ГАЙД · ${active.minutes} МИН</div><h1>${active.title}</h1><p class="guide-requires">${active.requires}</p><nav class="guide-steps" aria-label="Шаги гайда">${active.steps.map((s, i) => `<button data-step="${i}" class="${i === stage ? "current" : i < stage ? "passed" : ""}" ${i > stage ? "disabled" : ""} aria-label="Шаг ${i + 1}: ${esc(s.title)}" ${i === stage ? 'aria-current="step"' : ""}>${i < stage ? icon("check") : i + 1}</button>`).join("")}</nav><article class="guide-step"><span class="eyebrow">ШАГ ${stage + 1} ИЗ ${active.steps.length}</span><h2>${s.title}</h2><p class="step-action">${s.action}</p><div class="expected">${icon("check")}<div><b>Должно получиться</b><p>${s.expected}</p></div></div><details class="help"><summary>Не получилось? Открыть подсказку</summary><p>${s.help}</p></details></article><a class="source-link" href="${active.source}" target="_blank" rel="noopener noreferrer">Официальная справка по этому гайду ↗</a>`;
}
function finishScreen() {
  const next =
    active.kind === "guide"
      ? guides.find((g) => g.id > active.id && !done(g.id))
      : lessons.find((l) => l.id > active.id && !done(l.id));
  return `<div class="finish"><div class="finish-emblem">${icon("flag")}</div><span class="eyebrow">ЕЩЁ ОДИН ШАГ К СВОЕЙ ИГРЕ</span><h1>${active.kind === "guide" ? "Гайд пройден!" : "Урок пройден!"}</h1><p>${active.title}</p><div class="earned"><span>${icon("spark")} ${active.kind === "guide" ? 30 : 20} XP</span><span>${icon("check")} Прогресс сохранён</span></div><p class="finish-note">Повторять можно сколько угодно. Очки за этот материал начисляются один раз.</p><div class="finish-actions">${next ? `<button class="button primary" data-open="${next.id}">Следующий ${next.kind === "guide" ? "гайд" : "урок"} ${icon("arrow")}</button>` : ""}<button class="button ghost" data-action="exit">${next ? "Вернуться к пути" : "К пути обучения"}</button></div></div>`;
}
function openItem(id) {
  const item = allItems.find((l) => l.id === Number(id));
  if (!item) return;
  active = item;
  state.last = item.id;
  const max = item.kind === "guide" ? item.steps.length : 3;
  const savedPosition = Number(state.positions[item.id] || 0);
  stage = Number.isInteger(savedPosition)
    ? Math.max(0, Math.min(savedPosition, max - 1))
    : 0;
  selected = null;
  feedback = null;
  practiced = false;
  persist();
  location.hash = `${item.kind === "guide" ? "guide" : "lesson"}/${item.id}`;
  render({ focus: "#main" });
  window.scrollTo(0, 0);
}
function advance() {
  const max = active.kind === "guide" ? active.steps.length : 3;
  if (
    active.kind === "lesson" &&
    ((stage === 1 && !practiced) || (stage === 2 && feedback !== "correct"))
  )
    return;
  stage++;
  state.positions[active.id] = stage;
  if (stage === max && !done(active.id)) state.completed.push(active.id);
  persist();
  render({ focus: "#main" });
  window.scrollTo(0, 0);
}
function route() {
  requestAnimationFrame(() => window.scrollTo(0, 0));
  const hash = location.hash.slice(1);
  const match = /^(lesson|guide)\/(\d+)$/.exec(hash);
  if (match) {
    const item = allItems.find(
      (i) => i.id === Number(match[2]) && i.kind === match[1],
    );
    if (item) {
      if (active?.id !== item.id) openItem(item.id);
      return;
    }
  }
  active = null;
  view = ["guides", "catalog"].includes(hash) ? hash : "path";
  render();
}
function bind() {
  document
    .querySelectorAll("[data-open]")
    .forEach((b) => (b.onclick = () => openItem(b.dataset.open)));
  document.querySelectorAll("[data-save]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = Number(b.dataset.save);
        state.saved = saved(id)
          ? state.saved.filter((x) => x !== id)
          : [...state.saved, id];
        persist();
        render({ focus: `[data-save="${id}"]` });
      }),
  );
  document.querySelectorAll("[data-chapter]").forEach(
    (b) =>
      (b.onclick = () => {
        chapter = Number(b.dataset.chapter);
        render();
        document
          .querySelector("#learning")
          .scrollIntoView({ behavior: "instant", block: "start" });
      }),
  );
  document
    .querySelector("[data-next-chapter]")
    ?.addEventListener("click", () => {
      chapter = Math.min(9, chapter + 1);
      render();
      document
        .querySelector("#learning")
        .scrollIntoView({ behavior: "instant" });
    });
  document
    .querySelector("[data-prev-chapter]")
    ?.addEventListener("click", () => {
      chapter = Math.max(0, chapter - 1);
      render();
      document
        .querySelector("#learning")
        .scrollIntoView({ behavior: "instant" });
    });
  document.querySelectorAll("[data-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        filter = b.dataset.filter;
        render();
      }),
  );
  document.querySelector("#course-search")?.addEventListener("input", (e) => {
    query = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const input = document.querySelector("#course-search");
    input.focus();
    try {
      input.setSelectionRange(pos, pos);
    } catch {
      /* search input selection is browser dependent */
    }
  });
  document.querySelectorAll("[data-step]").forEach(
    (b) =>
      (b.onclick = () => {
        stage = Number(b.dataset.step);
        state.positions[active.id] = stage;
        persist();
        render({ focus: "#main" });
      }),
  );
  document.querySelector("#practiced")?.addEventListener("change", (e) => {
    practiced = e.target.checked;
    document.querySelector('[data-action="next"]').disabled = !practiced;
  });
  document.querySelectorAll('input[name="answer"]').forEach(
    (b) =>
      (b.onchange = () => {
        selected = Number(b.value);
        feedback = null;
        render({ focus: `input[name="answer"][value="${selected}"]` });
      }),
  );
  document.querySelectorAll("[data-action]").forEach(
    (b) =>
      (b.onclick = () => {
        switch (b.dataset.action) {
          case "theme":
            state.theme = state.theme === "dark" ? "light" : "dark";
            persist();
            render();
            break;
          case "exit":
            active = null;
            location.hash = view;
            render();
            window.scrollTo(0, 0);
            break;
          case "next":
            advance();
            break;
          case "back":
            stage = Math.max(0, stage - 1);
            selected = null;
            feedback = null;
            state.positions[active.id] = stage;
            persist();
            render({ focus: "#main" });
            window.scrollTo(0, 0);
            break;
          case "check":
            if (selected !== null) {
              feedback = selected === active.correct ? "correct" : "wrong";
              render({
                focus:
                  feedback === "correct"
                    ? '[data-action="next"]'
                    : ".answers input:checked",
              });
            }
            break;
          case "clear-search":
            query = "";
            filter = "all";
            render();
            break;
        }
      }),
  );
}
document.querySelector(".skip").addEventListener("click", (e) => {
  e.preventDefault();
  const main = document.querySelector("#main");
  main.setAttribute("tabindex", "-1");
  main.focus();
  main.scrollIntoView({ behavior: "instant" });
});
window.addEventListener("hashchange", () => {
  route();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && active) {
    active = null;
    location.hash = view;
    render();
  }
});
history.scrollRestoration = "manual";
route();
