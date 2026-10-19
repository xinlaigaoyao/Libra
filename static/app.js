"use strict";
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (v = "") =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const icons = {
  book: '<path d="M3 4h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6v16h-6a3 3 0 0 0-3 2 3 3 0 0 0-3-2H3z"/><path d="M12 7v15"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  shelf: '<path d="M3 21V3h5v18m0-16h5v16M3 21h18M16 4l5 16-5 1-4-16z"/>',
  exchange: '<path d="M3 7h17m-5-5 5 5-5 5M21 17H4m5 5-5-5 5-5"/>',
  users:
    '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-3-5"/>',
  chart: '<path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4"/>',
  coins:
    '<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12"/>',
  history: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6m3-4v6l4 2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5m10-5v5M3 11h18M7 15h3m4 0h3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0v7l2 3H4l2-3zm4 13h4"/>',
  leaf: '<path d="M20 3C5 2 1 11 6 17S22 18 20 3ZM4 21 15 10"/>',
  logout: '<path d="M10 4H4v16h6m4-13 5 5-5 5m-6-5h11"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  shield: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 11l3 3 5-5"/>',
  scan: '<path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M7 7v10m3-10v10m4-10v10m3-10v10"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  print: '<path d="M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v7H6zm11-3h1"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  heart:
    '<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 5 8 15 8 15S25 10 20 5Z"/>',
};
const icon = (name) =>
  `<svg aria-hidden="true" viewBox="0 0 24 24">${icons[name] || icons.book}</svg>`;
const labels = {
  available: "在库可借",
  borrowed: "借阅中",
  active: "借阅中",
  overdue: "已逾期",
  returned: "已归还",
  maintenance: "维护中",
  withdrawn: "已下架",
  paid: "已缴清",
  unpaid: "待缴清",
};
const tag = (state, text) =>
  `<span class="tag ${state}">${esc(text || labels[state] || state)}</span>`;
const money = (cents) => `¥${(Number(cents || 0) / 100).toFixed(2)}`;
const fmt = (value) =>
  value ? String(value).slice(0, 10).replaceAll("-", ".") : "—";
const timestamp = (value) =>
  value ? String(value).replace("T", " ").slice(0, 16) : "—";
const mini = (book) =>
  `<span class="mini-cover" style="--cover:${esc(book.color)}"><span>${esc(book.title)}</span></span>`;
const cover = (book) =>
  `<div class="cover" style="--cover:${esc(book.color)}"><span class="cover-label">LIBRA COLLECTION</span><strong>${esc(book.title)}</strong><small>${esc(book.author)}</small></div>`;
const btn = (text, action, style = "primary", extra = "") =>
  `<button type="button" class="btn btn-${style}" data-action="${action}" ${extra}>${text}</button>`;
const empty = (
  title = "暂无记录",
  desc = "新的记录会在完成业务操作后出现在这里。",
) => `<div class="empty">${icon("book")}<strong>${title}</strong>${desc}</div>`;
const state = {
  user: null,
  csrf: "",
  route: "dashboard",
  books: [],
  readers: [],
  loans: [],
  view: "grid",
  catalogQuery: "",
  circulationTab: "borrow",
  receipt: null,
  returnLoan: null,
};
let toastTimer,
  routeVersion = 0;
async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": state.csrf,
      ...options.headers,
    },
    credentials: "same-origin",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "操作失败，请重试");
  return result.data;
}
const post = (path, data = {}) =>
  api(path, { method: "POST", body: JSON.stringify(data) });
