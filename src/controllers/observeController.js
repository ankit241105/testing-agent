import { recordObservation } from "../services/observerHandler.js";

export function observeController(req, res) {
  try {
    const observation = recordObservation(req.body);
    console.log(
      `[Observe] Received step ${observation.stepIndex + 1} for execution ${observation.executionId}`
    );
    return res.json({ ok: true, observation });
  } catch (error) {
    if (error.code === "UNKNOWN_EXECUTION") {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Failed to store observation." });
  }
}

