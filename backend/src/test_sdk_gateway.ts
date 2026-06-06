import { generateText, createGateway } from 'ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Cargar las variables de entorno de producción que bajamos de Vercel
dotenv.config({ path: path.resolve(__dirname, '../../.env.production') });

const apiKey = process.env.AI_GATEWAY_API_KEY || "";
const modelName = process.env.AI_MODEL_NAME || "zai/glm-4.6v-flash";

console.log("Testing with Vercel AI SDK gateway provider...");
console.log("Loaded API Key starting with:", apiKey ? apiKey.substring(0, 7) : "Missing");
console.log("Model Name:", modelName);

async function main() {
  try {
    const gateway = createGateway({
      apiKey: apiKey,
    });

    const model = gateway(modelName);

    console.log("Calling generateText with SDK Gateway...");
    const result = await generateText({
      model: model,
      prompt: "Hola, responde únicamente con la palabra 'OK' y nada más.",
    });

    console.log("✅ SUCCESS! Result:", result.text);
  } catch (error: any) {
    console.error("❌ FAILED!");
    console.error("Error:", error.message);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
  }
}

main();
