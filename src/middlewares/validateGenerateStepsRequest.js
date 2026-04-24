export function validateGenerateStepsRequest(req, res, next) {
  const { description } = req.body || {};

  if (typeof description !== "string" || !description.trim()) {
    return res.status(400).json({
      error: "Invalid request body. 'description' must be a non-empty string."
    });
  }

  return next();
}
