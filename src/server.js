import app from "./app.js";
import { APP_CONFIG } from "./config/appConfig.js";

app.listen(APP_CONFIG.port, () => {
  console.log(`Server running on port ${APP_CONFIG.port}`);
});
