import express from "express";
import { validateGenerateStepsRequest } from "../middlewares/validateGenerateStepsRequest.js";
import { generateStepsController } from "../controllers/generateStepsController.js";

const router = express.Router();

router.post("/generate-steps", validateGenerateStepsRequest, generateStepsController);

export default router;
