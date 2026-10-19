/* Real-browser and HTTP E2E against Flask + real MySQL. No mocks or unit tests. */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
let playwright;
try {
  playwright = require("playwright");
} catch {
  if (!process.env.PLAYWRIGHT_MODULE) {
    throw new Error("Playwright is missing. Run npm install, or set PLAYWRIGHT_MODULE.");
  }
  playwright = require(process.env.PLAYWRIGHT_MODULE);
}
const ROOT = path.resolve(__dirname, "..");
const output = path.join(ROOT, "artifacts");
fs.mkdirSync(output, { recursive: true });
const report = {
  started: new Date().toISOString(),
  database: "campus_library_e2e",
  checks: [],
  errors: [],
  screenshots: [],
};
let server, browser;
const base = "http://127.0.0.1:4318";
async function check(name, run) {
  const start = Date.now();
  try {
    await run();
    report.checks.push({ name, status: "passed", ms: Date.now() - start });
    console.log("PASS", name);
  } catch (e) {
    report.checks.push({ name, status: "failed", message: e.message });
    throw e;
  }
}
async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(base + "/api/session");
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw Error("Test server did not start");
}
(async () => {
  const python =
    process.env.PYTHON || path.join(ROOT, ".venv", "Scripts", "python.exe");
  server = spawn(python, ["tests/serve.py"], {
    cwd: ROOT,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const log = fs.createWriteStream(path.join(output, "e2e-server.log"));
  server.stdout.pipe(log);
  server.stderr.pipe(log);
  await waitForServer();
  browser = await playwright.chromium.launch({
    headless: true,
    channel: process.env.BROWSER_CHANNEL || "msedge",
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    locale: "zh-CN",
    reducedMotion: "reduce",
  });
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => report.errors.push(e.message));
  const raw = async (endpoint, method = "GET", data, csrf) => {
    const r = await context.request.fetch(base + "/api" + endpoint, {
      method,
      headers: csrf ? { "X-CSRF-Token": csrf } : {},
      data,
    });
    return { status: r.status(), body: await r.json() };
  };
  let csrf, book, reader, loan;
  await check(
    "Public catalog works and private data is protected",
    async () => {
      assert.equal((await raw("/catalog?q=设计")).status, 200);
      for (const endpoint of [
        "/readers",
        "/loans",
        "/dashboard",
        "/reports",
        "/audit",
        "/fines",
      ])
        assert.equal((await raw(endpoint)).status, 401);
      assert.equal((await raw("/books", "POST", {})).status, 401);
      await page.goto(base + "/#catalog");
      await page
        .getByRole("heading", { name: "馆藏检索", exact: true })
        .waitFor();
      await page.getByLabel("检索馆藏").fill("三体");
      await page
        .locator("#catalog-filter")
        .getByRole("button", { name: "检索", exact: true })
        .click();
      await page.waitForFunction(
        () => document.querySelectorAll(".book-card").length === 1,
      );
      await page.getByRole("heading", { name: "三体", exact: true }).waitFor();
      assert.equal(await page.locator(".book-card").count(), 1);
    },
  );
  await check(
    "Login rejects wrong password, then authenticates through UI",
    async () => {
      await page.goto(base + "/#login");
      await page.locator('[name="password"]').fill("bad-password");
      await page.getByRole("button", { name: "登录工作台" }).click();
      await page.getByText("账号或密码不正确", { exact: true }).waitFor();
      await page.locator('[name="password"]').fill("Library@2026");
      await page.getByRole("button", { name: "登录工作台" }).click();
      await page
        .getByRole("heading", { name: "工作台概览", exact: true })
        .waitFor();
      csrf = (await raw("/session")).body.data.csrf;
      assert.equal((await raw("/readers", "POST", {})).status, 403);
      await page.screenshot({
        path: path.join(output, "01-dashboard.png"),
        fullPage: true,
      });
      report.screenshots.push("01-dashboard.png");
    },
  );
  await check(
    "Catalog grid, filters, details and book creation/edit work",
    async () => {
      await page.getByRole("link", { name: "馆藏检索" }).click();
      await page.getByRole("button", { name: "新书入库" }).click();
      const f = page.locator("#book-form");
      for (const [k, v] of Object.entries({
        title: "E2E 信息系统设计",
        author: "课程小组",
        isbn: "E2E-ISBN-001",
        publisher: "课程出版社",
        accession: "E2E-COPY",
        count: "3",
        location: "3F · 测试架",
      }))
        await f.locator(`[name="${k}"]`).fill(v);
      await f.getByRole("button", { name: "确认入库" }).click();
      await page
        .getByRole("heading", { name: "E2E 信息系统设计", exact: true })
        .waitFor();
      book = (await raw("/catalog?q=E2E-ISBN-001")).body.data[0];
      assert.equal(book.copies.length, 3);
      await page
        .getByRole("button", { name: "查看 E2E 信息系统设计", exact: true })
        .click();
      await page.getByRole("button", { name: "编辑书目" }).click();
      await page
        .locator('#book-form [name="title"]')
        .fill("E2E 信息系统设计（修订版）");
      await page.getByRole("button", { name: "保存修改" }).click();
      await page
        .getByRole("heading", {
          name: "E2E 信息系统设计（修订版）",
          exact: true,
        })
        .waitFor();
      await page.getByLabel("列表视图").click();
      await page
        .getByRole("cell", { name: "E2E-ISBN-001", exact: true })
        .waitFor();
      await page.getByLabel("卡片视图").click();
      await page.screenshot({
        path: path.join(output, "02-catalog.png"),
        fullPage: true,
      });
      report.screenshots.push("02-catalog.png");
    },
  );
  await check("Reader create and edit through UI", async () => {
    await page.getByRole("link", { name: "读者管理" }).click();
    await page.getByRole("button", { name: "新增读者" }).click();
    const f = page.locator("#reader-form");
    for (const [k, v] of Object.entries({
      name: "测试读者",
      card: "E2E-R001",
      department: "计算机学院",
      max_loans: "1",
    }))
      await f.locator(`[name="${k}"]`).fill(v);
    await f.getByRole("button", { name: "保存档案" }).click();
    await page.getByRole("cell", { name: "E2E-R001", exact: true }).waitFor();
    reader = (await raw("/readers?q=E2E-R001")).body.data[0];
    assert.equal(reader.max_loans, 1);
    await page
      .getByRole("row")
      .filter({ hasText: "E2E-R001" })
      .getByRole("button", { name: "编辑档案" })
      .click();
    await page
      .locator('#reader-form [name="department"]')
      .fill("信息系统课程组");
    await page.getByRole("button", { name: "保存档案" }).click();
    await page
      .getByRole("cell", { name: "信息系统课程组", exact: false })
      .waitFor();
  });
  await check(
    "Borrow through UI produces persistent receipt and blocks duplicate/limit",
    async () => {
      await page.getByRole("link", { name: "借还工作台" }).click();
      await page.locator('#borrow-form [name="card"]').fill("E2E-R001");
      await page.locator('#borrow-form [name="accession"]').fill("E2E-COPY-01");
      await page.getByRole("button", { name: "确认借出", exact: true }).click();
      await page.getByRole("heading", { name: "借阅办理成功" }).waitFor();
      loan = (await raw("/loans?q=E2E-COPY-01")).body.data[0];
      assert.equal(loan.status, "active");
      assert.equal(
        (
          await raw(
            "/loans",
            "POST",
            { card: "E2E-R001", accession: "E2E-COPY-02" },
            csrf,
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await raw(
            "/loans",
            "POST",
            { card: "20260012", accession: "E2E-COPY-01" },
            csrf,
          )
        ).status,
        409,
      );
      await page.screenshot({
        path: path.join(output, "03-borrow-receipt.png"),
        fullPage: true,
      });
      report.screenshots.push("03-borrow-receipt.png");
      await page.reload();
      await page.getByRole("button", { name: "借阅记录", exact: true }).click();
      await page.getByLabel("检索借阅记录").fill("E2E-COPY-01");
      await page
        .locator("#loan-filter")
        .getByRole("button", { name: "查询", exact: true })
        .click();
      await page
        .getByRole("cell", { name: "E2E 信息系统设计（修订版） E2E-COPY-01" })
        .waitFor();
    },
  );
  await check("Renew once through UI; second renewal rejected", async () => {
    await page.getByRole("button", { name: "续借", exact: true }).click();
    await page.getByRole("button", { name: "确认续借" }).click();
    await page.getByText("已续借 1 次", { exact: true }).waitFor();
    const renewed = (await raw("/loans?q=E2E-COPY-01")).body.data[0];
    assert.equal(renewed.renewals, 1);
    assert(renewed.due_date > loan.due_date);
    assert.equal(
      (await raw(`/loans/${loan.id}/renew`, "POST", {}, csrf)).status,
      409,
    );
  });
  await check(
    "Return damaged book through UI; fines, maintenance and payment persist",
    async () => {
      await page.getByRole("button", { name: "归还", exact: true }).click();
      await page.locator("#return-condition").waitFor();
      await page.locator("#return-condition").selectOption("stained");
      await page.getByRole("button", { name: "确认归还", exact: true }).click();
      await page.getByRole("heading", { name: "归还办理成功" }).waitFor();
      assert.equal(
        (
          await raw(
            `/loans/${loan.id}/return`,
            "POST",
            { condition: "normal" },
            csrf,
          )
        ).status,
        409,
      );
      const b = (await raw("/catalog?q=E2E-ISBN-001")).body.data[0];
      assert.equal(b.copies[0].status, "maintenance");
      assert.equal(
        (
          await raw(
            "/loans",
            "POST",
            { card: "E2E-R001", accession: "E2E-COPY-02" },
            csrf,
          )
        ).status,
        409,
      );
      await page.getByRole("link", { name: "罚款与违规" }).click();
      await page.getByRole("button", { name: "登记缴清", exact: true }).click();
      await page.getByRole("button", { name: "已收款，登记缴清" }).click();
      await page.getByText("已缴清", { exact: true }).waitFor();
      const fines = (await raw("/fines")).body.data;
      assert.equal(fines.length, 1);
      assert.equal(fines[0].amount_cents, 1000);
      assert(fines[0].paid_at);
      assert.equal(
        (await raw(`/fines/${fines[0].id}/pay`, "POST", {}, csrf)).status,
        409,
      );
    },
  );
  await check("Concurrent requests cannot double-borrow a copy", async () => {
    const data = { card: "20260012", accession: "E2E-COPY-02" };
    const replies = await Promise.all([
      raw("/loans", "POST", data, csrf),
      raw("/loans", "POST", data, csrf),
    ]);
    assert.deepEqual(replies.map((r) => r.status).sort(), [201, 409]);
  });
  await check(
    "Concurrent requests cannot exceed reader loan limit",
    async () => {
      const replies = await Promise.all([
        raw(
          "/loans",
          "POST",
          { card: "E2E-R001", accession: "E2E-COPY-03" },
          csrf,
        ),
        raw(
          "/loans",
          "POST",
          { card: "E2E-R001", accession: "LIB-016-02" },
          csrf,
        ),
      ]);
      assert.deepEqual(replies.map((r) => r.status).sort(), [201, 409]);
    },
  );
  await check(
    "Due-today costs zero; yesterday costs exactly 50 cents",
    async () => {
      const a = await raw(
        "/loans/1/return",
        "POST",
        { condition: "normal" },
        csrf,
      );
      assert.equal(a.status, 200);
      assert.equal(a.body.data.fine_cents, 0);
      const b = await raw(
        "/loans/2/return",
        "POST",
        { condition: "normal" },
        csrf,
      );
      assert.equal(b.status, 200);
      assert.equal(b.body.data.fine_cents, 50);
      const repeated = await Promise.all([
        raw("/loans/3/return", "POST", { condition: "torn" }, csrf),
        raw("/loans/3/return", "POST", { condition: "torn" }, csrf),
      ]);
      assert.deepEqual(repeated.map((r) => r.status).sort(), [200, 409]);
    },
  );
  await check(
    "Validation, availability and import rollback enforced by backend",
    async () => {
      assert.equal(
        (
          await raw(
            "/loans",
            "POST",
            { card: "missing", accession: "E2E-COPY-03" },
            csrf,
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await raw(
            "/readers",
            "POST",
            { name: "Bad", card: "BAD", department: "x", max_loans: -1 },
            csrf,
          )
        ).status,
        400,
      );
      const rows = [
        {
          title: "Must rollback",
          author: "a",
          isbn: "E2E-ROLLBACK",
          category: "计算机",
          publisher: "p",
          price_cents: 1000,
          accession: "ROLLBACK",
          count: 1,
          location: "x",
        },
        {
          title: "Duplicate",
          author: "a",
          isbn: "E2E-ISBN-001",
          category: "计算机",
          publisher: "p",
          price_cents: 1000,
          accession: "ROLLBACK2",
          count: 1,
          location: "x",
        },
      ];
      assert.equal(
        (await raw("/books/import", "POST", { rows }, csrf)).status,
        409,
      );
      assert.equal((await raw("/catalog?q=E2E-ROLLBACK")).body.data.length, 0);
      assert.equal(
        (
          await raw(
            `/copies/${book.copies[1].id}`,
            "PATCH",
            { status: "withdrawn" },
            csrf,
          )
        ).status,
        409,
      );
      const copy = (await raw("/catalog?q=9787111407010")).body.data[0]
        .copies[0];
      assert.equal(
        (
          await raw(
            `/copies/${copy.id}`,
            "PATCH",
            { status: "withdrawn" },
            csrf,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await raw(
            "/loans",
            "POST",
            { card: "20260012", accession: copy.accession },
            csrf,
          )
        ).status,
        409,
      );
      const teacher = (await raw("/readers?q=20260008")).body.data[0];
      assert.equal(
        (
          await raw(
            `/readers/${teacher.id}`,
            "PUT",
            { ...teacher, active: false },
            csrf,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await raw(
            "/loans",
            "POST",
            { card: teacher.card, accession: "LIB-016-02" },
            csrf,
          )
        ).status,
        409,
      );
    },
  );
  await check(
    "CSV import UI, export, search empty state and reports work",
    async () => {
      await page.getByRole("link", { name: "馆藏检索" }).click();
      await page.getByRole("button", { name: "批量导入" }).click();
      await page
        .locator('[name="file"]')
        .setInputFiles({
          name: "books.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(
            "title,author,isbn,category,publisher,price_cents,accession,count,location\n导入测试书,课程小组,E2E-IMPORTED,计算机,课程出版社,5900,E2E-IMPORT,1,2F A区",
          ),
        });
      await page.getByRole("button", { name: "校验并导入" }).click();
      await page
        .getByRole("heading", { name: "导入测试书", exact: true })
        .waitFor();
      await page.getByLabel("检索馆藏").fill("不存在xyz123");
      await page
        .locator("#catalog-filter")
        .getByRole("button", { name: "检索", exact: true })
        .click();
      await page.getByText("没有找到相关图书", { exact: true }).waitFor();
      await page.getByRole("link", { name: "统计报表" }).click();
      await page
        .getByRole("heading", { name: "统计报表", exact: true })
        .waitFor();
      const download = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("link", { name: "导出借阅明细" }).click(),
      ]);
      await download[0].saveAs(path.join(output, "loans-export.csv"));
      assert(
        fs
          .readFileSync(path.join(output, "loans-export.csv"), "utf8")
          .includes("E2E-R001"),
      );
      await page.screenshot({
        path: path.join(output, "04-reports.png"),
        fullPage: true,
      });
      report.screenshots.push("04-reports.png");
      await page.getByRole("link", { name: "操作日志" }).click();
      await page
        .getByRole("heading", { name: "操作日志", exact: true })
        .waitFor();
      assert(
        (await raw("/audit")).body.data.some((a) => a.action === "缴款登记"),
      );
    },
  );
  await check(
    "Mobile navigation, responsive layout and logout protection",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(base + "/#dashboard");
      await page
        .getByRole("heading", { name: "工作台概览", exact: true })
        .waitFor();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      );
      await page.screenshot({
        path: path.join(output, "05-mobile.png"),
        fullPage: true,
      });
      report.screenshots.push("05-mobile.png");
      await page.getByLabel("展开导航").click();
      await page.getByRole("link", { name: "馆藏检索" }).click();
      await page
        .getByRole("heading", { name: "馆藏检索", exact: true })
        .waitFor();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      );
      await page.getByLabel("展开导航").click();
      await page.getByLabel("退出登录").click();
      await page
        .getByRole("button", { name: "出纳员登录", exact: true })
        .waitFor();
      assert.equal((await raw("/readers")).status, 401);
      assert.equal(report.errors.length, 0);
    },
  );
  await context.tracing.stop({ path: path.join(output, "e2e-trace.zip") });
  report.status = "passed";
})()
  .catch((e) => {
    report.status = "failed";
    report.errors.push(e.stack);
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    report.finished = new Date().toISOString();
    fs.writeFileSync(
      path.join(output, "e2e-results.json"),
      JSON.stringify(report, null, 2),
    );
    if (browser) await browser.close();
    if (server) server.kill();
    console.log(`Report: ${path.join(output, "e2e-results.json")}`);
  });
