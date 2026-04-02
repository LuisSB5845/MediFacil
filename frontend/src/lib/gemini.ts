const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:4000/api";

export const models = {
  pro: "gemini-2.0-flash",
  flash: "gemini-2.0-flash",
  image: "gemini-2.0-flash", 
};


/**
 * Generates a structured clinical document based on a prompt and context.
 */
export async function generateClinicalDocument(prompt: string, context: string = "") {
  try {
    const response = await fetch(`${API_URL}/ai/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, context }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error llamando a la API del backend");
    }

    return await response.json();
  } catch (error) {
    console.error("Error in generateClinicalDocument:", error);
    throw error;
  }
}


/**
 * Analyzes a medical image (Not yet implemented in backend proxy for simplicity, but route exists)
 */
export async function analyzeMedicalImage(base64Image: string, prompt: string) {
  // Redirigir a una implementación segura en el backend similar a generateClinicalDocument
  console.warn("Análisis de imágenes debe ser migrado al backend para mayor seguridad.");
  return "Funcionalidad en migración al backend seguro.";
}

/**
 * Creates an interactive chat session (Should also be proxied)
 */
export function createChat() {
  console.warn("Chat interactivo debe ser migrado a WebSockets o API segura en el backend.");
  return null; // El frontend deberá ser actualizado para manejar chat via API
}

