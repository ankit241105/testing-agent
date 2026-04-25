import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { validateStepWithLLM } from "./llmValidator.js";

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
    return;
  }

  if (step.action === "type") {
    const locator = page.locator(step.target).first();
    await locator.fill(step.value);
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
 * @param {{steps: Array<Object>, screenshotsDir?: string}} input
 * @returns {Promise<{status: "passed" | "failed", results: Array<Object>}>}
 */
export async function executeStepsWithPlaywright(input) {
  const { steps, screenshotsDir = "screenshots" } = input;
  const resolvedScreenshotsDir = path.resolve(process.cwd(), screenshotsDir);
  await mkdir(resolvedScreenshotsDir, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    const wrappedError = new Error(
      error instanceof Error ? error.message : "Failed to launch Chromium."
    );
    wrappedError.code = "BROWSER_LAUNCH_FAILED";
    throw wrappedError;
  }

  const page = await browser.newPage();
  const results = [];
  let status = "passed";

  try {
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      const screenshotRelativePath = path.join("screenshots", `step-${index + 1}.png`);
      const screenshotAbsolutePath = path.join(
        resolvedScreenshotsDir,
        `step-${index + 1}.png`
      );

      let playwrightError = null;
      let llmValidation = { success: false, reason: "Validation did not run." };

      console.log(`[Step ${index + 1}] Starting: ${JSON.stringify(step)}`);

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
      try {
        await page.screenshot({ path: screenshotAbsolutePath, fullPage: true });
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

      try {
        const screenshotBuffer = await readFile(screenshotAbsolutePath);
        llmValidation = await validateStepWithLLM({
          step,
          screenshotBase64: screenshotBuffer.toString("base64"),
          reducedHtml,
          stepIndex: index
        });
        console.log(`[Step ${index + 1}] LLM validation: ${JSON.stringify(llmValidation)}`);
      } catch (error) {
        const validationError = error instanceof Error ? error.message : String(error);
        llmValidation = { success: false, reason: validationError };
        console.error(`[Step ${index + 1}] LLM validation error: ${validationError}`);
      }

      const didStepPass = !playwrightError && llmValidation.success;
      results.push({
        step,
        status: didStepPass ? "success" : "failed",
        playwright_error: playwrightError,
        llm_validation: llmValidation,
        screenshot: screenshotRelativePath
      });

      if (!didStepPass) {
        status = "failed";
        break;
      }
    }
  } finally {
    await browser.close();
  }

  return { status, results };
}
