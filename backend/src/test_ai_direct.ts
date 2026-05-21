import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log("Loaded API Key:", process.env.AI_GATEWAY_API_KEY ? "Present (starts with " + process.env.AI_GATEWAY_API_KEY.substring(0, 7) + ")" : "Missing");
console.log("Model Name:", process.env.AI_MODEL_NAME || "gemma-4-26b-a4b-it");

const google = createGoogleGenerativeAI({
  apiKey: process.env.AI_GATEWAY_API_KEY || process.env.GEMINI_API_KEY || "",
});

const model = google(process.env.AI_MODEL_NAME || "gemma-4-26b-a4b-it");

async function main() {
  try {
    console.log("Calling generateText...");
    const result = await generateText({
      model: model,
      prompt: "Hola, responde con una palabra.",
    });
    console.log("SUCCESS! Result:", result.text);
  } catch (error: any) {
    console.error("FAILURE! Error details:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
  }
}

main();
