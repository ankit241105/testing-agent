import express from "express";
import generateStepsRoutes from "./routes/generateStepsRoutes.js";

const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(generateStepsRoutes);

export default app;
