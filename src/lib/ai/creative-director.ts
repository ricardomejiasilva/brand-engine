import { GoogleGenAI } from "@google/genai";
import { ProductData, BrandParameters } from "@/types";
import { ProductAnalysis, BrandRules, CreativePlan, TemplateFamily } from "@/lib/pipeline/types";
import { createDeterministicPlan } from "@/lib/pipeline/creative-planner";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

interface CreativeDirectorInput {
  product: ProductData;
  analysis: ProductAnalysis;
  brand: BrandParameters;
  rules: BrandRules;
  customPrompt?: string;
  outputMode: "single" | "stacked";
  seed: number;
}

interface AICreativeResponse {
  rationale: string;
  scenes: AISceneDirective[];
}

interface AISceneDirective {
  purpose: "hero" | "feature" | "dimension" | "utility";
  template_family: string;
  headline?: string;
  emphasis: string;
  product_bias: "left" | "center" | "right";
  background_weight: "heavy-primary" | "balanced" | "heavy-secondary" | "minimal";
  style_notes?: string;
  badge_text?: string;
  show_dimensions?: boolean;
  show_icons?: boolean;
}

function buildPrompt(input: CreativeDirectorInput): string {
  const { product, analysis, brand, rules, customPrompt, outputMode } = input;

  const flagList = Object.entries(analysis.flags)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/([A-Z])/g, " $1").trim().toLowerCase())
    .join(", ");

  const dimInfo = [
    analysis.dimensions.width && `width: ${analysis.dimensions.width}`,
    analysis.dimensions.height && `height: ${analysis.dimensions.height}`,
    analysis.dimensions.depth && `depth: ${analysis.dimensions.depth}`,
  ].filter(Boolean).join(", ");

  const allowedFamilies = rules.allowed_templates.join(", ");

  const sceneCount = outputMode === "stacked" ? "2-3" : "1";

  let copyGuidance = "";
  switch (rules.copy_tone) {
    case "elevated":
      copyGuidance = "Use elevated, editorial language. Short, premium, catalog-appropriate. Think luxury brand catalog.";
      break;
    case "practical":
      copyGuidance = "Use practical, clear language. Focus on utility and specs. No fluff.";
      break;
    default:
      copyGuidance = "Balance between elevated and practical. Professional catalog tone.";
  }

  const prompt = `You are the creative director for "${brand.brand_name}" marketing assets.

PRODUCT:
- Name: ${product.title}
- Category: ${analysis.category}
- Orientation: ${analysis.orientation}
- Material: ${analysis.material || "unknown"}
- Capacity: ${analysis.capacity || "none"}
- Dimensions: ${dimInfo || "none"}
- Safety/Features: ${flagList || "none"}
- Description: ${product.description.slice(0, 300)}

BRAND:
- Tone: ${rules.design_tone}
- Copy tone: ${rules.copy_tone}
- Colors: primary ${rules.colors.primary}, secondary ${rules.colors.secondary}
- Allowed templates: ${allowedFamilies}

${customPrompt ? `CLIENT DIRECTION:\n${customPrompt}\n` : ""}
TASK:
Return a JSON creative plan with ${sceneCount} scene(s). Each scene needs a distinct purpose.

COPY RULES:
- ${copyGuidance}
- Headlines: 4-10 words max. No exclamation marks.
- Hero scenes: emotional/editorial/use-case focused
- Feature scenes: practical, short noun phrases
- Dimension scenes: factual, minimal
- Vary your approach. Do not repeat the same type of headline.

SCENE PURPOSES:
- "hero": Main emotional/visual impact. Showcase the product with a compelling headline.
- "feature": Highlight capacity, material, safety features with badges and icons.
- "dimension": Show measurements when dimensions are available.

For each scene, provide:
- purpose: "hero" | "feature" | "dimension"
- template_family: one of [${allowedFamilies}]
- headline: the marketing copy for this scene (if applicable)
- emphasis: what matters most (1-3 words)
- product_bias: "left" | "center" | "right" (where the product sits)
- background_weight: "heavy-primary" | "balanced" | "heavy-secondary" | "minimal"
- badge_text: optional badge text like "10 oz. capacity"
- show_dimensions: true if this scene should show dimension lines
- show_icons: true if this scene should show feature icons

Return ONLY valid JSON, no markdown fences:
{"rationale":"brief reason for choices","scenes":[{...}]}`;

  return prompt;
}

