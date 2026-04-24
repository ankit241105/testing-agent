import { generateStepsFromDescription } from "../services/stepGeneratorService.js";

export async function generateStepsController(req, res) {
  try {
    const steps = await generateStepsFromDescription({
      description: req.body.description,
      htmlContext: req.body.htmlContext
    });
    return res.json(steps);
  } catch (error) {
    if (error.code === "MISSING_GEMINI_API_KEY") {
      return res.status(500).json({ error: error.message });
    }

    if (error.code === "INVALID_LLM_OUTPUT") {
      return res.status(502).json({
        error: "LLM returned invalid JSON output. Please try again."
      });
    }

    if (error.code === "LLM_REQUEST_FAILED") {
      return res.status(502).json({
        error: "Gemini request failed. Check API key/model and try again."
      });
    }

    return res.status(500).json({ error: "Internal server error." });
  }
}
