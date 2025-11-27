/**
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/**
 * Calls the AlgoSheet backend.
 * @customfunction
 * @param prompt The prompt for the AI.
 * @param responseMode The response mode ("free" or "structured").
 * @param schema The schema for structured response.
 * @param options Additional options (key=value;...).
 * @returns The JSON response from the backend.
 */
export async function ALGOSHEET(
  prompt: string,
  responseMode: string = "free",
  schema: string = "",
  options: string = ""
): Promise<string> {
  // Backend URL injected by Webpack
  // @ts-ignore
  const backendUrl = process.env.BACKEND_URL || "https://api.auraia.ch/algosheet";

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        responseMode,
        schema,
        options,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `ALGOSHEET_ERROR: ${response.status} ${response.statusText} - ${errorText}`;
    }

    const json = await response.json();
    console.log("ALGOSHEET response:", json);
    return JSON.stringify(json);
  } catch (error: any) {
    console.error("ALGOSHEET error:", error);
    return `ALGOSHEET_ERROR: ${error.message}`;
  }
}

/**
* Parses the JSON result from ALGOSHEET.
* @customfunction
* @param jsonText The JSON text returned by ALGOSHEET.
* @param field The field to extract ("value", "reasoning", "confidence", "sources_urls", "sources_titles", "sources_snippets", "raw").
* @returns The extracted value.
*/
export function ALGOSHEET_PARSE(jsonText: string, field: string): any {
  try {
    if (!jsonText || jsonText.startsWith("ALGOSHEET_ERROR")) {
      return jsonText; // Propagate error
    }

    const obj = JSON.parse(jsonText);

    // Handle dot notation for nested fields (e.g., "value.employees")
    if (field.includes('.')) {
      const parts = field.split('.');
      let result = obj;
      for (const part of parts) {
        result = result?.[part];
        if (result === undefined) return "#FIELD_NOT_FOUND";
      }
      return result;
    }

    switch (field) {
      case "value":
        return obj.value ?? "#FIELD_NOT_FOUND";
      case "confidence":
        return obj.confidence ?? "#FIELD_NOT_FOUND";
      case "reasoning":
        return obj.reasoning ?? "#FIELD_NOT_FOUND";
      case "sources_urls":
        if (!Array.isArray(obj.sources)) return "";
        return obj.sources.map((s: any) => s.url).join("; ");
      case "sources_titles":
        if (!Array.isArray(obj.sources)) return "";
        return obj.sources.map((s: any) => s.title ?? "").join("; ");
      case "sources_snippets":
        if (!Array.isArray(obj.sources)) return "";
        return obj.sources.map((s: any) => s.snippet ?? "").join(" | ");
      case "raw":
        return jsonText;
      default:
        return "#FIELD_NOT_FOUND";
    }
  } catch (e) {
    console.error("ALGOSHEET_PARSE error:", e);
    return "#PARSE_ERROR";
  }
}
