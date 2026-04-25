import { generateStepsFromDescription } from "../services/stepGeneratorService.js";
import { executeStepsWithPlaywright } from "../services/playwrightExecutor.js";

export async function generateStepsController(req, res) {
  try {
    const steps = await generateStepsFromDescription({
      description: req.body.description,
      htmlContext: req.body.htmlContext
    });

    const execution = await executeStepsWithPlaywright({ steps });
    return res.json({ steps, execution });
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

    if (error.code === "BROWSER_LAUNCH_FAILED") {
      return res.status(500).json({
        error: "Playwright browser launch failed. Ensure Chromium is installed."
      });
    }

    return res.status(500).json({ error: "Internal server error." });
  }
}
