import { auth } from './firebase';

const API_URL = (import.meta as any).env.VITE_API_URL || "/api";

/**
 * Get the current Firebase ID Token to send to the backend.
 */
async function getAuthHeader() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { "Authorization": `Bearer ${token}` };
}

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
 * Generates a clinical document with streaming response from the BACKEND PROXY.
 */
export async function generateClinicalDocumentStream(
  prompt: string,
  context: string = "",
  onStream: StreamCallback
): Promise<ClinicalDoc | null> {
  try {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${API_URL}/ai/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader
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
 * Image analysis function redirected to Backend Proxy
 */
export async function analyzeMedicalImage(base64Image: string, prompt: string): Promise<string> {
  try {
    const authHeader = await getAuthHeader();
    const response = await fetch(`${API_URL}/ai/analyze-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader
      },
      body: JSON.stringify({ image: base64Image, prompt }),
    });

    if (!response.ok) throw new Error("Error en el análisis de imagen del servidor");
    
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Error analyzing image via proxy:", error);
    return "Error al analizar la imagen. Por favor, intente de nuevo.";
  }
}

/**
 * Proxy implementation for Chat that mimics the expected assistant interface.
 * This avoids breaking the existing UI components.
 */
export function createChat() {
  return {
    sendMessage: async (input: string) => {
      try {
        const authHeader = await getAuthHeader();
        const response = await fetch(`${API_URL}/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader
          },
          body: JSON.stringify({ prompt: input }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.details || errorData.error || "Error en el chat del servidor";
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        // Retornamos una estructura compatible con el SDK original
        return {
          response: Promise.resolve({
            text: () => data.text
          })
        };
      } catch (error: any) {
        console.error("Error in AI Chat proxy:", error);
        throw error;
      }
    }
  };
}

export const models = {
  pro: "backend-managed",
  flash: "backend-managed",
  image: "backend-managed",
};
