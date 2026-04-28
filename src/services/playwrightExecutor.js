import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

function normalizeText(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

async function runAssertionStep(page, step) {
  const locator = page.locator(step.target).first();
  const textContent = await locator.textContent();
  const normalizedText = normalizeText(textContent);

  if (typeof step.contains === "string") {
    const expected = normalizeText(step.contains);
    if (!normalizedText.includes(expected)) {
      throw new Error(
        `Assertion failed: target ${step.target} does not contain "${step.contains}".`
      );
    }
    return;
  }

  if (Array.isArray(step.contains_any)) {
    const hasMatch = step.contains_any.some((candidate) =>
      normalizedText.includes(normalizeText(candidate))
    );
    if (!hasMatch) {
      throw new Error(
        `Assertion failed: target ${step.target} does not contain any expected values.`
      );
    }
    return;
  }

  throw new Error("Assertion step missing contains or contains_any.");
}

async function runStep(page, step) {
  if (step.action === "open") {
    await page.goto(step.url, { waitUntil: "domcontentloaded" });
    const currentUrl = page.url();
    const expectedHost = new URL(step.url).host;
    const currentHost = new URL(currentUrl).host;
    if (expectedHost !== currentHost) {
      throw new Error(`Navigation landed on unexpected host: ${currentHost}`);
    }
    return;
  }

  if (step.action === "type") {
    const locator = page.locator(step.target).first();
    await locator.fill(step.value);
    const typedValue = await locator.inputValue();
    if (typedValue !== step.value) {
      throw new Error(`Type check failed for ${step.target}.`);
    }
    return;
  }

  if (step.action === "click") {
    const locator = page.locator(step.target).first();
    await locator.click();
    return;
  }

  if (step.action === "assertion") {
    await runAssertionStep(page, step);
    return;
  }

  throw new Error(`Unsupported step action: ${step.action}`);
}

async function getReducedHtml(page) {
  return page.evaluate(() => {
    if (!document.body) return "";

    const clone = document.body.cloneNode(true);
    clone.querySelectorAll("script,style,noscript,template").forEach((node) => {
      node.remove();
    });
    clone.querySelectorAll("[hidden],[aria-hidden='true']").forEach((node) => {
      node.remove();
    });
    return clone.innerHTML;
  });
}

/**
 * @param {{ screenshotsDir?: string }} options
 */
export async function createPlaywrightSession(options = {}) {
  const screenshotsDir = options.screenshotsDir || "screenshots";
  const resolvedScreenshotsDir = path.resolve(process.cwd(), screenshotsDir);
  await mkdir(resolvedScreenshotsDir, { recursive: true });
  const extensionDir = path.resolve(process.cwd(), options.extensionDir || "extension");
  const userDataDir = path.resolve(process.cwd(), options.userDataDir || ".chromium-user-data");
  await mkdir(userDataDir, { recursive: true });

  let context;
  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false
      ,
      args: [
        `--disable-extensions-except=${extensionDir}`,
        `--load-extension=${extensionDir}`
      ]
    });
  } catch (error) {
    const wrappedError = new Error(
      error instanceof Error ? error.message : "Failed to launch Chromium."
    );
    wrappedError.code = "BROWSER_LAUNCH_FAILED";
    throw wrappedError;
  }

  const existingPage = context.pages()[0];
  const page = existingPage || (await context.newPage());
  return { context, page, screenshotsDir, resolvedScreenshotsDir };
}

/**
 * @param {{context: object}} session
 */
export async function closePlaywrightSession(session) {
  if (session?.context) {
    await session.context.close();
  }
}

/**
 * @param {{
 *  page: object,
 *  resolvedScreenshotsDir: string,
 *  screenshotsDir: string
 * }} session
 * @param {object} step
 * @param {number} index
 */
export async function executeStepWithPlaywright(session, step, index) {
  const { page, resolvedScreenshotsDir, screenshotsDir } = session;
  const screenshotRelativePath = path.join(screenshotsDir, `step-${index + 1}.png`);
  const screenshotAbsolutePath = path.join(resolvedScreenshotsDir, `step-${index + 1}.png`);

  console.log(`[Step ${index + 1}] Executing with Playwright: ${JSON.stringify(step)}`);

  let playwrightError = null;
  try {
    await runStep(page, step);
    console.log(`[Step ${index + 1}] Playwright execution succeeded.`);
  } catch (error) {
    playwrightError = error instanceof Error ? error.message : String(error);
    console.error(`[Step ${index + 1}] Playwright error: ${playwrightError}`);
  }

  try {
    await page.waitForTimeout(500);
  } catch (error) {
    const waitError = error instanceof Error ? error.message : String(error);
    console.error(`[Step ${index + 1}] Stability wait error: ${waitError}`);
  }

  let reducedHtml = "";
  let screenshotBase64 = "";
  try {
    await page.screenshot({ path: screenshotAbsolutePath, fullPage: true });
    const screenshotBuffer = await readFile(screenshotAbsolutePath);
    screenshotBase64 = screenshotBuffer.toString("base64");
    console.log(`[Step ${index + 1}] Screenshot captured: ${screenshotRelativePath}`);
  } catch (error) {
    const screenshotError = error instanceof Error ? error.message : String(error);
    console.error(`[Step ${index + 1}] Screenshot error: ${screenshotError}`);
    if (!playwrightError) {
      playwrightError = `Screenshot capture failed: ${screenshotError}`;
    }
  }

  try {
    reducedHtml = await getReducedHtml(page);
  } catch (error) {
    const htmlError = error instanceof Error ? error.message : String(error);
    console.error(`[Step ${index + 1}] Reduced HTML extraction error: ${htmlError}`);
  }

  return {
    success: !playwrightError,
    playwright_error: playwrightError,
    reducedHtml,
    screenshot: screenshotRelativePath,
    screenshotBase64
  };
}
