import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Cargar las variables de entorno de producción que bajamos de Vercel
dotenv.config({ path: path.resolve(__dirname, '../../.env.production') });

const geminiKey = process.env.GEMINI_API_KEY || "";
console.log("Testing direct call to Google Gemini...");
console.log("Loaded GEMINI_API_KEY starting with:", geminiKey ? geminiKey.substring(0, 7) : "Missing");

async function testModel(modelName: string) {
  console.log(`\n--- Testing model: ${modelName} ---`);
  try {
    const google = createGoogleGenerativeAI({
      apiKey: geminiKey,
    });

    const model = google(modelName);

    console.log(`Calling generateText with direct Google API...`);
    const result = await generateText({
      model: model,
      prompt: "Hola, responde únicamente con la palabra 'OK' y nada más.",
    });

    console.log(`✅ SUCCESS! Result: "${result.text}"`);
    return true;
  } catch (error: any) {
    console.error(`❌ FAILED for model ${modelName}:`);
    console.error("Error:", error.message);
    return false;
  }
}

async function main() {
  const models = ["gemma-4-26b-a4b-it", "gemma-4-31b-it", "gemini-2.5-flash"];
  for (const m of models) {
    const success = await testModel(m);
    if (success) {
      console.log(`\n🎉 Found working model: ${m}!`);
      break;
    }
  }
}

main();
