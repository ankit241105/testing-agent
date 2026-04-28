import express from "express";
import { validateGenerateStepsRequest } from "../middlewares/validateGenerateStepsRequest.js";
import { validateObserveRequest } from "../middlewares/validateObserveRequest.js";
import { generateStepsController } from "../controllers/generateStepsController.js";
import { observeController } from "../controllers/observeController.js";

const router = express.Router();

router.post("/generate-steps", validateGenerateStepsRequest, generateStepsController);
router.post("/observe", validateObserveRequest, observeController);

export default router;
