export const URL_TRIGGER_REGEX = /\b(go to|open|visit|navigate to)\b/i;
export const LOGIN_TRIGGER_REGEX = /\blog(?:\s*|-)?in\b|\bsign\s*in\b/i;
export const ASSERTION_TRIGGER_REGEX = /\b(verify|check)\b/i;

export const URL_PHRASE_REGEX = /\b(?:go to|open|visit|navigate to)\s+([^\s,]+)/i;
export const DIRECT_URL_REGEX =
  /\b(https?:\/\/[^\s,]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s,]*)?)\b/i;
export const ASSERTION_TEXT_REGEX = /\b(?:verify|check)\s+(?:that\s+)?(.+)/i;

export const DEFAULT_OPEN_URL = "https://example.com";
export const DEFAULT_ASSERTION_TEXT = "success";

export const DEFAULT_TARGETS = {
  email: "input[name='email']",
  password: "input[name='password']",
  submit: "button[type='submit']",
  assertion: "body"
};

export const DEFAULT_VALUES = {
  email: "test@example.com",
  password: "password123"
};
