import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Cargar las variables de entorno de producción que bajamos de Vercel
dotenv.config({ path: path.resolve(__dirname, '../.env.production') });

const apiKey = process.env.AI_GATEWAY_API_KEY || "";
const modelName = process.env.AI_MODEL_NAME || "zai/glm-4.6v-flash";

console.log("Testing with API Key starting with:", apiKey.substring(0, 7));
console.log("Model Name:", modelName);

const urls = [
  // 1. Direct call (no baseURL)
  { name: "Direct Call (No Base URL)", url: undefined },
  // 2. Default Vercel Gateway Google Generative AI
  { name: "Gateway: google-generative-ai", url: "https://gateway.ai.vercel.com/v1/public-api/luissb5845s-projects/medi-facil/google-generative-ai" },
  // 3. Vercel Gateway Project Slug
  { name: "Gateway: medi-facil", url: "https://gateway.ai.vercel.com/v1/public-api/luissb5845s-projects/medi-facil/medi-facil" },
  // 4. Vercel Gateway Generic
  { name: "Gateway: gemini", url: "https://gateway.ai.vercel.com/v1/public-api/luissb5845s-projects/medi-facil/gemini" }
];

async function testUrl(name: string, url: string | undefined) {
  console.log(`\n=== Testing: ${name} ===`);
  try {
    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
      baseURL: url,
    });
    
    const model = google(modelName);
    
    const result = await generateText({
      model: model,
      prompt: "Hola, responde únicamente con la palabra 'OK'.",
    });
    
    console.log(`✅ SUCCESS: ${name}`);
    console.log(`Result: "${result.text}"`);
    return true;
  } catch (error: any) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`Error: ${error.message}`);
    return false;
  }
}

async function main() {
  for (const item of urls) {
    const success = await testUrl(item.name, item.url);
    if (success) {
      console.log(`\n🎉 Found working gateway! Use this baseURL: ${item.url}`);
      break;
    }
  }
}

main();
