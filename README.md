# Generate Steps API

## Environment

Set these in [.env](/Users/ankitkumar/Desktop/founding engineer/.env):

- `GROQ_API_KEY=...`
- `GROQ_MODEL=openai/gpt-oss-20b`
- `GROQ_BASE_URL=https://api.groq.com/openai/v1`
- `MAX_AGENT_STEPS=12`
- `OBSERVE_WAIT_MS=5000`
- `SCREENSHOTS_DIR=screenshots`

## Request

`POST /generate-steps`

Body:

```json
{
  "description": "Go to the login page and verify error message on invalid login"
}
```

- `description` is required.

## Response

```json
{
  "steps": [
    { "action": "open", "url": "https://example.com" }
  ],
  "execution": {
    "status": "passed",
    "results": [
      {
        "step": { "action": "open", "url": "https://example.com" },
        "status": "success",
        "playwright_error": null,
        "llm_validation": {
          "success": true,
          "reason": "Page is visible and URL/state matches."
        },
        "screenshot": "screenshots/step-1.png"
      }
    ]
  }
}
```

Supported step shapes:

- `{ "action": "open", "url": "..." }`
- `{ "action": "click", "target": "..." }`
- `{ "action": "type", "target": "...", "value": "..." }`
- `{ "action": "assertion", "target": "...", "contains": "..." }`
- `{ "action": "assertion", "target": "...", "contains_any": ["...", "..."] }`

## Runtime Behavior

1. Generate next step using LLM (single-step planner).
2. Execute that step in Playwright.
3. Wait for `/observe` payload from Chrome Extension (HTML + screenshot).
4. Use deterministic checks first; call LLM validator only for reasoning-heavy steps.
5. Repeat until planner returns `done=true` or any step fails.

## Observe Endpoint

`POST /observe`

```json
{
  "executionId": "optional-uuid",
  "stepIndex": 0,
  "step": { "action": "open", "url": "https://example.com" },
  "html": "<div>...</div>",
  "screenshot": "<base64_png>",
  "timestamp": "2026-04-25T10:00:00.000Z"
}
```

If `executionId` is omitted, backend uses the currently active execution.

## Chrome Extension

Extension files are in [`extension/`](/Users/ankitkumar/Desktop/founding engineer/extension):

1. Load unpacked extension in Chrome.
2. Content script emits observation when page dispatches `AI_TEST_AGENT_OBSERVE`.
3. Background script captures visible tab screenshot and posts to `/observe`.

## Setup

Install browser binaries at least once:

```bash
npx playwright install chromium
```

## Selector Assumptions

The generator is instructed to prefer selectors in this order:

1. `id`
2. `name`
3. `aria-label`
4. `placeholder`
5. text-based XPath

## Limitations

1. Dynamic DOM updates (SPA re-renders, delayed async UI) can invalidate selectors between steps.
2. Reduced HTML is an approximation and may miss runtime state held in shadow DOM/canvas/iframes.
3. Visual+HTML LLM validation is probabilistic and may produce false positives/negatives.
4. LLM/API availability, rate limits, or quota can fail runs even when browser actions succeed.
5. Assertion checks are substring-based (`contains` / `contains_any`) and are not full semantic validation.
6. If Chromium is not installed locally, execution fails until `npx playwright install chromium` is run.
