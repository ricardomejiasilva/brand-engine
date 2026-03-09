import { GoogleGenAI } from "@google/genai";
import { BrandParameters, ProductData } from "@/types";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

function buildPrompt(brand: BrandParameters, product: ProductData, customPrompt?: string): string {
  // Pull only the flags that are true for the feature icons
  const activeFlags = Object.entries(product.featureDetails ?? {})
    .slice(0, 3)
    .map(([k]) => k);

  const capacity = product.specs?.["Capacity"] ?? product.specs?.["capacity"] ?? "";

  return `You are a professional marketing designer. Examine the reference images attached before this message — they define this brand's complete design system. Replicate the exact same visual language: colors, typography, icon style, spacing, and layout structure. Then create ONE new variation using the product image provided.

PRODUCT:
- Name: ${product.title}
${capacity ? `- Capacity: ${capacity}` : ""}
${activeFlags.length ? `- Key features: ${activeFlags.join(", ")}` : ""}

BRAND:
- Name: ${brand.brand_name}
- Primary color: ${brand.primary_color} (the bold color block)
- Secondary color: ${brand.secondary_color} (the light/white area)
- The brand logo appears in the reference images — reproduce it exactly as shown

STRICT LAYOUT RULES — follow these without exception:
1. All background shapes must use ONLY straight horizontal or vertical edges — absolutely NO diagonal lines, angled banners, slanted shapes, or rotated elements of any kind
2. Text content must be LIMITED to: the brand logo + ONE short tagline (4–6 words max) + icon labels only. Do NOT include the product name, price, specs, dimensions, quantities, URLs, or any other text
3. The product photo must be placed cleanly on a solid or split background — no texture overlays, no collage-style cropping
4. Icon line-art style must match the references exactly — thin strokes, simple outlines, no fills
5. The product is the hero — it should occupy at least half the canvas
6. Get creative with LAYOUT ONLY: vary which side the color block is on, where the logo sits, or how many icons appear — but keep all rules above intact${customPrompt ? `\n\nADDITIONAL DIRECTION: ${customPrompt}` : ""}

The last image is the product to feature. Generate the asset now.`;
}

async function loadImageAsBase64(urlOrPath: string): Promise<{ data: string; mimeType: string }> {
  let buffer: Buffer;

  if (urlOrPath.startsWith("/")) {
    const fs = await import("fs/promises");
    const path = await import("path");
    const fullPath = path.join(process.cwd(), "public", urlOrPath);
    buffer = await fs.readFile(fullPath);
  } else {
    const res = await fetch(urlOrPath);
    if (!res.ok) throw new Error(`Failed to fetch image: ${urlOrPath} (${res.status})`);
    buffer = Buffer.from(await res.arrayBuffer());
  }

  const mimeType = urlOrPath.endsWith(".jpg") || urlOrPath.endsWith(".jpeg")
    ? "image/jpeg"
    : "image/png";

  return { data: buffer.toString("base64"), mimeType };
}

export interface GenerateMarketingAssetInput {
  productImageBuffer: Buffer;
  brand: BrandParameters;
  product: ProductData;
  customPrompt?: string;
}

export async function generateMarketingAsset(input: GenerateMarketingAssetInput): Promise<Buffer> {
  const { productImageBuffer, brand, product, customPrompt } = input;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  // Attach reference images first so the model sees the design system before instructions
  const sampleUrls = brand.sample_image_urls ?? [];
  for (let i = 0; i < sampleUrls.length; i++) {
    parts.push({ text: `Reference image ${i + 1} — brand design system:` });
    const img = await loadImageAsBase64(sampleUrls[i]);
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  }

  // Attach the product image
  parts.push({ text: "Product image to feature in the new asset:" });
  parts.push({ inlineData: { mimeType: "image/png", data: productImageBuffer.toString("base64") } });

  // Attach the instruction prompt last
  parts.push({ text: buildPrompt(brand, product, customPrompt) });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [{ parts }],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const candidates = response.candidates;
  if (!candidates?.length) throw new Error("Gemini returned no candidates.");

  const responseParts = candidates[0].content?.parts;
  if (!responseParts) throw new Error("Gemini returned no content parts.");

  for (const part of responseParts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }

  throw new Error("Gemini returned no image data in the response.");
}
