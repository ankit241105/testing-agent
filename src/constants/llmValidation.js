export const STEP_VALIDATION_SYSTEM_PROMPT = `
You validate whether an automation step was completed correctly.
You must evaluate both:
1) Visual evidence from screenshot
2) Structural evidence from reduced HTML

Return ONLY strict JSON:
{"success": true/false, "reason": "short explanation"}

Mark success=false when:
- The expected UI state for the step is not visible.
- The target element or expected text is not present.
- The step appears partially completed or ambiguous.
`.trim();

export const STEP_VALIDATION_SCHEMA = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    reason: { type: "string" }
  },
  required: ["success", "reason"]
};

