import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

export async function generateBackground(prompt: string): Promise<Buffer> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Nano Banana returned no candidates.");
  }

  const parts = candidates[0].content?.parts;
  if (!parts) {
    throw new Error("Nano Banana returned no content parts.");
  }

  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }

  throw new Error("Nano Banana returned no image data.");
}
