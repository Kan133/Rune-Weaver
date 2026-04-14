import { chromium, type Browser, type Page } from "playwright";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import path from "path";

type IntegrationKeys =
  | "initialized"
  | "namespaceReady"
  | "workspaceReady"
  | "serverBridge"
  | "uiBridge"
  | "ready";

interface IntegrationState {
  initialized: boolean;
  namespaceReady: boolean;
  workspaceReady: boolean;
  serverBridge: boolean;
  uiBridge: boolean;
  ready: boolean;
}

interface UiSnapshot {
  hostStatus: string;
  initializeButton: "enabled" | "disabled";
  createButton: "enabled" | "disabled";
  integrationStatus: IntegrationState;
  executionOutputEmpty: boolean;
}

interface RunReport {
  success: boolean;
  hostPath: string;
  uiUrl: string;
  beforeClick?: UiSnapshot;
  afterClick?: UiSnapshot;
  outputExcerpt?: {
    firstLines: string[];
    lastLines: string[];
  };
  postPromptCreateButton?: "enabled" | "disabled";
  commandResult?: {
    status: string;
    exitCode: string;
    command: string;
  };
  screenshotPath?: string;
  error?: string;
}

const UI_URL = process.env.UI_URL ?? "http://localhost:5175/";
const TEMPLATE_HOST = "D:\\x-template";
const TEST_HOST = path.join(process.cwd(), "test-hosts", "ui_init_case");
const TEST_RESULTS_DIR = path.join(process.cwd(), "test-results");
const SCREENSHOT_PATH = path.join(TEST_RESULTS_DIR, "ui-init-evidence.png");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function resetFixture(): void {
  if (!existsSync(TEMPLATE_HOST)) {
    throw new Error(`Template host not found: ${TEMPLATE_HOST}`);
  }

  rmSync(TEST_HOST, { recursive: true, force: true });
  ensureDir(path.dirname(TEST_HOST));
  cpSync(TEMPLATE_HOST, TEST_HOST, { recursive: true });

  const addonConfigPath = path.join(TEST_HOST, "scripts", "addon.config.ts");
  if (existsSync(addonConfigPath)) {
    const content = readFileSync(addonConfigPath, "utf8");
    const next = content.replace(
      /let\s+addon_name(?::\s*\w+)?\s*=\s*['"][^'"]+['"]/,
      "let addon_name = 'x_template'",
    );
    writeFileSync(addonConfigPath, next, "utf8");
  }

  rmSync(path.join(TEST_HOST, "game", "scripts", "src", "rune_weaver"), {
    recursive: true,
    force: true,
  });
  rmSync(path.join(TEST_HOST, "content", "panorama", "src", "rune_weaver"), {
    recursive: true,
    force: true,
  });
}

async function waitForUi(page: Page): Promise<void> {
  await page.goto(UI_URL, { waitUntil: "networkidle" });
  await page.getByTestId("host-root-input").waitFor({ timeout: 10000 });
}

async function readIntegrationState(page: Page): Promise<IntegrationState> {
  const keys: IntegrationKeys[] = [
    "initialized",
    "namespaceReady",
    "workspaceReady",
    "serverBridge",
    "uiBridge",
    "ready",
  ];

  const entries = await Promise.all(
    keys.map(async (key) => {
      const value = await page
        .getByTestId(`integration-status-${key}`)
        .getAttribute("data-ready");
      return [key, value === "true"] as const;
    }),
  );

  return Object.fromEntries(entries) as IntegrationState;
}

async function readSnapshot(page: Page): Promise<UiSnapshot> {
  const hostStatus = (await page.getByTestId("host-status-indicator").textContent())?.trim() ?? "";
  const initializeDisabled = await page.getByTestId("initialize-button").isDisabled();
  const createDisabled = await page.getByTestId("create-dry-run-button").isDisabled();
  const panelVisible = await page.getByTestId("execution-output-panel").isVisible().catch(() => false);

  return {
    hostStatus,
    initializeButton: initializeDisabled ? "disabled" : "enabled",
    createButton: createDisabled ? "disabled" : "enabled",
    integrationStatus: await readIntegrationState(page),
    executionOutputEmpty: !panelVisible,
  };
}

