export function validateGenerateStepsRequest(req, res, next) {
  const { description, htmlContext } = req.body || {};

  if (typeof description !== "string" || !description.trim()) {
    return res.status(400).json({
      error: "Invalid request body. 'description' must be a non-empty string."
    });
  }

  if (htmlContext !== undefined && typeof htmlContext !== "string") {
    return res.status(400).json({
      error: "Invalid request body. 'htmlContext' must be a string when provided."
    });
  }

  return next();
}
