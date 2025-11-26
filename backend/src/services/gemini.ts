import { GoogleGenAI } from "@google/genai";
import { ParsedOptions, AlgoSheetResponse } from "../types/algosheet";

// Remove top-level initialization
// const ai = new GoogleGenAI({ apiKey: API_KEY || "" });

export async function callGemini(
    prompt: string,
    responseMode: string | undefined | null,
    schemaStr: string | undefined | null,
    options: ParsedOptions
): Promise<AlgoSheetResponse> {
    const API_KEY_RAW = process.env.GEMINI_API_KEY;
    const API_KEY = API_KEY_RAW ? API_KEY_RAW.trim() : "";

    if (!API_KEY) {
        console.warn("WARNING: GEMINI_API_KEY is not set in environment variables.");
        throw new Error("GEMINI_API_KEY is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const modelId = "gemini-3-pro-preview";

    // Fix #2: Force English unless language option specified
    const systemInstruction = `You are an assistant for M&A analysts.
IMPORTANT: Always respond in ENGLISH unless explicitly specified otherwise.
Always answer using a JSON object with the following structure:
- "value": your main answer (see type requirements below)
- "confidence": optional number between 0 and 1
- "sources": optional array of {url, title, snippet} objects
${options.lang ? `The "value" must be in language: ${options.lang}.` : 'Always use English for the value.'}
Do not output anything else than the JSON object.`;

    try {
        // Fix #3: Add schema-specific instructions
        let typeInstruction = '';
        if (schemaStr) {
            if (schemaStr === 'number') {
                typeInstruction = '\nCRITICAL: The "value" must be a pure NUMBER with NO text, NO spaces, NO formatting. Example: 183323 (not "183,323" or "183 323")';
            } else if (schemaStr.startsWith('enum(')) {
                const enumValues = schemaStr.substring(5, schemaStr.length - 1);
                typeInstruction = `\nCRITICAL: The "value" must be EXACTLY one of: ${enumValues}. Use exact spelling and capitalization.`;
            } else if (schemaStr === 'text') {
                typeInstruction = '\nThe "value" should be concise text.';
            }
        }

        // Request JSON output in the prompt itself for better reliability
        const enhancedPrompt = `${prompt}${typeInstruction}

IMPORTANT: You must respond with a valid JSON object with this exact structure:
{
  "value": <your answer here>,
  "confidence": <optional number between 0 and 1>,
  "sources": [<optional array of {url, title, snippet} objects>]
}`;

        // Build request options
        const request: any = {
            model: modelId,
            systemInstruction,
            contents: [
                {
                    role: "user",
                    parts: [{ text: enhancedPrompt }]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        // Add tools if web search is enabled
        if (options.web) {
            request.tools = [{ googleSearch: {} }];
        }

        const response = await ai.models.generateContent(request);

        const text = response.text || "";

        // Strip markdown fences if present to improve JSON parsing
        let cleanedText = text.trim();
        if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
            cleanedText = cleanedText.replace(/```$/, "").trim();
        }

        // Parse the JSON response
        try {
            const json = JSON.parse(cleanedText);

            // Fix #1: Post-process value based on schema
            let finalValue = json.value ?? text;

            // Convert string numbers to actual numbers
            if (schemaStr === 'number' && typeof finalValue === 'string') {
                // Remove spaces, commas, and try to parse as number
                const cleanedValue = finalValue.replace(/[\s,]/g, '');
                const numValue = parseFloat(cleanedValue);
                if (!isNaN(numValue)) {
                    finalValue = numValue;
                    console.log(`✓ Converted string "${json.value}" to number ${finalValue}`);
                } else {
                    console.warn(`⚠ Failed to convert "${finalValue}" to number`);
                }
            }

            // Normalize enum values (trim, remove trailing punctuation)
            if (schemaStr?.startsWith('enum(') && typeof finalValue === 'string') {
                const originalValue = finalValue;
                finalValue = finalValue.trim().replace(/\.$/, '');
                if (originalValue !== finalValue) {
                    console.log(`✓ Normalized enum "${originalValue}" to "${finalValue}"`);
                }
            }

            // Ensure structure
            return {
                value: finalValue,
                confidence: json.confidence ?? null,
                sources: json.sources ?? []
            };
        } catch (parseError) {
            // If JSON parsing fails, wrap the response
            console.warn("⚠ Failed to parse JSON, wrapping raw response");
            return {
                value: text || "No response",
                confidence: null,
                sources: []
            };
        }

    } catch (error: any) {
        console.error("❌ Error calling Gemini:");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        if (error.response) {
            console.error("Error response:", error.response);
        }
        throw new Error("Failed to generate content from Gemini: " + error.message);
    }
}
