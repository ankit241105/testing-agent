import {
  GEMINI_RESPONSE_SCHEMA,
  STEP_GENERATION_SYSTEM_PROMPT
} from "../constants/llmStepGeneration.js";
import { generateJsonFromGemini } from "./geminiClient.js";
import { parseAndValidateSteps } from "../utils/stepValidation.js";

function buildUserPrompt(description, htmlContext) {
  const sections = [`Instruction:\n${description.trim()}`];

  if (typeof htmlContext === "string" && htmlContext.trim()) {
    sections.push(
      [
        "Optional HTML context (simplified snippet):",
        htmlContext.trim(),
        "Use this context for selector quality when possible."
      ].join("\n")
    );
  }

  return sections.join("\n\n");
}

/**
 * @param {{description: string, htmlContext?: string}} input
 * @returns {Promise<Array<Object>>}
 */
export async function generateStepsFromDescription(input) {
  const { description, htmlContext } = input;
  const rawContent = await generateJsonFromGemini({
    systemPrompt: STEP_GENERATION_SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(description, htmlContext),
    responseSchema: GEMINI_RESPONSE_SCHEMA,
    temperature: 0
  });

  const steps = parseAndValidateSteps(rawContent);
  if (!steps) {
    const error = new Error("Gemini returned invalid step JSON.");
    error.code = "INVALID_LLM_OUTPUT";
    throw error;
  }

  return steps;
}
