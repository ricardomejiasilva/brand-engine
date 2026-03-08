import { GoogleGenAI } from "@google/genai";
import { ProductData, BrandParameters, LayoutSpec } from "@/types";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

function formatFeatureDetails(product: ProductData): string {
  const entries = Object.entries(product.featureDetails);
  if (entries.length === 0) return "";
  const lines = entries.map(([heading, body]) => `- ${heading}: ${body}`);
  return `Key Features:\n${lines.join("\n")}\n`;
}

export interface CreativeOutput {
  marketingCopy: string;
  layout: LayoutSpec;
}

export async function generateCreative(
  product: ProductData,
  brand: BrandParameters
): Promise<CreativeOutput> {
  const prompt = `You are a creative director for the restaurant supply brand "${brand.brand_name}".
Brand vibe: ${brand.background_vibe_description}

Product: ${product.title}
Description: ${product.description}
${formatFeatureDetails(product)}

You must produce two things for a 1409x1409 square marketing image:

1. A short, punchy marketing hook (1-2 lines max) that feels on-brand.
2. A layout specification for the image composition. The image has a two-tone color-split background using the brand's primary and secondary colors. Choose values that create the most visually appealing layout for THIS specific product:
   - split_position: 10-90 (percentage of canvas width covered by the primary color panel)
   - split_skew: 0-15 (angle of the split edge in percentage of canvas width; 0 = perfectly straight vertical line, higher = more diagonal)
   - text_position: one of "upper-left", "upper-right", "lower-left", "lower-right"
   - product_alignment: one of "left", "center", "right"
   - product_scale: 50-85 (percentage of the canvas the product can fill; use 65-85 for hero product shots, 50-60 for smaller accent placement)
   - font_size: 28-60 (appropriate size for the hook length and image)

Rules:
- The product should be the HERO of the image — make it large and prominent.
- For clean, modern, professional brands: use split_skew 0 (straight edge) and product_alignment "center" with a large product_scale.
- For dynamic, energetic brands: use split_skew 5-15 for a diagonal edge.
- Text should be placed on the primary color panel so it reads clearly against the brand color.
- Product should be placed mostly on the secondary color panel for contrast.
- If text is on the left, product should be on the right, and vice versa.
- Shorter hooks can use larger font sizes, longer hooks should use smaller ones.

Return ONLY valid JSON in this exact format, no markdown fences, no commentary:
{"marketing_copy":"your hook here","split_position":45,"split_skew":0,"text_position":"upper-left","product_alignment":"center","product_scale":75,"font_size":38}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini returned no creative output.");
  }

  try {
    const parsed = JSON.parse(text);
    return {
      marketingCopy: parsed.marketing_copy,
      layout: {
        split_position: clamp(parsed.split_position ?? 45, 10, 90),
        split_skew: clamp(parsed.split_skew ?? 0, 0, 15),
        text_position: parsed.text_position ?? "upper-left",
        product_alignment: parsed.product_alignment ?? "center",
        product_scale: clamp(parsed.product_scale ?? 75, 50, 85),
        font_size: clamp(parsed.font_size ?? 38, 28, 60),
      },
    };
  } catch {
    return {
      marketingCopy: text,
      layout: {
        split_position: 45,
        split_skew: 0,
        text_position: "upper-left",
        product_alignment: "center",
        product_scale: 75,
        font_size: 38,
      },
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
