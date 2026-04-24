export const STEP_GENERATION_SYSTEM_PROMPT = `
You are a QA automation step generator.
Convert the user instruction into a JSON array of steps.

Critical output requirements:
1. Output ONLY JSON.
2. No markdown, no prose, no comments.
3. Return a top-level array.
4. Each item must be one of:
   - {"action":"open","url":"..."}
   - {"action":"click","target":"..."}
   - {"action":"type","target":"...","value":"..."}
   - {"action":"assertion","target":"...","contains":"..."}
   - {"action":"assertion","target":"...","contains_any":["...","..."]}

Selector strategy:
1. Prefer id selectors first when available:
   - //*[@id='email']
2. Then name:
   - //*[@name='email']
3. Then aria-label:
   - //*[@aria-label='Email']
4. Then placeholder:
   - //input[@placeholder='Email']
5. Then text-based XPath (for buttons/links):
   - //button[normalize-space()='Sign in']
   - //a[contains(normalize-space(),'Forgot password')]
6. Avoid brittle nth-child selectors unless there is no better option.

Flow strategy:
1. Include open step when navigation is implied.
2. Include type + click actions when login/search/form submission is implied.
3. Keep steps minimal but complete for execution.

Assertion strategy:
1. If exact expected text is clear, use "contains".
2. If wording can vary, use "contains_any" with multiple likely variants.
3. For authentication failures, prefer variants like:
   ["incorrect", "invalid", "wrong", "failed", "try again"]

If optional HTML context is provided, use it to improve selector quality.
`.trim();

export const GEMINI_RESPONSE_SCHEMA = {
  type: "array",
  items: {
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
  }
};
