import { APP_CONFIG } from "../config/appConfig.js";

function buildError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function extractTextFromResponsesPayload(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const entry of content) {
      if (entry?.type === "output_text" && typeof entry?.text === "string") {
        return entry.text;
      }
    }
  }

  return null;
}

function buildInputPayload(systemPrompt, userPrompt, imageBase64, imageMimeType) {
  const userContent = [{ type: "input_text", text: userPrompt }];
  if (typeof imageBase64 === "string" && imageBase64.trim()) {
    userContent.push({
      type: "input_image",
      detail: "auto",
      image_url: `data:${imageMimeType};base64,${imageBase64}`
    });
  }

  return [
    {
      role: "system",
      content: [{ type: "input_text", text: systemPrompt }]
    },
    {
      role: "user",
      content: userContent
    }
  ];
}

async function callGroqResponsesApi(body) {
  const response = await fetch(`${APP_CONFIG.groqBaseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${APP_CONFIG.groqApiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errorBody = "";
    try {
      errorBody = await response.text();
    } catch {
      errorBody = "";
    }
    throw buildError(
      `Groq request failed with status ${response.status}. ${errorBody}`.trim(),
      "LLM_REQUEST_FAILED"
    );
  }

  return response.json();
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
export async function generateJsonFromGroq(input) {
  const {
    systemPrompt,
    userPrompt,
    responseSchema,
    imageBase64,
    imageMimeType = "image/png",
    temperature = 0.2
  } = input;

  if (!APP_CONFIG.groqApiKey) {
    throw buildError(
      "GROQ_API_KEY is missing. Set it in your environment before calling /generate-steps.",
      "MISSING_GROQ_API_KEY"
    );
  }

  const body = {
    model: APP_CONFIG.groqModel,
    input: buildInputPayload(systemPrompt, userPrompt, imageBase64, imageMimeType),
    temperature,
    text: {
      format: responseSchema
        ? {
            type: "json_schema",
            name: "structured_output",
            schema: responseSchema
          }
        : { type: "json_object" }
    }
  };

  let payload;
  try {
    payload = await callGroqResponsesApi(body);
  } catch (error) {
    const shouldRetryWithoutImage =
      typeof imageBase64 === "string" &&
      imageBase64.length > 0 &&
      error?.code === "LLM_REQUEST_FAILED";

    if (shouldRetryWithoutImage) {
      payload = await callGroqResponsesApi({
        ...body,
        input: buildInputPayload(systemPrompt, userPrompt, undefined, imageMimeType)
      });
    } else {
      throw error;
    }
  }

  const rawContent = extractTextFromResponsesPayload(payload);
  if (!rawContent) {
    throw buildError("Groq response content was empty.", "INVALID_LLM_OUTPUT");
  }

  return rawContent;
}

