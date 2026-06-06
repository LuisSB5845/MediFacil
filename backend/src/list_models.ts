import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.production') });

const geminiKey = process.env.GEMINI_API_KEY || "";

async function main() {
  if (!geminiKey) {
    console.error("No GEMINI_API_KEY found in .env.production");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
  console.log("Fetching models from Google API...");
  try {
    const response = await axios.get(url);
    const models = response.data.models;
    console.log(`\n🎉 Success! Found ${models.length} models available:`);
    
    // Agrupar y listar modelos
    const gemmaModels = models.filter((m: any) => m.name.toLowerCase().includes('gemma') || m.name.toLowerCase().includes('gemini-4'));
    const allModels = models.map((m: any) => ({
      name: m.name,
      displayName: m.displayName,
      description: m.description
    }));

    console.log("\n=== ALL MODELS AVAILABLE ===");
    allModels.forEach((m: any) => {
      console.log(`- ID: "${m.name.replace('models/', '')}" (${m.displayName})`);
    });

    if (gemmaModels.length > 0) {
      console.log("\n=== GEMMA / GEMINI 4 MODELS MATCHED ===");
      gemmaModels.forEach((m: any) => {
        console.log(`- ID: "${m.name.replace('models/', '')}" (${m.displayName})`);
      });
    } else {
      console.log("\n=== NO GEMMA OR GEMINI 4 MODELS MATCHED ===");
    }
  } catch (error: any) {
    console.error("❌ Failed to fetch models:", error.response?.data || error.message);
  }
}

main();
