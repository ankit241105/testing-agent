const ALLOWED_ACTIONS = new Set(["open", "click", "type", "assertion"]);

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value) {
  return typeof value === "string";
}

export function isValidStep(step) {
  if (!isObject(step)) return false;
  if (!ALLOWED_ACTIONS.has(step.action)) return false;

  if (step.action === "open") {
    return (
      isString(step.url) &&
      Object.keys(step).length === 2 &&
      Object.hasOwn(step, "action") &&
      Object.hasOwn(step, "url")
    );
  }

  if (step.action === "click") {
    return (
      isString(step.target) &&
      Object.keys(step).length === 2 &&
      Object.hasOwn(step, "action") &&
      Object.hasOwn(step, "target")
    );
  }

  if (step.action === "type") {
    return (
      isString(step.target) &&
      isString(step.value) &&
      Object.keys(step).length === 3 &&
      Object.hasOwn(step, "action") &&
      Object.hasOwn(step, "target") &&
      Object.hasOwn(step, "value")
    );
  }

  if (step.action === "assertion") {
    return (
      isString(step.target) &&
      isString(step.contains) &&
      Object.keys(step).length === 3 &&
      Object.hasOwn(step, "action") &&
      Object.hasOwn(step, "target") &&
      Object.hasOwn(step, "contains")
    );
  }

  return false;
}

export function parseAndValidateSteps(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;
  if (!parsed.every(isValidStep)) return null;

  return parsed;
}

