import { APP_CONFIG } from "../config/appConfig.js";
import { validateStepWithLLM } from "../services/llmValidator.js";
import {
  closeObservationExecution,
  startObservationExecution,
  waitForObservation
} from "../services/observerHandler.js";
import {
  closePlaywrightSession,
  createPlaywrightSession,
  executeStepWithPlaywright
} from "../services/playwrightExecutor.js";
import { generateNextStep } from "../services/stepGeneratorService.js";

function maybeStripDataUrlPrefix(base64OrDataUrl) {
  if (typeof base64OrDataUrl !== "string") return "";
  const prefixMatch = base64OrDataUrl.match(/^data:image\/[a-zA-Z]+;base64,(.*)$/);
  return prefixMatch ? prefixMatch[1] : base64OrDataUrl;
}

function shouldRetryOpenFailure(step, playwrightError) {
  if (step.action !== "open") return false;
  if (!playwrightError) return false;
  const lower = playwrightError.toLowerCase();
  return (
    lower.includes("net::") ||
    lower.includes("navigation") ||
    lower.includes("timeout") ||
    lower.includes("unexpected host")
  );
}

function shouldUseLLMForStep(step, requiresReasoning) {
  if (requiresReasoning) return true;
  return false;
}

export async function generateStepsController(req, res) {
  const description = req.body.description;
  const maxSteps = APP_CONFIG.maxAgentSteps;
  const executionId = startObservationExecution();
  const executedSteps = [];
  const results = [];
  let lastObservation = null;
  let status = "passed";
  let session = null;

  try {
    session = await createPlaywrightSession({
      screenshotsDir: APP_CONFIG.screenshotsDir,
      extensionDir: APP_CONFIG.extensionDir,
      userDataDir: APP_CONFIG.chromeUserDataDir
    });

    for (let index = 0; index < maxSteps; index += 1) {
      const generation = await generateNextStep({
        description,
        executedSteps,
        executionResults: results.map((item) => ({
          status: item.status,
          reason: item.reason
        })),
        lastObservation
      });

      if (generation.done) {
        console.log(`[Agent] Marked done at step ${index + 1}: ${generation.reason}`);
        break;
      }

      const step = generation.step;
      const requiresReasoning = generation.requiresReasoning || step.action === "assertion";
      const needsVisualValidation = generation.needsVisualValidation === true;
      console.log(`[Step ${index + 1}] Generated: ${JSON.stringify(step)}`);

      let playwrightResult = await executeStepWithPlaywright(session, step, index);
      if (!playwrightResult.success && shouldRetryOpenFailure(step, playwrightResult.playwright_error)) {
        console.log(`[Step ${index + 1}] Retrying open step once due to navigation failure.`);
        const retryResult = await executeStepWithPlaywright(session, step, index);
        if (retryResult.success || !playwrightResult.success) {
          playwrightResult = retryResult;
        }
      }

      const observePayload = {
        executionId,
        stepIndex: index,
        step,
        html: playwrightResult.reducedHtml || "",
        screenshot: playwrightResult.screenshotBase64 || "",
        timestamp: new Date().toISOString()
      };
      try {
        await session.page.evaluate((payload) => {
          window.dispatchEvent(new CustomEvent("ai-test-agent-observe", { detail: payload }));
          window.postMessage({ type: "AI_TEST_AGENT_OBSERVE", ...payload }, "*");
        }, observePayload);
        console.log(`[Step ${index + 1}] Dispatched observe signal to extension.`);
      } catch (error) {
        console.error(
          `[Step ${index + 1}] Failed to dispatch observe event: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      const observed = await waitForObservation(
        executionId,
        index,
        APP_CONFIG.observeWaitMs
      );

      let resolvedObservation = observed;
      if (!resolvedObservation) {
        console.log(
          `[Step ${index + 1}] No extension observation received in time. Controller will call /observe directly.`
        );
        try {
          const observeResponse = await fetch(`http://127.0.0.1:${APP_CONFIG.port}/observe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(observePayload)
          });
          const observeData = await observeResponse.json();
          console.log(
            `[Step ${index + 1}] Controller /observe response: ${observeResponse.status} ${JSON.stringify(observeData)}`
          );
          resolvedObservation = await waitForObservation(executionId, index, 500);
        } catch (error) {
          console.error(
            `[Step ${index + 1}] Controller /observe call failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      if (resolvedObservation) {
        console.log(`[Step ${index + 1}] Observation resolved and available.`);
      } else {
        console.log(
          `[Step ${index + 1}] Observation still unavailable; using Playwright fallback only.`
        );
      }

      const mergedObservation = {
        html: resolvedObservation?.html || playwrightResult.reducedHtml || "",
        screenshot: resolvedObservation?.screenshot || playwrightResult.screenshotBase64 || ""
      };
      lastObservation = mergedObservation;

      let usedLLM = false;
      let llmSuccess = true;
      let reason = playwrightResult.success ? "Step executed successfully." : playwrightResult.playwright_error;

      if (!playwrightResult.success && step.action === "open") {
        reason = "Site unreachable or invalid URL";
      }

      if (playwrightResult.success && shouldUseLLMForStep(step, requiresReasoning)) {
        usedLLM = true;
        try {
          const llmDecision = await validateStepWithLLM({
            step,
            reducedHtml: mergedObservation.html,
            screenshotBase64: maybeStripDataUrlPrefix(mergedObservation.screenshot),
            stepIndex: index,
            includeScreenshot: needsVisualValidation
          });
          llmSuccess = llmDecision.success;
          reason = llmDecision.reason;
          console.log(`[Step ${index + 1}] LLM validation result: ${JSON.stringify(llmDecision)}`);
        } catch (error) {
          llmSuccess = false;
          reason = error instanceof Error ? error.message : String(error);
          console.error(`[Step ${index + 1}] LLM validation failed: ${reason}`);
        }
      } else {
        console.log(`[Step ${index + 1}] LLM skipped (deterministic validation).`);
      }

      const stepPassed = playwrightResult.success && llmSuccess;
      executedSteps.push(step);
      results.push({
        step,
        status: stepPassed ? "success" : "failed",
        used_llm: usedLLM,
        reason,
        screenshot: playwrightResult.screenshot
      });

      if (!stepPassed) {
        status = "failed";
        break;
      }
    }

    if (executedSteps.length >= maxSteps && status === "passed") {
      status = "failed";
      results.push({
        step: null,
        status: "failed",
        used_llm: false,
        reason: "Maximum step limit reached before completion.",
        screenshot: null
      });
    }

    return res.json({
      steps: executedSteps,
      execution: {
        status,
        results
      }
    });
  } catch (error) {
    if (error.code === "MISSING_GROQ_API_KEY") {
      return res.status(500).json({ error: error.message });
    }

    if (error.code === "INVALID_LLM_OUTPUT") {
      return res.status(502).json({
        error: "LLM returned invalid JSON output. Please try again."
      });
    }

    if (error.code === "LLM_REQUEST_FAILED") {
      return res.status(502).json({
        error: "Groq request failed. Check API key/model and try again."
      });
    }

    if (error.code === "BROWSER_LAUNCH_FAILED") {
      return res.status(500).json({
        error: "Playwright browser launch failed. Ensure Chromium is installed."
      });
    }

    return res.status(500).json({ error: "Internal server error." });
  } finally {
    if (session) {
      await closePlaywrightSession(session);
    }
    closeObservationExecution(executionId);
  }
}
