import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const models = {
  pro: "gemini-3.1-pro-preview",
  flash: "gemini-3-flash-preview",
  lite: "gemini-3.1-flash-lite-preview",
  image: "gemini-3.1-pro-preview", // For image analysis as per instructions
};

export async function generateClinicalDocument(prompt: string, context: string = "") {
  const response = await ai.models.generateContent({
    model: models.pro,
    contents: `Analyze the following medical context and generate a structured clinical document.
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
    }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          patientName: { type: Type.STRING },
          date: { type: Type.STRING },
          findings: { type: Type.STRING },
          diagnosis: { type: Type.STRING },
          plan: { type: Type.STRING },
          vitals: {
            type: Type.OBJECT,
            properties: {
              bloodPressure: { type: Type.STRING },
              heartRate: { type: Type.NUMBER }
            }
          }
        }
      }
    }
  });
  return JSON.parse(response.text);
}

export async function analyzeMedicalImage(base64Image: string, prompt: string) {
  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  };
  const textPart = {
    text: `You are a medical AI assistant. Analyze this medical image and answer the following question: ${prompt}`,
  };
  const response = await ai.models.generateContent({
    model: models.image,
    contents: { parts: [imagePart, textPart] },
  });
  return response.text;
}

export function createChat() {
  return ai.chats.create({
    model: models.flash,
    config: {
      systemInstruction: "You are MediFácil AI, a clinical assistant for doctors. You help with patient verification, medical recommendations based on evidence, and automated document management. Be professional, precise, and supportive.",
    },
  });
}
