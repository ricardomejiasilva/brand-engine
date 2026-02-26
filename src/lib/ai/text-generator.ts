import { GoogleGenAI } from "@google/genai";
import { ProductData, BrandParameters } from "@/types";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

function formatFeatureDetails(product: ProductData): string {
  const entries = Object.entries(product.featureDetails);
  if (entries.length === 0) return "";
  const lines = entries.map(([heading, body]) => `- ${heading}: ${body}`);
  return `Key Features:\n${lines.join("\n")}\n`;
}

export async function generateMarketingCopy(
  product: ProductData,
  brand: BrandParameters
): Promise<string> {
  const prompt = `You are a marketing copywriter for the restaurant supply brand "${brand.brand_name}".
The brand's vibe is: ${brand.background_vibe_description}.

Write a short, punchy marketing hook (1-2 lines max) for this product:
Product: ${product.title}
Description: ${product.description}
${formatFeatureDetails(product)}
The hook should feel on-brand and be suitable for overlaying on a product marketing image.
Return ONLY the hook text, no quotes, no extra commentary.`;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: prompt,
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini returned no marketing copy.");
  }

  return text;
}

export async function generateBackgroundPrompt(
  product: ProductData,
  brand: BrandParameters
): Promise<string> {
  const prompt = `You are a creative director creating a product photography brief.

Brand: ${brand.brand_name}
Brand Vibe: ${brand.background_vibe_description}
Surface Material: ${brand.surface_material}
Product: ${product.title}
${formatFeatureDetails(product)}
Generate a detailed image generation prompt for an AI image model. The prompt should describe:
- A ${brand.surface_material} surface/background
- Atmospheric lighting and mood matching: ${brand.background_vibe_description}
- Subtle props or environment details that complement a restaurant/food service product
- The scene should have an empty area in the center where the product will be placed

Important: Do NOT mention the product itself in the prompt — only describe the background scene and surface.
Return ONLY the image generation prompt, nothing else.`;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: prompt,
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini returned no background prompt.");
  }

  return text;
}
