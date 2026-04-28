export const APP_CONFIG = {
  port: process.env.PORT || 3000,
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  groqBaseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  maxAgentSteps: Number(process.env.MAX_AGENT_STEPS || 12),
  observeWaitMs: Number(process.env.OBSERVE_WAIT_MS || 5000),
  screenshotsDir: process.env.SCREENSHOTS_DIR || "screenshots",
  extensionDir: process.env.EXTENSION_DIR || "extension",
  chromeUserDataDir: process.env.CHROME_USER_DATA_DIR || ".chromium-user-data"
};
