export const STEP_JSON_SCHEMA = {
  name: "test_steps",
  strict: true,
  schema: {
    type: "array",
    items: {
      oneOf: [
        {
          type: "object",
          properties: {
            action: { const: "open" },
            url: { type: "string" }
          },
          required: ["action", "url"],
          additionalProperties: false
        },
        {
          type: "object",
          properties: {
            action: { const: "click" },
            target: { type: "string" }
          },
          required: ["action", "target"],
          additionalProperties: false
        },
        {
          type: "object",
          properties: {
            action: { const: "type" },
            target: { type: "string" },
            value: { type: "string" }
          },
          required: ["action", "target", "value"],
          additionalProperties: false
        },
        {
          type: "object",
          properties: {
            action: { const: "assertion" },
            target: { type: "string" },
            contains: { type: "string" }
          },
          required: ["action", "target", "contains"],
          additionalProperties: false
        }
      ]
    }
  }
};

export const STEP_GENERATION_SYSTEM_PROMPT = `
You are an AI Test Step Generator.

Your job is to convert a natural language test description into a structured JSON array of test steps.

Rules:

* Return ONLY valid JSON. Do NOT include explanations, comments, or extra text.
* The output must be a JSON array.
* Each item in the array must be either an ActionObject or an AssertionObject.

ActionObject formats:

* { "action": "open", "url": "https://example.com" }
* { "action": "click", "target": "<selector>" }
* { "action": "type", "target": "<selector>", "value": "<text>" }

AssertionObject format:

* { "action": "assertion", "target": "<selector>", "contains": "<expected_text>" }
* You may also use: "contains_any": ["text1", "text2"]

Guidelines:

* Use realistic selectors such as id, name, placeholder, aria-label, or XPath.
* Prefer stable selectors (id > name > placeholder > text-based XPath).
* For login flows:

  * Email field → //input[@type='email'] or //*[@id='username']
  * Password field → //input[@type='password']
  * Submit button → //button[@type='submit']
* For navigation:

  * "go to" → open action with full URL (add https:// if missing)
* For assertions:

  * Use flexible matching like "incorrect", "invalid", or "wrong" if exact text is uncertain
* Keep steps minimal but complete

Example Input:
Go to linkedin.com, login with email [test@gmail.com](mailto:test@gmail.com) and password 1234 and verify invalid credentials

Example Output:
[
{ "action": "open", "url": "https://www.linkedin.com" },
{ "action": "type", "target": "//*[@id='username']", "value": "[test@gmail.com](mailto:test@gmail.com)" },
{ "action": "type", "target": "//*[@id='password']", "value": "1234" },
{ "action": "click", "target": "//button[@type='submit']" },
{
"action": "assertion",
"target": "//*[contains(@id,'error') or contains(@class,'error')]",
"contains_any": ["incorrect", "invalid", "wrong"]
}
]

Now convert the following instruction into JSON:
`.trim();

