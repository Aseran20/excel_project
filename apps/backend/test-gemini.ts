import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
console.log("API Key:", apiKey ? `Set (length: ${apiKey.length})` : "NOT SET");

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

async function test() {
  try {
    console.log("Starting test...");
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: "Say 'Hello World'",
    });
    console.log("Response:", response.text);
  } catch (error: any) {
    console.error("Error:", error.name);
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
  }
}

test();