async function waitForInitReady(page: Page): Promise<void> {
  await page.getByTestId("host-root-input").fill(TEST_HOST);

  for (let i = 0; i < 30; i += 1) {
    const hostStatus = await page.getByTestId("host-status-indicator").textContent();
    const initializeDisabled = await page.getByTestId("initialize-button").isDisabled();

    if (hostStatus?.includes("Valid") && !initializeDisabled) {
      return;
    }

    await sleep(500);
  }

  throw new Error("UI never reached a valid pre-init state");
}

async function waitForInitCompletion(page: Page): Promise<void> {
  await page.getByTestId("execution-output-panel").waitFor({ timeout: 10000 });

  for (let i = 0; i < 120; i += 1) {
    const statusText = (await page.getByTestId("execution-result-status").textContent())?.trim() ?? "";
    const exitCodeText = (await page.getByTestId("execution-result-exit-code").textContent())?.trim() ?? "";
    const initializedReady = await page
      .getByTestId("integration-status-initialized")
      .getAttribute("data-ready");
    const readyReady = await page.getByTestId("integration-status-ready").getAttribute("data-ready");

    if (
      statusText.includes("Success") &&
      exitCodeText.includes("0") &&
      initializedReady === "true" &&
      readyReady === "true"
    ) {
      return;
    }

    await sleep(1000);
  }

  throw new Error("UI never reflected a completed successful init");
}

async function readOutputExcerpt(page: Page): Promise<{ firstLines: string[]; lastLines: string[] }> {
  const rawText = (await page
    .locator('[data-testid="execution-output-lines"] > div span:last-child')
    .allTextContents())
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    firstLines: rawText.slice(0, 12),
    lastLines: rawText.slice(-12),
  };
}

async function readCommandResult(page: Page): Promise<RunReport["commandResult"]> {
  const status = ((await page.getByTestId("execution-result-status").textContent()) ?? "").trim();
  const exitCode = ((await page.getByTestId("execution-result-exit-code").textContent()) ?? "").trim();
  const command = ((await page.getByTestId("execution-result-command").textContent()) ?? "").trim();

  return { status, exitCode, command };
}

async function run(): Promise<RunReport> {
  ensureDir(TEST_RESULTS_DIR);
  resetFixture();

  const report: RunReport = {
    success: false,
    hostPath: TEST_HOST,
    uiUrl: UI_URL,
  };

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== "false",
    });

    const page = await browser.newPage();
    await waitForUi(page);
    await waitForInitReady(page);

    report.beforeClick = await readSnapshot(page);

    await page.getByTestId("initialize-button").click();
    await waitForInitCompletion(page);

    report.afterClick = await readSnapshot(page);
    report.outputExcerpt = await readOutputExcerpt(page);
    report.commandResult = await readCommandResult(page);

    await page.getByTestId("feature-prompt-input").fill("做一个按Q键的冲刺技能");
    for (let i = 0; i < 20; i += 1) {
      const disabled = await page.getByTestId("create-dry-run-button").isDisabled();
      if (!disabled) {
        break;
      }
      await sleep(250);
    }
    report.postPromptCreateButton = (await page.getByTestId("create-dry-run-button").isDisabled())
      ? "disabled"
      : "enabled";

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    report.screenshotPath = SCREENSHOT_PATH;

    report.success =
      report.beforeClick.initializeButton === "enabled" &&
      report.beforeClick.integrationStatus.initialized === false &&
      report.afterClick.integrationStatus.initialized === true &&
      report.afterClick.integrationStatus.ready === true &&
      report.afterClick.initializeButton === "disabled" &&
      report.commandResult.status.includes("Success") &&
      report.commandResult.exitCode.includes("0") &&
      report.commandResult.command.includes("init") &&
      report.postPromptCreateButton === "enabled";
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  } finally {
    await browser?.close();
  }

  return report;
}

