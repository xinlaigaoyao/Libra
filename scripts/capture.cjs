const path = require("node:path");
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  if (!process.env.PLAYWRIGHT_MODULE) {
    throw new Error("Playwright is missing. Run npm install, or set PLAYWRIGHT_MODULE.");
  }
  ({ chromium } = require(process.env.PLAYWRIGHT_MODULE));
}
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1080 },
      locale: "zh-CN",
      reducedMotion: "reduce",
    });
    await page.goto("http://127.0.0.1:4317/#login");
    await page.locator('[name="password"]').fill("Library@2026");
    await page.getByRole("button", { name: "登录工作台" }).click();
    await page
      .getByRole("heading", { name: "工作台概览", exact: true })
      .waitFor();
    await page.waitForFunction(
      () => !document.querySelector("#toast").classList.contains("show"),
    );
    await page.screenshot({
      path: path.resolve("artifacts/preview-dashboard.png"),
      fullPage: true,
    });
    await page.getByRole("link", { name: "馆藏检索" }).click();
    await page
      .getByRole("heading", { name: "馆藏检索", exact: true })
      .waitFor();
    await page.screenshot({
      path: path.resolve("artifacts/preview-catalog.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://127.0.0.1:4317/#dashboard");
    await page
      .getByRole("heading", { name: "工作台概览", exact: true })
      .waitFor();
    await page.screenshot({
      path: path.resolve("artifacts/preview-mobile.png"),
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
})();
