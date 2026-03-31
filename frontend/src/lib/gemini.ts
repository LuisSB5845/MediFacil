import { GoogleGenerativeAI } from "@google/generative-ai";

// Use import.meta.env for Vite projects
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export const models = {
  pro: "gemini-1.5-flash-latest",
  flash: "gemini-1.5-flash-latest",
  image: "gemini-1.5-flash-latest", 
};

/**
 * Generates a structured clinical document based on a prompt and context.
 */
export async function generateClinicalDocument(prompt: string, context: string = "") {
  const model = genAI.getGenerativeModel({ 
    model: models.pro,
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const fullPrompt = `Analyze the following medical context and generate a structured clinical document.
    Context: ${context}
    Prompt: ${prompt}
    
    Return the response in JSON format with the following structure:
    {
      "patientName": "string",
      "date": "string",
      "findings": "string",
      "diagnosis": "string",
      "plan": "string",
      "vitals": {
        "bloodPressure": "string",
        "heartRate": "number"
      }
    }`;

  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  return JSON.parse(response.text());
}

/**
 * Analyzes a medical image and answers a prompt.
 */
export async function analyzeMedicalImage(base64Image: string, prompt: string) {
  const model = genAI.getGenerativeModel({ model: models.image });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image,
      },
    },
    { text: `You are a medical AI assistant. Analyze this medical image and answer the following question: ${prompt}` },
  ]);

  const response = await result.response;
  return response.text();
}

/**
 * Creates an interactive chat session.
 */
export function createChat() {
  const model = genAI.getGenerativeModel({ 
    model: models.flash,
    systemInstruction: "You are MediFácil AI, a clinical assistant for doctors. You help with patient verification, medical recommendations based on evidence, and automated document management. Be professional, precise, and supportive.",
  });

  return model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 2000,
    },
  });
}