function printSnapshot(title: string, snapshot: UiSnapshot): void {
  console.log(title);
  console.log(`- Host Status: ${snapshot.hostStatus}`);
  console.log(`- Initialize Button: ${snapshot.initializeButton}`);
  console.log(`- Create (Dry-run) Button: ${snapshot.createButton}`);
  console.log("- Integration Status:");
  console.log(`  - initialized: ${snapshot.integrationStatus.initialized}`);
  console.log(`  - namespaceReady: ${snapshot.integrationStatus.namespaceReady}`);
  console.log(`  - workspaceReady: ${snapshot.integrationStatus.workspaceReady}`);
  console.log(`  - serverBridge: ${snapshot.integrationStatus.serverBridge}`);
  console.log(`  - uiBridge: ${snapshot.integrationStatus.uiBridge}`);
  console.log(`  - ready: ${snapshot.integrationStatus.ready}`);
  console.log(`- ExecutionOutputPanel Empty: ${snapshot.executionOutputEmpty}`);
}

run()
  .then((report) => {
    console.log("# Product Entry Integration Final Initialize Evidence");
    console.log("## 1. 使用的 host 路径");
    console.log(report.hostPath);
    console.log("");

    console.log("## 2. 点击前 UI 状态");
    if (report.beforeClick) {
      printSnapshot("", report.beforeClick);
    } else {
      console.log("未采集到点击前状态");
    }
    console.log("");

    console.log("## 3. 真实 UI 点击证据");
    console.log(`- 浏览器地址: ${report.uiUrl}`);
    console.log("- 使用 Playwright 真实打开 Product Setup 页面");
    console.log("- 在 Host Root 输入框输入测试宿主路径");
    console.log("- 等待 Host Status 变为 Valid 后点击 Initialize 按钮");
    console.log("");

    console.log("## 4. ExecutionOutputPanel 成功输出摘要");
    if (report.commandResult) {
      console.log("- Execution Result:");
      console.log(`  - ${report.commandResult.status}`);
      console.log(`  - ${report.commandResult.exitCode}`);
      console.log(`  - ${report.commandResult.command}`);
    }
    if (report.outputExcerpt) {
      console.log("- 前 12 行输出:");
      console.log("```text");
      console.log(report.outputExcerpt.firstLines.join("\n"));
      console.log("```");
      console.log("- 后 12 行输出:");
      console.log("```text");
      console.log(report.outputExcerpt.lastLines.join("\n"));
      console.log("```");
    }
    console.log("");

    console.log("## 5. 点击后 UI 状态变化");
    if (report.afterClick) {
      printSnapshot("", report.afterClick);
      if (report.postPromptCreateButton) {
        console.log(`- Create (Dry-run) after entering prompt: ${report.postPromptCreateButton}`);
      }
    } else {
      console.log("未采集到点击后状态");
    }
    console.log("");

    console.log("## 6. 一致性自检");
    console.log(
      `- 点击前状态与代码逻辑一致: ${report.beforeClick?.initializeButton === "enabled" && report.beforeClick?.integrationStatus.initialized === false ? "YES" : "NO"}`,
    );
    console.log(
      `- 输出与 Initialize case 一致: ${report.commandResult?.command.includes("init") ? "YES" : "NO"}`,
    );
    console.log(
      `- 点击后状态与成功完成一致: ${report.afterClick?.integrationStatus.initialized && report.postPromptCreateButton === "enabled" ? "YES" : "NO"}`,
    );
    if (report.screenshotPath) {
      console.log(`- 截图: ${report.screenshotPath}`);
    }
    console.log("");

    console.log("## 7. 最终结论");
    console.log(
      report.success
        ? "✅ Product Entry Integration final initialize evidence 完成"
        : "❌ Product Entry Integration final initialize evidence 未完成",
    );
    if (report.error) {
      console.log(`- 错误: ${report.error}`);
    }

    process.exit(report.success ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
