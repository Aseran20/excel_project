import type { AlgoSheetResponse, ParsedOptions } from "@algosheet/shared";
import { GoogleGenAI } from "@google/genai";
import PQueue from "p-queue";
import env from "../config/env.js";
import { PostgresCache } from "./postgresCache.js";

// Lazy-initialized PostgreSQL cache with 30 day TTL (default)
let responseCache: PostgresCache<AlgoSheetResponse> | null = null;

async function getCache(): Promise<PostgresCache<AlgoSheetResponse>> {
  if (!responseCache) {
    responseCache = new PostgresCache<AlgoSheetResponse>();
    await responseCache.initialize();
  }
  return responseCache;
}

// Initialize rate limiter: max 50 requests per minute, 5 concurrent
const geminiQueue = new PQueue({
  concurrency: 5,
  interval: 60000, // 1 minute
  intervalCap: 50, // 50 requests max per interval
});

export async function callGemini(
  prompt: string,
  responseMode: string | undefined | null,
  schemaStr: string | undefined | null,
  options: ParsedOptions
): Promise<AlgoSheetResponse> {
  const API_KEY = env.GEMINI_API_KEY.trim();
  console.log("DEBUG: Using API Key ending in:", API_KEY.slice(-4));

  // Generate cache key based on request parameters
  const cacheKey = JSON.stringify({
    prompt,
    responseMode,
    schemaStr,
    web: options.web,
    lang: options.lang,
  });

  // Check cache first
  const cache = await getCache();
  const cachedResponse = await cache.get(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const modelId = "gemini-2.5-flash";

  // Build the JSON schema for the response
  const responseSchema = buildResponseSchema(schemaStr);

  // Build system instruction
  const systemInstruction = `You are an assistant for M&A analysts.
IMPORTANT: Always respond in ENGLISH unless explicitly specified otherwise.
${options.lang ? `Respond in language: ${options.lang}.` : ""}
Be concise and accurate.`;

  try {
    // Build enhanced prompt with type-specific instructions
    let typeInstruction = "";
    if (schemaStr === "number") {
      typeInstruction = "\nProvide the answer as a pure number with no formatting.";
    } else if (schemaStr?.startsWith("enum(")) {
      const enumValues = schemaStr.substring(5, schemaStr.length - 1);
      typeInstruction = `\nProvide exactly one of: ${enumValues}.`;
    } else if (schemaStr?.startsWith("multi(")) {
      const fields = schemaStr
        .substring(6, schemaStr.length - 1)
        .split(",")
        .map((v) => v.trim());
      typeInstruction = `\nProvide enrichment data for the following fields: ${fields.join(", ")}. Research each field thoroughly.`;
    }

    // Force web search usage in prompt if enabled
    let webInstruction = "";
    if (options.web) {
      webInstruction =
        "IMPORTANT: You MUST use Google Search to answer this question with up-to-date information. Do not rely on your internal knowledge cutoff.\n\n";
    }

    const enhancedPrompt = `${webInstruction}${prompt}${typeInstruction}`;

    // Build config based on web search usage
    // gemini-2.5-flash limitation: cannot use tools + responseMimeType together
    const config: any = options.web
      ? {
          // Web search mode: no responseMimeType, but enforce JSON via prompt
          systemInstruction:
            systemInstruction +
            "\n\n=== CRITICAL OUTPUT FORMAT REQUIREMENT ===\n" +
            "You MUST respond with ONLY a raw JSON object. NO prose, NO explanation, NO markdown.\n" +
            "Start your response with { and end with }. Nothing before or after.\n" +
            'Example of CORRECT response: {"value":"data","reasoning":"why","confidence":0.9}\n' +
            'Example of WRONG response: Here is the information: {"value":...}\n\n' +
            "Required JSON schema:\n" +
            JSON.stringify(responseSchema, null, 2) +
            "\n\nOutput only the JSON object now:",
          tools: [{ googleSearch: {} }],
        }
      : {
          // No web search: strict JSON mode with schema enforcement
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        };

    // Build request using correct SDK syntax - wrapped in rate limiter
    const response = await geminiQueue.add(async () => {
      console.log(`📊 Queue size: ${geminiQueue.size}, Pending: ${geminiQueue.pending}`);
      console.log(`🔧 Mode: ${options.web ? "Web Search (JSON soft)" : "JSON strict"}`);
      return await ai.models.generateContent({
        model: modelId,
        contents: enhancedPrompt,
        config,
      });
    });

    const text = response.text || "";
    console.log("📝 Raw response:", text.substring(0, 200));

    // Parse the JSON response (defensive parsing for web search mode)
    let json: any;
    try {
      let cleanedText = text.trim();

      // Remove markdown code blocks
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
        cleanedText = cleanedText.replace(/```$/, "").trim();
      }

      // In web search mode, the model might add prose around JSON
      // Try to extract JSON object/array if needed
      if (options.web && !cleanedText.startsWith("{") && !cleanedText.startsWith("[")) {
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          cleanedText = jsonMatch[0];
          console.log("🔍 Extracted JSON from prose response");
        }
      }

      json = JSON.parse(cleanedText);
      console.log("📋 Parsed JSON structure:", JSON.stringify(json, null, 2));
    } catch (parseError) {
      console.warn("⚠ Failed to parse JSON, wrapping raw response");
      console.warn("Parse error:", parseError);
      // Fallback: return raw text as value with default structure
      return {
        value: text || "No response",
        reasoning: options.web ? "Response could not be parsed as JSON (web search mode)" : "Invalid JSON response",
        confidence: null,
        sources: [],
      };
    }

    // Extract value from JSON (handle both object with 'value' property or direct value)
    let finalValue: any;
    if (typeof json === "object" && json !== null && "value" in json) {
      finalValue = json.value;
    } else {
      finalValue = json;
    }

    // Convert string numbers to actual numbers if needed
    if (schemaStr === "number" && typeof finalValue === "string") {
      const cleanedValue = finalValue.replace(/[\s,]/g, "");
      const numValue = Number.parseFloat(cleanedValue);
      if (!isNaN(numValue)) {
        finalValue = numValue;
        console.log(`✓ Converted string to number: ${numValue}`);
      }
    }

    // Normalize enum values
    if (schemaStr?.startsWith("enum(") && typeof finalValue === "string") {
      finalValue = finalValue.trim().replace(/\.$/, "");
    }

    // Extract REAL sources from groundingMetadata if available
    const sources = extractRealSources(response);
    console.log(`📚 Extracted ${sources.length} real sources from groundingMetadata`);

    const result: AlgoSheetResponse = {
      value: finalValue,
      reasoning: typeof json === "object" && json !== null ? (json.reasoning ?? null) : null,
      confidence: typeof json === "object" && json !== null ? (json.confidence ?? null) : null,
      sources: sources,
    };

    // Store in cache before returning
    await cache.set(cacheKey, result);

    return result;
  } catch (error: any) {
    console.error("❌ Error calling Gemini:");
    console.error("Error message:", error.message);

    // Return user-friendly error messages
    if (error.message?.includes("429") || error.code === 429) {
      return {
        value: "RATE_LIMITED: Too many requests, please wait",
        reasoning: "API rate limit exceeded. Requests are queued automatically.",
        confidence: null,
        sources: [],
      };
    }

    if (error.message?.includes("timeout") || error.message?.includes("ETIMEDOUT")) {
      return {
        value: "TIMEOUT: Query took too long",
        reasoning: "Try simplifying your query or reducing the number of fields.",
        confidence: null,
        sources: [],
      };
    }

    if (error.message?.includes("ECONNREFUSED")) {
      return {
        value: "CONNECTION_ERROR: Cannot reach API",
        reasoning: "Backend server may be down or network issue.",
        confidence: null,
        sources: [],
      };
    }

    if (error.response) {
      console.error("Error response:", error.response);
    }

    // Generic error
    throw new Error("Failed to generate content from Gemini: " + error.message);
  }
}

/**
 * Build the JSON schema for the response
 */
function buildResponseSchema(schemaStr: string | undefined | null): any {
  const baseSchema: any = {
    type: "object",
    properties: {
      value: { description: "The main answer to the user's question" },
      reasoning: {
        type: "string",
        description: "A brief explanation of how the answer was derived or found.",
      },
      confidence: {
        type: "number",
        description: "Confidence level between 0 and 1",
        minimum: 0,
        maximum: 1,
      },
    },
    required: ["value", "reasoning"],
  };

  // Customize the VALUE property type
  if (schemaStr === "number") {
    baseSchema.properties.value.type = "number";
    baseSchema.properties.value.description = "The numeric answer";
  } else if (schemaStr === "text") {
    baseSchema.properties.value.type = "string";
    baseSchema.properties.value.description = "The text answer";
  } else if (schemaStr?.startsWith("enum(")) {
    const enumValues = schemaStr
      .substring(5, schemaStr.length - 1)
      .split(",")
      .map((v) => v.trim());
    baseSchema.properties.value.type = "string";
    baseSchema.properties.value.enum = enumValues;
    baseSchema.properties.value.description = `One of: ${enumValues.join(", ")}`;
  } else if (schemaStr?.startsWith("multi(")) {
    // Dynamic multi-field enrichment
    const fields = schemaStr
      .substring(6, schemaStr.length - 1)
      .split(",")
      .map((v) => v.trim());
    baseSchema.properties.value.type = "object";
    baseSchema.properties.value.description = "Enrichment data with multiple fields";
    baseSchema.properties.value.properties = {};
    baseSchema.properties.value.required = fields;

    // Create a property for each field (string type only for API compatibility)
    fields.forEach((field) => {
      baseSchema.properties.value.properties[field] = {
        type: "string",
        description: `The ${field} information`,
      };
    });
  } else {
    // Default: allow any type for free mode but enforce object structure
    baseSchema.properties.value.type = "string";
    baseSchema.properties.value.description = "The answer in any appropriate format";
  }

  return baseSchema;
}

/**
 * Extract real sources from groundingMetadata
 */
function extractRealSources(response: any): Array<{ url: string; title: string; snippet: string }> {
  const sources: Array<{ url: string; title: string; snippet: string }> = [];

  try {
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    if (!groundingMetadata) {
      console.log("ℹ No groundingMetadata found (web search not used or no sources)");
      return sources;
    }

    const chunks = groundingMetadata.groundingChunks || [];
    const supports = groundingMetadata.groundingSupports || [];

    console.log(`🔍 Found ${chunks.length} grounding chunks and ${supports.length} supports`);

    const seenUrls = new Set<string>();

    for (const chunk of chunks) {
      if (chunk.web) {
        const url = chunk.web.uri;
        const title = chunk.web.title || "";

        if (!seenUrls.has(url)) {
          seenUrls.add(url);

          let snippet = "";
          for (const support of supports) {
            if (support.groundingChunkIndices?.includes(chunks.indexOf(chunk))) {
              snippet = support.segment?.text || "";
              break;
            }
          }

          sources.push({ url, title, snippet });
        }
      }
    }
  } catch (error) {
    console.error("⚠ Error extracting sources from groundingMetadata:", error);
  }

  return sources;
}
