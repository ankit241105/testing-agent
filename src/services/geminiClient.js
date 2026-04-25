import { APP_CONFIG } from "../config/appConfig.js";

function buildError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function extractTextFromGeminiResponse(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;

  const text = parts
    .filter((part) => part && typeof part.text === "string")
    .map((part) => part.text)
    .join("");

  return text || null;
}

/**
 * @param {{
 *   systemPrompt: string,
 *   userPrompt: string,
 *   responseSchema?: object,
 *   imageBase64?: string,
 *   imageMimeType?: string,
 *   temperature?: number
 * }} input
 * @returns {Promise<string>}
 */
export async function generateJsonFromGemini(input) {
  const {
    systemPrompt,
    userPrompt,
    responseSchema,
    imageBase64,
    imageMimeType = "image/png",
    temperature = 0
  } = input;

  if (!APP_CONFIG.geminiApiKey) {
    throw buildError(
      "GEMINI_API_KEY is missing. Set it in your environment before calling /generate-steps.",
      "MISSING_GEMINI_API_KEY"
    );
  }

  const userParts = [{ text: userPrompt }];
  if (typeof imageBase64 === "string" && imageBase64.trim()) {
    userParts.push({
      inline_data: {
        mime_type: imageMimeType,
        data: imageBase64
      }
    });
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
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: "user",
            parts: userParts
          }
        ],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
          responseSchema
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
  const rawContent = extractTextFromGeminiResponse(data);
  if (!rawContent) {
    throw buildError("Gemini response content was empty.", "INVALID_LLM_OUTPUT");
  }

  return rawContent;
}

