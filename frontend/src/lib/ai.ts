const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:4000/api";

/**
 * Stream callback type - called for each chunk of text received
 */
export type StreamCallback = (text: string) => void;

/**
 * Generates a clinical document with streaming response.
 * The text is delivered word by word in real-time.
 */
export async function generateClinicalDocumentStream(
  prompt: string,
  context: string = "",
  onStream: StreamCallback
): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/ai/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/plain; charset=utf-8",
      },
      body: JSON.stringify({ prompt, context }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
      throw new Error(errorData.error || "Error llamando a la API del backend");
    }

    // Read the stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No se pudo leer el stream de respuesta");
    }

    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      onStream(fullText);
    }

    return fullText;
  } catch (error) {
    console.error("Error in generateClinicalDocumentStream:", error);
    throw error;
  }
}

/**
 * Non-streaming version for backwards compatibility
 */
export async function generateClinicalDocument(prompt: string, context: string = ""): Promise<string> {
  let result = "";
  await generateClinicalDocumentStream(prompt, context, (text) => {
    result = text;
  });
  return result;
}

export const models = {
  pro: "gemini-1.5-flash",
  flash: "gemini-1.5-flash",
  image: "gemini-1.5-flash",
};