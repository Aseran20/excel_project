/**
 * Shared utility for parsing AlgoSheet options string
 * Moved from backend/src/utils/optionsParser.ts
 */

import type { ParsedOptions } from "../types/algosheet.js";

export function parseOptions(optionsStr: string | null | undefined): ParsedOptions {
  const defaults: ParsedOptions = {
    web: false,
    sources: false,
    lang: "en",
  };

  if (!optionsStr) {
    return defaults;
  }

  const result = { ...defaults };
  const pairs = optionsStr.split(";");

  for (const pair of pairs) {
    const [key, value] = pair.split("=").map((s) => s.trim());
    if (!key || !value) continue;

    const lowerKey = key.toLowerCase();
    const lowerValue = value.toLowerCase();

    switch (lowerKey) {
      case "web":
        result.web = lowerValue === "true" || lowerValue === "1";
        break;
      case "sources":
        result.sources = lowerValue === "true" || lowerValue === "1";
        break;
      case "lang":
        result.lang = lowerValue;
        break;
    }
  }

  return result;
}
