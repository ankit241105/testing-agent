export const STEP_GENERATION_SYSTEM_PROMPT = `
You are an AI Test Agent planner.
Generate ONLY the next single step for browser automation, not a full list.

Output rules:
1. Return only valid JSON.
2. The response must match this shape:
{
  "done": boolean,
  "step": ActionOrAssertionObject | null,
  "requiresReasoning": boolean,
  "needsVisualValidation": boolean,
  "reason": "short explanation"
}
3. If the scenario is complete, return done=true and step=null.

Supported step object formats:
- {"action":"open","url":"https://..."}
- {"action":"click","target":"..."}
- {"action":"type","target":"...","value":"..."}
- {"action":"assertion","target":"...","contains":"..."}
- {"action":"assertion","target":"...","contains_any":["...","..."]}

Selector strategy:
- Prefer id, then name, then aria-label, then placeholder, then text-based XPath.
- Avoid brittle nth-child selectors.

Reasoning policy:
- requiresReasoning=false for deterministic actions (open/type/click) unless state is ambiguous.
- requiresReasoning=true for unclear assertions, page-state ambiguity, or unexpected states.
- needsVisualValidation=true only when DOM/text is likely insufficient.
`.trim();

export const STEP_OBJECT_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: {
        action: { type: "string", enum: ["open"] },
        url: { type: "string" }
      },
      required: ["action", "url"]
    },
    {
      type: "object",
      properties: {
        action: { type: "string", enum: ["click"] },
        target: { type: "string" }
      },
      required: ["action", "target"]
    },
    {
      type: "object",
      properties: {
        action: { type: "string", enum: ["type"] },
        target: { type: "string" },
        value: { type: "string" }
      },
      required: ["action", "target", "value"]
    },
    {
      type: "object",
      properties: {
        action: { type: "string", enum: ["assertion"] },
        target: { type: "string" },
        contains: { type: "string" }
      },
      required: ["action", "target", "contains"]
    },
    {
      type: "object",
      properties: {
        action: { type: "string", enum: ["assertion"] },
        target: { type: "string" },
        contains_any: {
          type: "array",
          minItems: 1,
          items: { type: "string" }
        }
      },
      required: ["action", "target", "contains_any"]
    }
  ]
};

export const NEXT_STEP_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    done: { type: "boolean" },
    step: {
      anyOf: [STEP_OBJECT_SCHEMA, { type: "null" }]
    },
    requiresReasoning: { type: "boolean" },
    needsVisualValidation: { type: "boolean" },
    reason: { type: "string" }
  },
  required: ["done", "step", "requiresReasoning", "needsVisualValidation", "reason"]
};
