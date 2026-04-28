import {
  NEXT_STEP_RESPONSE_SCHEMA,
  STEP_GENERATION_SYSTEM_PROMPT
} from "../constants/llmStepGeneration.js";
import { isValidStep } from "../utils/stepValidation.js";
import { generateJsonFromGroq } from "./groqClient.js";

function parseNextStep(rawContent) {
  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  if (typeof parsed.done !== "boolean") return null;
  if (typeof parsed.requiresReasoning !== "boolean") return null;
  if (typeof parsed.needsVisualValidation !== "boolean") return null;
  if (typeof parsed.reason !== "string") return null;

  if (parsed.done === true) {
    if (parsed.step !== null) return null;
    return parsed;
  }

  if (!isValidStep(parsed.step)) return null;
  return parsed;
}

function summarizeHistory(executedSteps, executionResults) {
  if (executedSteps.length === 0) return "No steps executed yet.";

  return executedSteps
    .map((step, index) => {
      const result = executionResults[index];
      const status = result?.status || "unknown";
      const reason = result?.reason || "";
      return `#${index + 1} ${JSON.stringify(step)} => ${status}${reason ? ` (${reason})` : ""}`;
    })
    .join("\n");
}

/**
 * @param {{
 *   description: string,
 *   executedSteps: Array<object>,
 *   executionResults: Array<object>,
 *   lastObservation?: { html?: string } | null
 * }} input
 * @returns {Promise<{
 *   done: boolean,
 *   step: object | null,
 *   requiresReasoning: boolean,
 *   needsVisualValidation: boolean,
 *   reason: string
 * }>}
 */
export async function generateNextStep(input) {
  const { description, executedSteps, executionResults, lastObservation } = input;

  const observationHtml =
    typeof lastObservation?.html === "string" ? lastObservation.html.slice(0, 12000) : "";

  const userPrompt = [
    `Test goal:\n${description.trim()}`,
    "Executed history:",
    summarizeHistory(executedSteps, executionResults),
    "Latest observation HTML snippet:",
    observationHtml || "<none>"
  ].join("\n\n");

  const rawContent = await generateJsonFromGroq({
    systemPrompt: STEP_GENERATION_SYSTEM_PROMPT,
    userPrompt,
    responseSchema: NEXT_STEP_RESPONSE_SCHEMA,
    temperature: 0.2
  });

  const nextStep = parseNextStep(rawContent);
  if (!nextStep) {
    const error = new Error("Groq returned invalid next-step JSON.");
    error.code = "INVALID_LLM_OUTPUT";
    throw error;
  }

  return nextStep;
}
