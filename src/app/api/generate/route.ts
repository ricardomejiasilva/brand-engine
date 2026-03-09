import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BrandParameters, GenerateRequest, GenerateResponse } from "@/types";
import { analyzeProduct } from "@/lib/pipeline/product-analyzer";
import { deriveBrandRules } from "@/lib/pipeline/brand-rules";
import { generateCreativePlan } from "@/lib/ai/creative-director";
import { validatePlan } from "@/lib/pipeline/composition-validator";
import { renderScene } from "@/lib/pipeline/scene-renderer";
import { assembleOutput } from "@/lib/pipeline/output-assembler";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { productData, brandName, customPrompt, outputMode, variationSeed } = body;

    if (!productData || !brandName) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: "productData and brandName are required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: brand, error: brandError } = await supabase
      .from("brand_parameters")
      .select("*")
      .eq("brand_name", brandName)
      .single();

    if (brandError || !brand) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: `Brand "${brandName}" not found: ${brandError?.message || "No data"}` },
        { status: 404 },
      );
    }

    const brandParams = brand as BrandParameters;
    const seed = variationSeed ?? Math.floor(Math.random() * 2147483647);
    const mode = outputMode ?? "single";

    // 1. Analyze product
    const analysis = analyzeProduct(productData);

    // 2. Derive brand rules
    const rules = deriveBrandRules(brandParams);

    // 3. AI creative direction (falls back to deterministic if AI fails)
    const rawPlan = await generateCreativePlan({
      product: productData,
      analysis,
      brand: brandParams,
      rules,
      customPrompt,
      outputMode: mode,
      seed,
    });

    // 4. Validate and fix plan
    const plan = validatePlan(rawPlan);

    // 5. Fetch product image
    const productResponse = await fetch(productData.imageUrl);
    if (!productResponse.ok) {
      throw new Error(`Failed to fetch product image: ${productResponse.status}`);
    }
    const productImageBuffer = Buffer.from(await productResponse.arrayBuffer());

    // 6. Render each scene
    const panelBuffers: Buffer[] = [];
    for (const scene of plan.scenes) {
      const rendered = await renderScene(scene, rules, productImageBuffer, brandName);
      panelBuffers.push(rendered);
    }

    // 7. Assemble output
    const assembled = await assembleOutput(panelBuffers, mode);

    // 8. Extract marketing copy from first scene headline
    const marketingCopy = plan.scenes[0]?.headline?.text || "";

    // 9. Build response
    const response: GenerateResponse = {
      success: true,
      originalImageUrl: productData.imageUrl,
      finalImageBase64: assembled.finalImage.toString("base64"),
      panels: assembled.panels.map((p) => p.toString("base64")),
      marketingCopy,
      variationSeed: seed,
    };

    if (assembled.stackedImage) {
      response.stackedImageBase64 = assembled.stackedImage.toString("base64");
    }

    return NextResponse.json<GenerateResponse>(response);
  } catch (error) {
    console.error("Generate error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json<GenerateResponse>(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