function toast(message, error = false) {
  const el = $("#toast");
  el.textContent = message;
  el.className = `show${error ? " error" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = ""), 3800);
}
const routes = [
  ["dashboard", "grid", "工作台概览"],
  ["catalog", "shelf", "馆藏检索"],
  ["circulation", "exchange", "借还工作台"],
  ["readers", "users", "读者管理"],
  ["reports", "chart", "统计报表"],
  ["fines", "coins", "罚款与违规"],
  ["audit", "history", "操作日志"],
];
function shell() {
  const name = state.user?.name || "访客";
  $("#app").innerHTML =
    `<div class="shell"><aside class="sidebar"><a class="brand" href="#${state.user ? "dashboard" : "catalog"}">${icon("book")}<div><div class="brand-name">LIBRA</div><div class="brand-caption">CAMPUS LIBRARY</div></div></a><div class="side-label">图书馆工作空间</div><nav class="nav" aria-label="主导航">${routes.map(([id, i, label]) => `<a href="#${id}" data-route="${id}">${icon(i)}<span>${label}</span>${id === "catalog" ? '<span class="nav-count">馆藏</span>' : ""}</a>`).join("")}</nav><div class="sidebar-bottom"><div class="library-note">${icon("leaf")}<p>让知识流动，<br>让每一本书被遇见。</p><span>每一次借阅，都是新的开始</span></div><div class="profile"><div class="avatar">${esc(name.slice(-2))}</div><div><strong>${esc(name)}</strong><small>${state.user ? "图书馆出纳员" : "公开检索 · 无需登录"}</small></div><button aria-label="${state.user ? "退出登录" : "出纳员登录"}" data-action="${state.user ? "logout" : "login"}">${icon("logout")}</button></div></div></aside><main class="main"><header class="topbar"><div class="breadcrumb"><button class="icon-button mobile-menu" data-action="menu" aria-label="展开导航">${icon("menu")}</button><span>图书馆管理</span><span>/</span><strong id="breadcrumb-current">工作台概览</strong></div><div class="top-actions"><form id="global-search" class="top-search">${icon("search")}<input name="q" aria-label="全局馆藏搜索" placeholder="搜索书名、作者或藏书号"><span class="key">/</span></form><button class="icon-button" data-action="notifications" aria-label="查看待归还图书">${icon("bell")}</button><span class="top-avatar">${esc(name.slice(-2))}</span></div></header><div class="content"><div id="page"></div><footer class="footer"><span>LIBRA 校园图书馆管理系统 · 信息系统分析与设计</span><span>${icon("shield")} 本地数据服务 · MySQL</span></footer></div></main></div>`;
  $("#global-search").addEventListener("submit", (e) => {
    e.preventDefault();
    state.catalogQuery = new FormData(e.target).get("q");
    navigate("catalog");
  });
}
function navigate(route) {
  if (location.hash === `#${route}`) renderRoute();
  else location.hash = route;
}
function pageHead(title, description, actions = "") {
  return `<div class="page-head"><div><div class="eyebrow">LIBRA / CAMPUS LIBRARY</div><h1>${title}</h1><p>${description}</p></div><div class="head-tools">${actions}</div></div>`;
}
function dateLabel() {
  return `<span class="date-label">${icon("calendar")}${new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date())}</span>`;
}
function metrics(stats) {
  return `<div class="metrics">${[
    [
      "馆藏总量",
      stats.copies,
      "册",
      "shelf",
      `<b>${stats.books}</b> 种书目 · ${stats.available} 册在库`,
    ],
    [
      "当前借出",
      stats.borrowed,
      "册",
      "exchange",
      `<b>今日借出 ${stats.today_borrowed}</b> 册`,
    ],
    ["注册读者", stats.readers, "人", "users", "学生与教师 · 统一借阅档案"],
    [
      "逾期待还",
      stats.overdue,
      "册",
      "clock",
      stats.overdue
        ? '<b class="warm">需要关注</b> 请及时办理归还'
        : "<b>状态良好</b> 暂无逾期图书",
    ],
  ]
    .map(
      ([label, value, unit, i, foot]) =>
        `<div class="panel metric"><div class="metric-label">${label}<span class="metric-icon">${icon(i)}</span></div><div class="metric-value">${value}<span>${unit}</span></div><div class="metric-foot">${foot}</div></div>`,
    )
    .join("")}</div>`;
}
function chart(trend) {
  const max = Math.max(5, ...trend.flatMap((x) => [x.borrowed, x.returned]));
  const width = Math.min(640, Math.max(300, window.innerWidth - 90));
  const step = (width - 45) / 7,
    bar = Math.min(17, step * 0.25);
  return `<div class="chart"><svg viewBox="0 0 ${width} 170" role="img" aria-label="近七日借出与归还数量柱状图">${[0, 1, 2, 3].map((i) => `<line class="gridline" x1="28" x2="${width - 8}" y1="${18 + i * 39}" y2="${18 + i * 39}"/><text x="3" y="${21 + i * 39}">${Math.round(max * (1 - i / 3))}</text>`).join("")}${trend
    .map((d, i) => {
      const x = 35 + i * step;
      return `<g><title>${d.date}：借出 ${d.borrowed}，归还 ${d.returned}</title><rect x="${x}" y="${135 - (d.borrowed / max) * 117}" width="${bar}" height="${(d.borrowed / max) * 117}" rx="3" fill="#839d75"/><rect x="${x + bar + 5}" y="${135 - (d.returned / max) * 117}" width="${bar}" height="${(d.returned / max) * 117}" rx="3" fill="#d9e4ca"/><text x="${x + bar + 2.5}" y="159" text-anchor="middle">${d.date.slice(5).replace("-", "/")}</text></g>`;
    })
    .join(
      "",
    )}</svg></div><div class="chart-summary">近 7 日借出 <strong>${trend.reduce((s, x) => s + x.borrowed, 0)} 册</strong>归还 <strong>${trend.reduce((s, x) => s + x.returned, 0)} 册</strong></div>`;
}
function loanTable(rows, compact = false) {
  if (!rows.length)
    return empty(
      "没有符合条件的借阅记录",
      "试试其他检索条件，或办理一笔新的借阅。",
    );
  return `<div class="table-wrap"><table><thead><tr><th>图书 / 藏书号</th><th>借阅人</th><th>应还日期</th><th>借阅状态</th>${compact ? "" : "<th>操作</th>"}</tr></thead><tbody>${rows.map((l) => `<tr><td><div class="book-cell">${mini(l)}<div><strong>${esc(l.title)}</strong><small>${esc(l.accession)}</small></div></div></td><td><strong>${esc(l.reader_name)}</strong><small>${esc(l.card)}</small></td><td>${fmt(l.due_date)}${l.renewals ? "<small>已续借 1 次</small>" : ""}</td><td>${tag(l.status, l.status === "overdue" ? `逾期 ${l.overdue_days} 天` : null)}</td>${compact ? "" : `<td><div class="row-actions">${l.status !== "returned" ? `${btn("归还", "return-copy", "quiet", `data-accession="${esc(l.accession)}" class="btn-small"`)}${l.status === "active" && !l.renewals ? btn("续借", "renew", "secondary", `data-id="${l.id}"`) : ""}` : `<span class="muted">${fmt(l.returned_at)}</span>`}</div></td>`}</tr>`).join("")}</tbody></table></div>`;
}
async function dashboardPage() {
  const d = await api("/dashboard");
  return `${pageHead("工作台概览", "每一本书的流转，都在这里清晰可见。", dateLabel())}<section class="hero"><div class="hero-copy"><div class="eyebrow">A NEW CHAPTER, EVERY DAY</div><h2>你好，${esc(state.user.name)}。今天也与知识同行。</h2><p>馆内有 ${d.stats.available} 册图书静候读者，开启今天的图书馆工作吧。</p><div>${btn(`${icon("scan")} 办理借阅`, "go-borrow")}<span class="hero-note">高效流转，从一次借阅开始</span></div></div><div class="hero-art" aria-hidden="true"><div class="display-book"><span class="book-overline">THE ART OF READING</span><strong>阅读<br>的力量</strong><span class="book-line-art"></span><small>LIBRA COLLECTION</small></div><div class="display-book"><span class="book-overline">A WORLD OF IDEAS</span><strong>知识<br>的边界</strong><span class="book-line-art"></span><small>CAMPUS LIBRARY</small></div><div class="display-book"><span class="book-overline">STAY CURIOUS</span><strong>保持<br>好奇</strong><span class="book-line-art"></span><small>DISCOVER MORE</small></div></div></section>${metrics(d.stats)}<div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>借阅趋势</h2><p>了解最近一周的图书流通情况</p></div><div class="legend"><span><i></i>借出</span><span><i class="soft"></i>归还</span></div></div>${chart(d.trend)}</section><section class="panel due-panel"><div class="panel-heading"><h2>归还提醒 <span class="muted" style="font-size:11px;font-weight:400">/ 待关注</span></h2>${icon("clock")}</div><div class="due-list">${d.due.length ? d.due.map((l) => `<div class="due-item">${mini(l)}<div class="due-text"><strong>${esc(l.title)}</strong><p>${esc(l.reader_name)} · ${esc(l.accession)}</p>${tag(l.status === "overdue" ? "overdue" : "maintenance", l.status === "overdue" ? `逾期 ${l.overdue_days} 天` : `${fmt(l.due_date)} 到期`)}</div><button class="icon-button" data-action="return-copy" data-accession="${esc(l.accession)}" aria-label="归还 ${esc(l.title)}">${icon("chevron")}</button></div>`).join("") : empty("暂无待办", "未来 3 天内无待还图书")}</div><div class="due-footer">${icon("info")} 显示逾期及未来 3 天到期的借阅。费用以实际归还日为准。</div></section><section class="panel"><div class="panel-heading"><h2>最近借阅</h2><button class="text-link" data-action="go-records">查看全部 ${icon("arrow")}</button></div>${loanTable(d.recent, true)}</section></div>`;
}
async function catalogPage() {
  state.books = await api(
    `/catalog?q=${encodeURIComponent(state.catalogQuery)}`,
  );
  return `${pageHead("馆藏检索", "在书与人之间，建立一次新的相遇。", state.user ? `${btn(`${icon("upload")} 批量导入`, "import", "secondary")}${btn(`${icon("plus")} 新书入库`, "add-book")}` : `<span class="public-badge">公开检索 · 无需登录</span>${btn("出纳员登录", "login")}`)}<div class="catalog-intro"><div><h2>在这里，找到你的下一本书。</h2><p>按书名、作者、ISBN 或藏书号检索，实时查看馆藏位置与可借状态。</p></div>${icon("book")}</div><form id="catalog-filter" class="toolbar"><div class="toolbar-left"><div class="search-field">${icon("search")}<input name="q" aria-label="检索馆藏" placeholder="搜索书名、作者、ISBN…" value="${esc(state.catalogQuery)}"></div><select name="category" aria-label="图书分类"><option value="">全部分类</option>${["计算机", "文学", "艺术设计", "历史人文", "经济管理", "心理成长"].map((c) => `<option>${c}</option>`).join("")}</select><select name="status" aria-label="馆藏状态"><option value="">全部状态</option><option value="available">在库可借</option><option value="borrowed">借阅中</option><option value="maintenance">维护中</option><option value="withdrawn">已下架</option></select><button class="btn btn-secondary" type="submit">检索</button></div><div class="segmented"><button type="button" data-action="grid-view" class="${state.view === "grid" ? "active" : ""}" aria-label="卡片视图">${icon("grid")}</button><button type="button" data-action="list-view" class="${state.view === "list" ? "active" : ""}" aria-label="列表视图">${icon("list")}</button></div></form><div id="catalog-results">${catalogResults()}</div>`;
}
function catalogResults() {
  return `<div class="result-count">共 ${state.books.length} 种书目 · ${state.books.reduce((s, b) => s + b.copies.length, 0)} 册馆藏</div>${!state.books.length ? empty("没有找到相关图书", "换一个关键词或清除筛选条件试试。") : state.view === "grid" ? `<div class="book-grid">${state.books.map((b) => `<article class="book-card"><button class="book-stage" style="width:100%" data-action="book-detail" data-id="${b.id}" aria-label="查看 ${esc(b.title)}">${cover(b)}</button><div class="book-card-info"><h3 title="${esc(b.title)}">${esc(b.title)}</h3><p>${esc(b.author)} · ${esc(b.category)}</p><div class="book-card-bottom">${tag(b.available ? "available" : "borrowed", b.available ? `${b.available} / ${b.copies.length} 册可借` : "暂无可借副本")}<button data-action="book-detail" data-id="${b.id}">查看馆藏 →</button></div></div></article>`).join("")}</div>` : `<div class="panel table-wrap"><table><thead><tr><th>图书</th><th>作者</th><th>分类</th><th>ISBN</th><th>可借 / 总量</th><th>操作</th></tr></thead><tbody>${state.books.map((b) => `<tr><td><div class="book-cell">${mini(b)}<strong>${esc(b.title)}</strong></div></td><td>${esc(b.author)}</td><td>${esc(b.category)}</td><td>${esc(b.isbn)}</td><td>${b.available} / ${b.copies.length}</td><td>${btn("查看馆藏", "book-detail", "quiet", `data-id="${b.id}"`)}</td></tr>`).join("")}</tbody></table></div>`}`;
}
function showBook(id) {
  const b = state.books.find((b) => b.id === Number(id));
  if (!b) return;
  openModal(
    "馆藏详情",
    `<div class="detail-top">${cover(b)}<div class="detail-info"><span class="eyebrow">${esc(b.category)}</span><h2>${esc(b.title)}</h2><p>${esc(b.author)}<br>${esc(b.publisher)} · ${money(b.price_cents)}<br>ISBN ${esc(b.isbn)}</p></div></div><h3 style="margin-bottom:14px">实体副本 <span class="muted">/ ${b.copies.length} 册</span></h3>${b.copies.map((c) => `<div class="detail-copy"><div><strong>${esc(c.accession)}</strong><p>${esc(c.location)}</p></div><div class="detail-copy-actions">${tag(c.status)}${state.user ? (c.status === "available" ? btn("借阅", "borrow-copy", "primary", `data-accession="${esc(c.accession)}"`) : c.status === "borrowed" ? btn("追踪去向", "trace-copy", "secondary", `data-accession="${esc(c.accession)}"`) : "") : ""}${state.user && c.status !== "borrowed" ? `<select aria-label="${esc(c.accession)} 副本状态" data-copy-id="${c.id}">${["available", "maintenance", "withdrawn"].map((s) => `<option value="${s}" ${s === c.status ? "selected" : ""}>${labels[s]}</option>`).join("")}</select>` : ""}</div></div>`).join("")}${state.user ? `<div class="modal-actions">${btn(`${icon("edit")} 编辑书目`, "edit-book", "secondary", `data-id="${b.id}"`)}</div>` : ""}`,
  );
}
function bookForm(book) {
  const editing = !!book;
  const b = book || {};
  openModal(
    editing ? "编辑书目" : "新书入库",
    `<form id="book-form"><div class="form-grid"><label class="full">书名<input name="title" required maxlength="150" value="${esc(b.title)}" placeholder="输入完整书名"></label><label>作者<input name="author" required maxlength="100" value="${esc(b.author)}"></label><label>ISBN<input name="isbn" required maxlength="30" value="${esc(b.isbn)}"></label><label>图书分类<select name="category">${["计算机", "文学", "艺术设计", "历史人文", "经济管理", "心理成长"].map((c) => `<option ${c === b.category ? "selected" : ""}>${c}</option>`).join("")}</select></label><label>出版社<input name="publisher" required maxlength="100" value="${esc(b.publisher)}"></label><label>定价（元）<input name="price" type="number" min="0.01" max="10000" step="0.01" required value="${b.price_cents ? b.price_cents / 100 : 50}"></label><label>书封颜色<input name="color" type="color" value="${esc(b.color || "#547365")}" style="width:100%;height:41px;padding:5px"></label>${editing ? "" : `<label>藏书号 / 编号前缀<input name="accession" required maxlength="32" placeholder="例如 LIB-017"></label><label>入库数量<input name="count" type="number" min="1" max="30" value="1" required></label><label class="full">馆藏位置<input name="location" required maxlength="80" placeholder="例如 3F · A区 · 17架"></label><p class="field-hint full">多册入库时自动添加 -01、-02 等编号；藏书号必须唯一。</p>`}</div><div class="form-error"></div><div class="modal-actions">${btn("取消", "close-modal", "secondary")}<button class="btn btn-primary" type="submit">${editing ? "保存修改" : "确认入库"}</button></div></form>`,
  );
  $("#book-form").addEventListener("submit", (e) =>
    submitForm(e, async (data) => {
      data.price_cents = Math.round(Number(data.price) * 100);
      delete data.price;
      if (data.count) data.count = Number(data.count);
      await api(editing ? `/books/${b.id}` : "/books", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(data),
      });
      state.catalogQuery = "";
      closeModal();
      toast(editing ? "书目信息已更新" : "新书与副本已入库");
      await renderRoute();
    }),
  );
}
function openModal(title, body) {
  $("#modal").innerHTML =
    `<div class="modal-head"><h2>${title}</h2><button class="icon-button" data-action="close-modal" aria-label="关闭弹窗">${icon("close")}</button></div><div class="modal-body">${body}</div>`;
  if (!$("#modal").open) $("#modal").showModal();
}
function closeModal() {
  $("#modal").close();
}
async function submitForm(event, handler) {
  event.preventDefault();
  const form = event.target;
  const button = $('[type="submit"]', form);
  const error = $(".form-error", form);
  if (error) error.textContent = "";
  button.disabled = true;
  try {
    await handler(Object.fromEntries(new FormData(form)));
  } catch (e) {
    if (error) error.textContent = e.message;
    else toast(e.message, true);
  } finally {
    button.disabled = false;
  }
}
function guide() {
  return `<aside class="panel aside-guide"><div class="eyebrow">CIRCULATION GUIDE</div><h3>顺畅流转，有章可循</h3>${[
    ["scan", "支持扫码枪", "扫描读者证与图书条码，或手动输入编号后回车。"],
    [
      "shield",
      "借阅资格自动核验",
      "停用、逾期、欠款或达到上限的读者无法办理新借。",
    ],
    [
      "calendar",
      "期限清晰可查",
      "学生默认 30 天，教师 60 天。未逾期可续借一次。",
    ],
    [
      "coins",
      "逾期与损坏处理",
      "逾期每天 0.50 元；污损 10 元、撕毁 30 元、遗失按书价。",
    ],
  ]
    .map(
      ([i, t, p]) =>
        `<div class="guide-item">${icon(i)}<div><strong>${t}</strong><p>${p}</p></div></div>`,
    )
    .join(
      "",
    )}<div class="callout">借还记录与图书状态同步保存，每次业务操作都可追溯。</div></aside>`;
}
async function circulationPage() {
  const t = state.circulationTab;
  let body = "";
  if (t === "records") {
    state.loans = await api(
      `/loans?q=${encodeURIComponent(state.traceQuery || "")}`,
    );
    body = `<form id="loan-filter" class="toolbar"><div class="toolbar-left"><div class="search-field">${icon("search")}<input name="q" aria-label="检索借阅记录" placeholder="读者、书名或藏书号" value="${esc(state.traceQuery || "")}"></div><select name="status" aria-label="借阅状态"><option value="">全部记录</option><option value="unreturned">待归还</option><option value="overdue">已逾期</option><option value="returned">已归还</option></select><button type="submit" class="btn btn-secondary">查询</button></div><a class="btn btn-secondary" href="/api/export/loans">${icon("download")}导出 CSV</a></form><div class="panel" id="loan-results">${loanTable(state.loans)}</div>`;
  } else
    body = `<div class="circulation-grid"><section class="panel form-panel"><div class="section-kicker">${t === "borrow" ? "BORROW A BOOK" : "RETURN A BOOK"}</div><h2>${t === "borrow" ? "办理图书借阅" : "办理图书归还"}</h2><p>${t === "borrow" ? "输入读者证号与藏书号，即可完成借阅登记。" : "输入藏书号，自动查询借阅记录并核算归还费用。"}</p><div class="flow-steps"><span><i class="step-circle">1</i>${t === "borrow" ? "识别读者" : "扫描图书"}</span>${icon("chevron")}<span><i class="step-circle">2</i>${t === "borrow" ? "确认图书" : "检查状况"}</span>${icon("chevron")}<span><i class="step-circle">3</i>${t === "borrow" ? "完成借阅" : "完成归还"}</span></div>${t === "borrow" ? `<form id="borrow-form" class="form-stack"><label>读者证号<input name="card" required maxlength="40" autocomplete="off" placeholder="扫描或输入读者证号，如 20260001"></label><label>图书藏书号<input name="accession" required maxlength="40" autocomplete="off" value="${esc(state.borrowAccession || "")}" placeholder="扫描或输入藏书号，如 LIB-001-02"></label><div class="callout">${icon("info")} 提交后由系统核验借阅资格与副本状态，应还日期按读者档案自动计算。</div><div class="form-error"></div><button type="submit" class="btn btn-primary">${icon("check")}确认借出</button></form>` : `<form id="return-lookup" class="form-stack"><label>图书藏书号<input name="accession" required maxlength="40" autocomplete="off" value="${esc(state.returnAccession || "")}" placeholder="扫描或输入待归还图书的藏书号"></label><div class="form-error"></div><button type="submit" class="btn btn-primary">${icon("search")}查询待还记录</button></form><div id="return-detail"></div>`}<div id="receipt-area">${state.receipt ? receiptMarkup() : ""}</div></section>${guide()}</div>`;
  return `${pageHead("借还工作台", "一次输入，完成借阅、归还与去向查询。", dateLabel())}<div class="toolbar"><div class="segmented">${[
    ["borrow", "办理借阅", "book"],
    ["return", "办理归还", "exchange"],
    ["records", "借阅记录", "history"],
  ]
    .map(
      ([id, label, i]) =>
        `<button data-action="circulation-tab" data-tab="${id}" class="${id === t ? "active" : ""}">${icon(i)}${label}</button>`,
    )
    .join("")}</div></div>${body}`;
}
function receiptMarkup() {
  const r = state.receipt;
  return `<div class="receipt" id="print-receipt">${icon("check")}<h3>${r.type === "borrow" ? "借阅办理成功" : "归还办理成功"}</h3><p>LIBRA 校园图书馆 · 业务凭证</p><div class="receipt-details">${r.type === "borrow" ? `<div><span>借阅编号</span><strong>#${r.id}</strong></div><div><span>读者</span><strong>${esc(r.reader_name)} · ${esc(r.card)}</strong></div><div><span>图书</span><strong>${esc(r.title)}</strong></div>` : ""}<div><span>藏书号</span><strong>${esc(r.accession)}</strong></div>${r.type === "borrow" ? `<div><span>应还日期</span><strong>${fmt(r.due_date)}</strong></div>` : `<div><span>本次应缴费用</span><strong>${money(r.fine_cents)}</strong></div>`}<div><span>办理时间</span><strong>${esc(r.time)}</strong></div></div>${btn(`${icon("print")} 打印凭证`, "print", "secondary")}${r.fine_cents ? ` ${btn("前往缴款登记", "go-fines", "quiet")}` : ""}</div>`;
}
function returnDetail(l) {
  state.returnLoan = l;
  $("#return-detail").innerHTML =
    `<div class="return-summary"><h3>${esc(l.title)}</h3><p>${esc(l.reader_name)} · ${esc(l.card)}<br>${esc(l.accession)} · 应还 ${fmt(l.due_date)}</p><div style="margin-top:10px">${tag(l.status, l.overdue_days ? `逾期 ${l.overdue_days} 天` : "按期归还")} <span class="muted" style="font-size:11px;margin-left:8px">逾期费用 ${money(l.overdue_cents)}</span></div></div><form id="return-form" class="form-stack"><label>图书状况<select name="condition" id="return-condition"><option value="normal">完好，无损坏</option><option value="stained">污损（10.00 元）</option><option value="torn">撕毁（30.00 元）</option><option value="lost">遗失（按定价 ${money(l.price_cents)}）</option></select></label><label>检查备注（可选）<textarea name="note" maxlength="200" placeholder="记录图书状况，便于后续追溯"></textarea></label><div class="callout">预计应缴 <strong id="return-total">${money(l.overdue_cents)}</strong>。最终费用以服务器办理当日核算为准。</div><div class="form-error"></div><button class="btn btn-primary" type="submit">${icon("check")}确认归还</button></form>`;
  $("#return-condition").addEventListener("change", (e) => {
    $("#return-total").textContent = money(
      l.overdue_cents +
        { normal: 0, stained: 1000, torn: 3000, lost: l.price_cents }[
          e.target.value
        ],
    );
  });
  $("#return-form").addEventListener("submit", (e) =>
    submitForm(e, async (data) => {
      const r = await post(`/loans/${l.id}/return`, data);
      state.receipt = {
        ...r,
        type: "return",
        time: timestamp(
          new Date().toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" }),
        ),
      };
      $("#return-detail").innerHTML = "";
      $("#receipt-area").innerHTML = receiptMarkup();
      $("#return-lookup").reset();
      state.returnLoan = null;
      state.returnAccession = "";
      toast("归还成功，馆藏状态已更新");
    }),
  );
}
async function readersPage() {
  state.readers = await api("/readers");
  return `${pageHead("读者管理", "维护读者档案，让每一次借阅都有据可循。", btn(`${icon("plus")} 新增读者`, "add-reader"))}<form id="reader-filter" class="toolbar"><div class="toolbar-left"><div class="search-field">${icon("search")}<input name="q" aria-label="搜索读者" placeholder="搜索姓名、读者证号或院系"></div><button type="submit" class="btn btn-secondary">查询</button></div><span class="result-count" style="margin:0">学生默认 5 本 / 30 天 · 教师 10 本 / 60 天</span></form><div class="panel" id="reader-results">${readerTable()}</div>`;
}
function readerTable() {
  return state.readers.length
    ? `<div class="table-wrap"><table><thead><tr><th>读者</th><th>读者证号</th><th>院系 / 类型</th><th>在借 / 上限</th><th>借期</th><th>未缴费用</th><th>状态</th><th>操作</th></tr></thead><tbody>${state.readers.map((r) => `<tr><td><div class="book-cell"><span class="avatar">${esc(r.name.slice(-2))}</span><strong>${esc(r.name)}</strong></div></td><td>${esc(r.card)}</td><td>${esc(r.department)}<small>${r.kind === "teacher" ? "教师" : "学生"}</small></td><td>${r.borrowed} / ${r.max_loans} 本</td><td>${r.loan_days} 天</td><td>${money(r.debt_cents)}</td><td>${tag(r.active ? "available" : "withdrawn", r.active ? "有效" : "已停用")}</td><td>${btn("编辑档案", "edit-reader", "quiet", `data-id="${r.id}"`)}</td></tr>`).join("")}</tbody></table></div>`
    : empty("没有找到读者", "尝试姓名、院系或读者证号。");
}
function readerForm(reader) {
  const r = reader || {};
  openModal(
    reader ? "编辑读者档案" : "新增读者",
    `<form id="reader-form"><div class="form-grid"><label>姓名<input name="name" required maxlength="50" value="${esc(r.name)}"></label><label>读者证号<input name="card" required maxlength="40" value="${esc(r.card)}"></label><label>院系<input name="department" required maxlength="100" value="${esc(r.department)}"></label><label>读者类型<select name="kind"><option value="student" ${r.kind === "student" ? "selected" : ""}>学生</option><option value="teacher" ${r.kind === "teacher" ? "selected" : ""}>教师</option></select></label><label>借阅上限（本）<input name="max_loans" type="number" min="1" max="30" required value="${r.max_loans || 5}"></label><label>借阅期限（天）<input name="loan_days" type="number" min="1" max="180" required value="${r.loan_days || 30}"></label><label class="full">证件状态<select name="active"><option value="true" ${r.active !== 0 ? "selected" : ""}>有效</option><option value="false" ${r.active === 0 ? "selected" : ""}>停用（仍可办理归还）</option></select></label></div><div class="form-error"></div><div class="modal-actions">${btn("取消", "close-modal", "secondary")}<button type="submit" class="btn btn-primary">保存档案</button></div></form>`,
  );
  if (!reader)
    $('[name="kind"]', $("#reader-form")).addEventListener("change", (e) => {
      $('[name="max_loans"]').value = e.target.value === "teacher" ? 10 : 5;
      $('[name="loan_days"]').value = e.target.value === "teacher" ? 60 : 30;
    });
  $("#reader-form").addEventListener("submit", (e) =>
    submitForm(e, async (data) => {
      data.max_loans = Number(data.max_loans);
      data.loan_days = Number(data.loan_days);
      data.active = data.active === "true";
      await api(reader ? `/readers/${r.id}` : "/readers", {
        method: reader ? "PUT" : "POST",
        body: JSON.stringify(data),
      });
      closeModal();
      toast("读者档案已保存");
      await renderRoute();
    }),
  );
}
async function reportsPage() {
  const d = await api("/reports");
  const max = Math.max(1, ...d.categories.map((c) => c.total));
  return `${pageHead("统计报表", "让每一次流转留下数据，为馆藏管理提供依据。", `<a class="btn btn-secondary" href="/api/export/loans">${icon("download")} 导出借阅明细</a>`)}${metrics(d.stats)}<div class="report-grid"><section class="panel"><div class="panel-heading"><div><h2>近七日流通</h2><p>每日借出与归还，实时汇总</p></div><div class="legend"><span><i></i>借出</span><span><i class="soft"></i>归还</span></div></div>${chart(d.trend)}<div class="report-note">近 7 日流通率 ${d.stats.copies ? Math.round((d.trend.reduce((s, x) => s + x.borrowed, 0) / d.stats.copies) * 100) : 0}% = 近 7 日借出次数 / 当前未下架副本数。当前在借率 ${d.stats.copies ? Math.round((d.stats.borrowed / d.stats.copies) * 100) : 0}%。</div></section><section class="panel"><div class="panel-heading"><h2>馆藏分类分布</h2>${icon("shelf")}</div><div class="category-bars">${d.categories.map((c) => `<div class="category-row"><div><span>${esc(c.category)}</span><span>${c.total} 册 · 在借 ${c.borrowed} 册</span></div><div class="bar-track"><div class="bar-fill" style="width:${(c.total / max) * 100}%"></div></div></div>`).join("")}</div></section><section class="panel"><div class="panel-heading"><h2>热门借阅书目</h2><span class="muted" style="font-size:10px">累计借阅次数</span></div><div class="rank-list">${d.popular.map((b, i) => `<div class="rank-row"><span class="rank-number">0${i + 1}</span>${mini(b)}<div class="rank-title">${esc(b.title)}<small>${esc(b.author)}</small></div><strong>${b.total} <small>次</small></strong></div>`).join("")}</div></section><section class="panel"><div class="panel-heading"><h2>费用与处理情况</h2>${icon("coins")}</div><div style="padding:20px 25px"><div class="eyebrow">累计登记费用</div><div class="metric-value">${money(d.fines.total)}</div><hr><div class="eyebrow">待缴清费用</div><div class="amount">${money(d.fines.unpaid)}</div><p class="muted" style="font-size:11px;line-height:2;margin:20px 0">仅统计归还时已生成的费用。未归还图书的预估逾期费不计入应收流水。</p>${btn("查看罚款流水", "go-fines", "secondary")}</div></section><section class="panel full"><div class="panel-heading"><h2>逾期借阅排行</h2><span class="muted" style="font-size:10px">按逾期天数降序</span></div>${loanTable(d.overdue)}</section></div>`;
}
async function finesPage() {
  const rows = await api("/fines");
  return `${pageHead("罚款与违规", "清晰记录逾期与图书损坏，完成线下缴款登记。", `<a class="btn btn-secondary" href="/api/export/fines">${icon("download")} 导出流水</a>`)}<div class="callout" style="margin-bottom:22px">${icon("info")} 待缴清 ${rows.filter((f) => !f.paid_at).length} 笔，共 ${money(rows.filter((f) => !f.paid_at).reduce((s, f) => s + f.amount_cents, 0))}。请确认已收到线下款项后再登记缴清。</div><div class="panel">${rows.length ? `<div class="table-wrap"><table><thead><tr><th>读者</th><th>图书 / 违规类型</th><th>说明</th><th>应缴金额</th><th>生成日期</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map((f) => `<tr><td><strong>${esc(f.reader_name)}</strong><small>${esc(f.card)}</small></td><td>${esc(f.title)}<small>${f.kind === "overdue" ? "逾期费用" : "损坏 / 遗失"}</small></td><td>${esc(f.note)}</td><td><strong>${money(f.amount_cents)}</strong></td><td>${fmt(f.created_at)}</td><td>${tag(f.paid_at ? "paid" : "unpaid")}</td><td>${f.paid_at ? fmt(f.paid_at) : btn("登记缴清", "pay-fine", "quiet", `data-id="${f.id}" data-amount="${f.amount_cents}" data-name="${esc(f.reader_name)}"`)}</td></tr>`).join("")}</tbody></table></div>` : empty("暂无罚款记录", "图书归还后，系统会自动登记实际产生的逾期或损坏费用。")}</div>`;
}
async function auditPage() {
  const rows = await api("/audit");
  return `${pageHead("操作日志", "每一次变更都有迹可循，业务操作与记录同步留存。", dateLabel())}<div class="panel"><div class="panel-heading"><h2>最近操作</h2><span class="muted" style="font-size:11px">显示最近 200 条记录</span></div><div class="table-wrap"><table><thead><tr><th>操作时间</th><th>操作人</th><th>操作类型</th><th>操作对象</th><th>业务详情</th></tr></thead><tbody>${rows.map((a) => `<tr><td>${timestamp(a.created_at)}</td><td>${esc(a.staff_name)}</td><td><span class="audit-action"><i></i>${esc(a.action)}</span></td><td>${esc(a.target)}</td><td>${esc(a.detail)}</td></tr>`).join("")}</tbody></table></div></div>`;
}
function loginPage() {
  return `<div class="login-wrap"><section class="panel login-card"><div class="login-mark">${icon("book")}</div><div class="eyebrow">WELCOME TO LIBRA</div><h1>欢迎回到图书馆。</h1><p>登录出纳工作台，开始今天的馆藏管理。</p><form id="login-form" class="form-stack"><label>出纳员账号<input name="username" autocomplete="username" required placeholder="输入账号" value="admin"></label><label>密码<input name="password" type="password" autocomplete="current-password" required placeholder="输入密码"></label><div class="form-error"></div><button type="submit" class="btn btn-primary">登录工作台 ${icon("arrow")}</button></form><div class="demo-tip">课程演示账号：admin / Library@2026<br>样例读者为虚构数据，仅用于课程演示。</div><button class="text-link" data-action="public-catalog" style="margin:20px auto 0;display:flex">免登录检索馆藏 ${icon("arrow")}</button></section></div>`;
}
async function renderRoute() {
  const version = ++routeVersion;
  let route = location.hash.slice(1) || "dashboard";
  if (!routes.some((r) => r[0] === route) && route !== "login")
    route = "dashboard";
  state.route = route;
  $$(".nav a").forEach((a) =>
    a.classList.toggle("active", a.dataset.route === route),
  );
  $(".sidebar")?.classList.remove("open");
  $("#breadcrumb-current").textContent =
    routes.find((r) => r[0] === route)?.[2] || "出纳员登录";
  $("#page").innerHTML =
    '<div class="loading"><div class="spinner"></div>正在读取馆藏数据…</div>';
  try {
    let html;
    if ((!state.user && route !== "catalog") || route === "login")
      html = loginPage();
    else
      html = await {
        dashboard: dashboardPage,
        catalog: catalogPage,
        circulation: circulationPage,
        readers: readersPage,
        reports: reportsPage,
        fines: finesPage,
        audit: auditPage,
      }[route]();
    if (version !== routeVersion) return;
    $("#page").innerHTML = `<div class="content-enter">${html}</div>`;
    bindPage();
  } catch (e) {
    if (version === routeVersion)
      $("#page").innerHTML = empty(
        "暂时无法加载",
        `${esc(e.message)}<br>${btn("重新加载", "reload", "secondary")}`,
      );
  }
}
function bindPage() {
  $("#login-form")?.addEventListener("submit", (e) =>
    submitForm(e, async (data) => {
      const result = await post("/login", data);
      state.user = result.user;
      state.csrf = result.csrf;
      shell();
      navigate("dashboard");
      toast("欢迎回来，" + state.user.name);
    }),
  );
  $("#catalog-filter")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const params = new URLSearchParams(new FormData(e.target));
    state.catalogQuery = params.get("q");
    try {
      state.books = await api("/catalog?" + params);
      $("#catalog-results").innerHTML = catalogResults();
    } catch (e) {
      toast(e.message, true);
    }
  });
  $("#reader-filter")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      state.readers = await api(
        "/readers?" + new URLSearchParams(new FormData(e.target)),
      );
      $("#reader-results").innerHTML = readerTable();
    } catch (e) {
      toast(e.message, true);
    }
  });
  $("#loan-filter")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const params = new URLSearchParams(new FormData(e.target));
    state.traceQuery = params.get("q");
    try {
      state.loans = await api("/loans?" + params);
      $("#loan-results").innerHTML = loanTable(state.loans);
    } catch (e) {
      toast(e.message, true);
    }
  });
  $("#borrow-form")?.addEventListener("submit", (e) =>
    submitForm(e, async (data) => {
      const r = await post("/loans", data);
      state.receipt = { ...r, type: "borrow", time: timestamp(r.borrowed_at) };
      $("#receipt-area").innerHTML = receiptMarkup();
      e.target.reset();
      state.borrowAccession = "";
      toast("借阅成功，已生成归还日期");
    }),
  );
  $("#return-lookup")?.addEventListener("submit", (e) =>
    submitForm(e, async (data) => {
      state.receipt = null;
      $("#receipt-area").innerHTML = "";
      $("#return-detail").innerHTML = "";
      const l = await api(
        "/returns/" + encodeURIComponent(data.accession.trim()),
      );
      returnDetail(l);
    }),
  );
  if ($("#return-lookup") && state.returnAccession)
    $("#return-lookup").requestSubmit();
}
function parseCSV(text) {
  const rows = [];
  let row = [],
    field = "",
    quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quote && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quote = !quote;
    } else if (c === "," && !quote) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quote) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quote) throw new Error("CSV 引号未闭合");
  row.push(field);
  if (row.some((x) => x.trim())) rows.push(row);
  if (rows.length < 2) throw new Error("CSV 需要表头和至少一行数据");
  const headers = rows.shift().map((x) => x.trim().replace(/^\uFEFF/, ""));
  const expected = [
    "title",
    "author",
    "isbn",
    "category",
    "publisher",
    "price_cents",
    "accession",
    "count",
    "location",
  ];
  if (expected.some((x) => !headers.includes(x)))
    throw new Error("CSV 表头不完整，请使用示例格式");
  return rows.map((values, i) => {
    if (values.length !== headers.length)
      throw new Error(`第 ${i + 2} 行列数不正确`);
    const obj = Object.fromEntries(
      headers.map((h, j) => [h, values[j].trim()]),
    );
    for (const k of ["price_cents", "count"]) obj[k] = Number(obj[k]);
    return obj;
  });
}
function importModal() {
  openModal(
    "批量导入书目",
    `<p class="muted" style="font-size:12px;line-height:1.9;margin-bottom:17px">上传 UTF-8 CSV 文件，每次最多 100 行。所有行校验通过后一起入库；遇到重复编号或错误，整批不保存。</p><pre class="import-template">title,author,isbn,category,publisher,price_cents,accession,count,location
软件工程,张海藩,9787302000001,计算机,清华大学出版社,5900,NEW-001,2,3F A区</pre><form id="import-form" class="form-stack"><label>选择 CSV 文件<input name="file" type="file" accept=".csv,text/csv" required></label><div class="form-error"></div><div class="modal-actions">${btn("取消", "close-modal", "secondary")}<button class="btn btn-primary" type="submit">校验并导入</button></div></form>`,
  );
  $("#import-form").addEventListener("submit", (e) =>
    submitForm(e, async () => {
      const file = $('[name="file"]', e.target).files[0];
      if (file.size > 500000) throw new Error("文件不得超过 500 KB");
      const rows = parseCSV(await file.text());
      const result = await post("/books/import", { rows });
      state.catalogQuery = "";
      closeModal();
      toast(`成功导入 ${result.count} 种书目`);
      await renderRoute();
    }),
  );
}
document.addEventListener("click", async (event) => {
  const el = event.target.closest("[data-action]");
  if (!el || el.disabled) return;
  const action = el.dataset.action;
  try {
    if (action === "menu") $(".sidebar").classList.toggle("open");
    else if (action === "login") navigate("login");
    else if (action === "public-catalog") navigate("catalog");
    else if (action === "logout") {
      await post("/logout");
      state.user = null;
      state.csrf = "";
      state.receipt = null;
      closeModal();
      shell();
      navigate("catalog");
    } else if (action === "reload") await renderRoute();
    else if (action === "close-modal") closeModal();
    else if (action === "add-book") bookForm();
    else if (action === "edit-book")
      bookForm(state.books.find((b) => b.id === Number(el.dataset.id)));
    else if (action === "book-detail") showBook(el.dataset.id);
    else if (action === "import") importModal();
    else if (action === "grid-view" || action === "list-view") {
      state.view = action === "grid-view" ? "grid" : "list";
      $("#catalog-results").innerHTML = catalogResults();
      $$('[data-action="grid-view"],[data-action="list-view"]').forEach((b) =>
        b.classList.toggle("active", b === el),
      );
    } else if (action === "go-borrow" || action === "borrow-copy") {
      state.circulationTab = "borrow";
      state.borrowAccession = el.dataset.accession || "";
      state.receipt = null;
      closeModal();
      navigate("circulation");
    } else if (action === "return-copy") {
      state.circulationTab = "return";
      state.returnAccession = el.dataset.accession;
      state.receipt = null;
      closeModal();
      navigate("circulation");
    } else if (
      action === "trace-copy" ||
      action === "go-records" ||
      action === "notifications"
    ) {
      state.circulationTab = "records";
      state.traceQuery = el.dataset.accession || "";
      closeModal();
      navigate("circulation");
    } else if (action === "circulation-tab") {
      state.circulationTab = el.dataset.tab;
      state.receipt = null;
      state.returnAccession = "";
      state.traceQuery = "";
      await renderRoute();
    } else if (action === "print") window.print();
    else if (action === "go-fines") navigate("fines");
    else if (action === "add-reader") readerForm();
    else if (action === "edit-reader")
      readerForm(state.readers.find((r) => r.id === Number(el.dataset.id)));
    else if (action === "renew") {
      openModal(
        "确认续借",
        `<p class="muted" style="line-height:1.9">续借将按该读者的借期，在原应还日期上延长。每笔借阅仅可续借一次。</p><div class="modal-actions">${btn("取消", "close-modal", "secondary")}${btn("确认续借", "confirm-renew", "primary", `data-id="${el.dataset.id}"`)}</div>`,
      );
    } else if (action === "confirm-renew") {
      el.disabled = true;
      const r = await post(`/loans/${el.dataset.id}/renew`);
      closeModal();
      toast("续借成功，应还日期 " + fmt(r.due_date));
      await renderRoute();
    } else if (action === "pay-fine") {
      openModal(
        "确认线下收款",
        `<p class="muted" style="line-height:2">读者：${esc(el.dataset.name)}<br>本笔应缴：<strong class="amount">${money(el.dataset.amount)}</strong><br>确认已收到线下款项后，完成缴清登记。本系统不发起在线支付。</p><div class="modal-actions">${btn("取消", "close-modal", "secondary")}${btn("已收款，登记缴清", "confirm-pay", "primary", `data-id="${el.dataset.id}"`)}</div>`,
      );
    } else if (action === "confirm-pay") {
      el.disabled = true;
      await post(`/fines/${el.dataset.id}/pay`);
      closeModal();
      toast("缴款已登记");
      await renderRoute();
    }
  } catch (e) {
    el.disabled = false;
    toast(e.message, true);
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.dataset.copyId) {
    const target = e.target;
    target.disabled = true;
    try {
      await api(`/copies/${target.dataset.copyId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: target.value }),
      });
      closeModal();
      toast("副本状态已更新");
      await renderRoute();
    } catch (error) {
      toast(error.message, true);
      target.disabled = false;
    }
  }
});
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(
      document.activeElement?.tagName,
    ) &&
    !$("#modal").open
  ) {
    e.preventDefault();
    $("#global-search input")?.focus();
  }
});
$("#modal").addEventListener("click", (e) => {
  if (e.target === $("#modal")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeModal();
  }
});
window.addEventListener("hashchange", renderRoute);
(async () => {
  try {
    const s = await api("/session");
    state.user = s.user;
    state.csrf = s.csrf;
  } catch (e) {
    toast(e.message, true);
  }
  shell();
  await renderRoute();
})();
