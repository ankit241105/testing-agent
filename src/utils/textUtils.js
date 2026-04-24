export function trimTrailingPunctuation(value) {
  if (!value) return "";
  return value.trim().replace(/[.,!?;:]+$/, "");
}

export function toLowerSafe(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}
