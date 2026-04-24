import express from "express";
import { validateGenerateStepsRequest } from "../middlewares/validateGenerateStepsRequest.js";
import { generateStepsFromDescription } from "../services/stepGeneratorService.js";

const router = express.Router();

router.post("/generate-steps", validateGenerateStepsRequest, (req, res) => {
  const steps = generateStepsFromDescription(req.body.description);
  return res.json(steps);
});

export default router;
