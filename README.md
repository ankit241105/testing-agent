# Generate Steps API

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

1. Generate steps using LLM.
2. Launch Playwright Chromium.
3. Execute steps sequentially.
4. After each step (success/failure):
   - wait 500ms
   - capture screenshot
   - capture reduced HTML (`document.body.innerHTML` with script/style-like nodes removed)
   - validate step with LLM using screenshot + reduced HTML
5. Stop immediately when Playwright fails or validator returns `success: false`.

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
