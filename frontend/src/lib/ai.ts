import { GoogleGenerativeAI } from "@google/generative-ai";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:4000/api";
const GEMINI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface ClinicalDoc {
  patientName: string;
  findings: string;
  diagnosis: string;
  plan: string;
  vitals: {
    bloodPressure: string;
    heartRate: string;
  }
}

/**
 * Stream callback type - called for each chunk of data received
 */
export type StreamCallback = (data: Partial<ClinicalDoc>) => void;

/**
 * Generates a clinical document with streaming response.
 * The text is delivered word by word in real-time.
 */
export async function generateClinicalDocumentStream(
  prompt: string,
  context: string = "",
  onStream: StreamCallback
): Promise<ClinicalDoc | null> {
  try {
    const response = await fetch(`${API_URL}/ai/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, context }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(errorData.error || "Error llamando a la API del backend");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No se pudo leer el stream de respuesta");
    }

    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let lastObject = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split("\n");
      // Keep the last partial line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            lastObject = data;
            onStream(data);
          } catch (e) {
            console.error("Error parsing stream line:", line, e);
          }
        }
      }
    }

    return lastObject;
  } catch (error) {
    console.error("Error in generateClinicalDocumentStream:", error);
    throw error;
  }
}

/**
 * Non-streaming version for backwards compatibility
 */
export async function generateClinicalDocument(prompt: string, context: string = ""): Promise<string> {
  const result = await generateClinicalDocumentStream(prompt, context, () => {});
  return JSON.stringify(result, null, 2);
}

/**
 * Image analysis function
 */
export async function analyzeMedicalImage(base64Image: string, prompt: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: models.image });
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg"
        }
      }
    ]);
    return result.response.text();
  } catch (error) {
    console.error("Error analyzing image:", error);
    return "Error al analizar la imagen. Por favor, intente de nuevo.";
  }
}

/**
 * Chat initialization for interactive AI
 */
export function createChat() {
  const model = genAI.getGenerativeModel({ 
    model: models.pro,
    systemInstruction: "Eres un Asistente Clínico Inteligente para MediFácil. Ayudas a doctores a analizar casos, resumir historias clínicas y verificar datos de pacientes. Sé profesional, preciso y utiliza terminología médica adecuada. Siempre aclara que tus sugerencias deben ser validadas por el profesional médico."
  });
  
  return model.startChat({
    history: [],
  });
}

export const models = {
  pro: "gemini-1.5-flash",
  flash: "gemini-1.5-flash",
  image: "gemini-1.5-flash",
};