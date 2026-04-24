import express from "express";
import generateStepsRoutes from "./routes/generateStepsRoutes.js";

const app = express();

app.use(express.json());
app.use(generateStepsRoutes);

export default app;
