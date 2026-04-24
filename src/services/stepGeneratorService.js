import { APP_CONFIG } from "../config/appConfig.js";
import {
  GEMINI_RESPONSE_SCHEMA,
  STEP_GENERATION_SYSTEM_PROMPT
} from "../constants/llmStepGeneration.js";
import { parseAndValidateSteps } from "../utils/stepValidation.js";

function buildError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function extractContentFromGeminiResponse(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;

  const text = parts
    .filter((part) => part && typeof part.text === "string")
    .map((part) => part.text)
    .join("");

  return text || null;
}

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

  if (!APP_CONFIG.geminiApiKey) {
    throw buildError(
      "GEMINI_API_KEY is missing. Set it in your environment before calling /generate-steps.",
      "MISSING_GEMINI_API_KEY"
    );
  }

  const response = await fetch(
    `${APP_CONFIG.geminiBaseUrl}/models/${APP_CONFIG.geminiModel}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": APP_CONFIG.geminiApiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: STEP_GENERATION_SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildUserPrompt(description, htmlContext) }]
          }
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA
        }
      })
    }
  );

  if (!response.ok) {
    let errorBody = "";
    try {
      errorBody = await response.text();
    } catch {
      errorBody = "";
    }
    throw buildError(
      `Gemini request failed with status ${response.status}. ${errorBody}`.trim(),
      "LLM_REQUEST_FAILED"
    );
  }

  const data = await response.json();
  const rawContent = extractContentFromGeminiResponse(data);
  if (!rawContent) {
    throw buildError("Gemini response content was empty.", "INVALID_LLM_OUTPUT");
  }

  const steps = parseAndValidateSteps(rawContent);
  if (!steps) {
    throw buildError("Gemini returned invalid step JSON.", "INVALID_LLM_OUTPUT");
  }

  return steps;
}
