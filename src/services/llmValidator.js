import {
  STEP_VALIDATION_SCHEMA,
  STEP_VALIDATION_SYSTEM_PROMPT
} from "../constants/llmValidation.js";
import { generateJsonFromGemini } from "./geminiClient.js";

function parseValidationResult(rawContent) {
  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  if (typeof parsed.success !== "boolean" || typeof parsed.reason !== "string") {
    return null;
  }

  return parsed;
}

/**
 * @param {{
 *   step: object,
 *   screenshotBase64: string,
 *   reducedHtml: string,
 *   stepIndex: number
 * }} input
 * @returns {Promise<{success: boolean, reason: string}>}
 */
export async function validateStepWithLLM(input) {
  const { step, screenshotBase64, reducedHtml, stepIndex } = input;

  const reducedHtmlSnippet =
    typeof reducedHtml === "string" ? reducedHtml.slice(0, 35000) : "";

  const userPrompt = [
    `Step index: ${stepIndex + 1}`,
    `Step JSON: ${JSON.stringify(step)}`,
    "Reduced HTML (truncated if needed):",
    reducedHtmlSnippet || "<empty>"
  ].join("\n\n");

  const rawContent = await generateJsonFromGemini({
    systemPrompt: STEP_VALIDATION_SYSTEM_PROMPT,
    userPrompt,
    responseSchema: STEP_VALIDATION_SCHEMA,
    imageBase64: screenshotBase64,
    imageMimeType: "image/png",
    temperature: 0
  });

  const validation = parseValidationResult(rawContent);
  if (!validation) {
    const error = new Error("Validator LLM returned invalid JSON output.");
    error.code = "INVALID_LLM_OUTPUT";
    throw error;
  }

  return validation;
}

