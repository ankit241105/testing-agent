import {
  URL_TRIGGER_REGEX,
  LOGIN_TRIGGER_REGEX,
  ASSERTION_TRIGGER_REGEX,
  ASSERTION_TEXT_REGEX,
  DEFAULT_OPEN_URL,
  DEFAULT_ASSERTION_TEXT,
  DEFAULT_TARGETS,
  DEFAULT_VALUES
} from "../constants/stepRules.js";
import { toLowerSafe, trimTrailingPunctuation } from "../utils/textUtils.js";
import { extractUrlFromDescription } from "../utils/urlUtils.js";

/**
 * @param {string} description
 * @returns {Array<Object>}
 */
export function generateStepsFromDescription(description) {
  const steps = [];
  const loweredDescription = toLowerSafe(description);

  if (URL_TRIGGER_REGEX.test(description)) {
    const url = extractUrlFromDescription(description) || DEFAULT_OPEN_URL;
    steps.push({ action: "open", url });
  }

  if (LOGIN_TRIGGER_REGEX.test(loweredDescription)) {
    steps.push({
      action: "type",
      target: DEFAULT_TARGETS.email,
      value: DEFAULT_VALUES.email
    });
    steps.push({
      action: "type",
      target: DEFAULT_TARGETS.password,
      value: DEFAULT_VALUES.password
    });
    steps.push({
      action: "click",
      target: DEFAULT_TARGETS.submit
    });
  }

  if (ASSERTION_TRIGGER_REGEX.test(loweredDescription)) {
    let containsText = DEFAULT_ASSERTION_TEXT;
    const assertionMatch = description.match(ASSERTION_TEXT_REGEX);
    if (assertionMatch && assertionMatch[1]) {
      containsText = trimTrailingPunctuation(assertionMatch[1]);
    }

    steps.push({
      action: "assertion",
      target: DEFAULT_TARGETS.assertion,
      contains: containsText
    });
  }

  return steps;
}