function normalizeTemplateFamily(raw: string, allowed: TemplateFamily[]): TemplateFamily {
  const cleaned = raw.toLowerCase().trim() as TemplateFamily;
  if (allowed.includes(cleaned)) return cleaned;
  return allowed[0] ?? "hero-split";
}

export async function generateCreativePlan(input: CreativeDirectorInput): Promise<CreativePlan> {
  const deterministicPlan = createDeterministicPlan({
    analysis: input.analysis,
    rules: input.rules,
    seed: input.seed,
    outputMode: input.outputMode,
  });

  try {
    const prompt = buildPrompt(input);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty AI response");

    const parsed: AICreativeResponse = JSON.parse(text);
    if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error("No scenes in AI response");
    }

    const plan = { ...deterministicPlan };
    plan.rationale = parsed.rationale || plan.rationale;

    for (let i = 0; i < Math.min(parsed.scenes.length, plan.scenes.length); i++) {
      const directive = parsed.scenes[i];
      const scene = plan.scenes[i];

      scene.template_family = normalizeTemplateFamily(directive.template_family, input.rules.allowed_templates);

      if (directive.headline && scene.headline) {
        scene.headline.text = directive.headline;
      }

      if (directive.product_bias === "left") {
        scene.product.x_pct = 35 + Math.random() * 10;
      } else if (directive.product_bias === "right") {
        scene.product.x_pct = 55 + Math.random() * 10;
      }

      switch (directive.background_weight) {
        case "heavy-primary":
          scene.background.primary_ratio = 60 + Math.floor(Math.random() * 15);
          break;
        case "heavy-secondary":
          scene.background.primary_ratio = 25 + Math.floor(Math.random() * 10);
          break;
        case "minimal":
          scene.background.primary_ratio = 0;
          scene.background.type = "full-bleed";
          break;
        case "balanced":
          scene.background.primary_ratio = 40 + Math.floor(Math.random() * 15);
          break;
      }

      if (directive.badge_text && scene.badges.length === 0) {
        scene.badges.push({
          text: directive.badge_text,
          x_pct: 72 + Math.floor(Math.random() * 8),
          y_pct: 48 + Math.floor(Math.random() * 10),
          size: 120,
          shape: input.rules.badges.shape === "none" ? "circle" : (input.rules.badges.shape === "square" ? "pill" : input.rules.badges.shape as "circle" | "pill"),
          fill: input.rules.badges.fill,
          text_color: input.rules.badges.text_color,
          font_size: 20,
        });
      }

      if (directive.show_dimensions === false) {
        scene.dimensions = undefined;
      }

      if (directive.show_icons === false) {
        scene.icons = [];
      }
    }

    if (parsed.scenes.length > plan.scenes.length && input.outputMode === "stacked") {
      for (let i = plan.scenes.length; i < Math.min(parsed.scenes.length, 3); i++) {
        const directive = parsed.scenes[i];
        if (directive.purpose === "feature") {
          const featureScene = createDeterministicPlan({
            analysis: input.analysis,
            rules: input.rules,
            seed: input.seed + i,
            outputMode: "stacked",
          }).scenes.find((s) => s.purpose === "feature" || s.purpose === "dimension");

          if (featureScene) {
            if (directive.headline && featureScene.headline) {
              featureScene.headline.text = directive.headline;
            }
            plan.scenes.push(featureScene);
          }
        }
      }
    }

    return plan;
  } catch (error) {
    console.warn("AI creative direction failed, using deterministic plan:", error);
    return deterministicPlan;
  }
}
