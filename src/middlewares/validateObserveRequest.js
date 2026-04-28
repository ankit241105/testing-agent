export function validateObserveRequest(req, res, next) {
  const { step, html, screenshot, timestamp, stepIndex, executionId } = req.body || {};

  if (typeof step !== "object" || step === null || Array.isArray(step)) {
    return res.status(400).json({
      error: "Invalid request body. 'step' must be an object."
    });
  }

  if (html !== undefined && typeof html !== "string") {
    return res.status(400).json({
      error: "Invalid request body. 'html' must be a string when provided."
    });
  }

  if (screenshot !== undefined && typeof screenshot !== "string") {
    return res.status(400).json({
      error: "Invalid request body. 'screenshot' must be a base64 string when provided."
    });
  }

  if (timestamp !== undefined && typeof timestamp !== "string") {
    return res.status(400).json({
      error: "Invalid request body. 'timestamp' must be a string when provided."
    });
  }

  if (stepIndex !== undefined && (!Number.isInteger(stepIndex) || stepIndex < 0)) {
    return res.status(400).json({
      error: "Invalid request body. 'stepIndex' must be a non-negative integer."
    });
  }

  if (executionId !== undefined && typeof executionId !== "string") {
    return res.status(400).json({
      error: "Invalid request body. 'executionId' must be a string when provided."
    });
  }

  return next();
}

