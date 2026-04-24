import {
  URL_PHRASE_REGEX,
  DIRECT_URL_REGEX
} from "../constants/stepRules.js";
import { trimTrailingPunctuation } from "./textUtils.js";

export function normalizeUrl(raw) {
  if (!raw) return null;

  const cleaned = trimTrailingPunctuation(raw);
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(cleaned)) {
    return `https://${cleaned}`;
  }

  return null;
}

export function extractUrlFromDescription(description) {
  const phraseMatch = description.match(URL_PHRASE_REGEX);
  if (phraseMatch) {
    return normalizeUrl(phraseMatch[1]);
  }

  const directUrlMatch = description.match(DIRECT_URL_REGEX);
  if (directUrlMatch) {
    return normalizeUrl(directUrlMatch[1]);
  }

  return null;
}
