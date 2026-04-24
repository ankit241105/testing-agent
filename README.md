# Generate Steps API

## Request

`POST /generate-steps`

Body:

```json
{
  "description": "Go to the login page and verify error message on invalid login",
  "htmlContext": "<form><input id='email' ... /></form>"
}
```

- `description` is required.
- `htmlContext` is optional and should be a simplified HTML snippet when available.

## Response

Strict JSON array of steps. Supported step shapes:

- `{ "action": "open", "url": "..." }`
- `{ "action": "click", "target": "..." }`
- `{ "action": "type", "target": "...", "value": "..." }`
- `{ "action": "assertion", "target": "...", "contains": "..." }`
- `{ "action": "assertion", "target": "...", "contains_any": ["...", "..."] }`

## Selector Assumptions

The generator is instructed to prefer selectors in this order:

1. `id`
2. `name`
3. `aria-label`
4. `placeholder`
5. text-based XPath

## Limitations

1. Dynamic DOM changes can break selectors generated from stale descriptions or stale `htmlContext`.
2. Selectors are best-effort and may still require human review for highly dynamic or componentized UIs.
3. `htmlContext` is optional and simplified snippets may omit key attributes that improve selector quality.
4. LLM output is validated strictly server-side, but upstream model availability/rate limits can still cause request failures.
5. Assertions using `contains_any` improve robustness but are still substring-based and not semantic checks.

