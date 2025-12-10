/**
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

import { queueManager } from '../utils/queueManager';

/**
 * Calls the AlgoSheet backend.
 * @customfunction
 * @param prompt The prompt for the AI.
 * @param responseMode The response mode ("free" or "structured").
 * @param schema The schema for structured response.
 * @param options Additional options (key=value;...).
 * @param invocation Invocation context
 * @requiresAddress
 * @returns The JSON response from the backend.
 */
export async function ALGOSHEET(
  prompt: string,
  responseMode: string = "free",
  schema: string = "",
  options: string = "",
  invocation: CustomFunctions.Invocation
): Promise<string> {
  // Try to log to debug panel if available
  const debugLog = (window as any).debugLog;
  const addRequestHistory = (window as any).addRequestHistory;

  try {
    // Get cell address (with fallback if @requiresAddress doesn't work)
    const cellAddress = invocation.address ||
                       (invocation as any).parameterAddresses?.[0]?.[0] ||
                       `Cell-${Date.now()}`;

    if (debugLog) {
      debugLog(`ALGOSHEET at ${cellAddress}: "${prompt.substring(0, 40)}${prompt.length > 40 ? '...' : ''}"`, 'info');
    }

    // Enqueue request through queue manager
    const result = await queueManager.enqueue({
      cellAddress,
      prompt,
      responseMode,
      schema,
      options
    });

    console.log("ALGOSHEET response (full):", JSON.stringify(result, null, 2));

    // Add to request history
    if (addRequestHistory) {
      addRequestHistory({
        timestamp: new Date(),
        prompt: prompt,
        duration: result._duration || 0,
        cached: result._cached || false,
        success: true,
        response: result
      });
    }

    if (debugLog) {
      debugLog(`Request completed in ${result._duration || 0}ms ${result._cached ? '(cached)' : ''}`, 'success');
    }

    return JSON.stringify(result);

  } catch (error: any) {
    console.error("ALGOSHEET error:", error);

    if (debugLog) debugLog(`Request error: ${error.message}`, 'error');

    if (addRequestHistory) {
      addRequestHistory({
        timestamp: new Date(),
        prompt: prompt,
        duration: 0,
        cached: false,
        success: false,
        error: error.message
      });
    }

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

// ===== EXPOSE QUEUE MANAGER CONTROLS TO TASK PANE =====
// This allows the task pane (via SharedRuntime) to control the queue manager

if (typeof window !== 'undefined') {
  (window as any).setQueueManagerConcurrency = (value: number) => {
    queueManager.setMaxConcurrency(value);
  };

  (window as any).retryFailedRequests = () => {
    queueManager.retryFailed();
  };

  (window as any).clearCompletedRequests = () => {
    queueManager.clearCompleted();
  };

  console.log('[Functions] Queue manager controls exposed to window');
}
