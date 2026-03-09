import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BrandParameters, GenerateRequest, GenerateResponse } from "@/types";
import { generateMarketingAsset } from "@/lib/ai/image-generator";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { productData, brandName, customPrompt, variationSeed } = body;

    if (!productData || !brandName) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: "productData and brandName are required." },
        { status: 400 },
      );
    }

    // 1. Fetch brand
    const supabase = await createClient();
    const { data: brand, error: brandError } = await supabase
      .from("brand_parameters")
      .select("*")
      .eq("brand_name", brandName)
      .single();

    if (brandError || !brand) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: `Brand "${brandName}" not found: ${brandError?.message ?? "No data"}` },
        { status: 404 },
      );
    }

    const brandParams = brand as BrandParameters;
    const seed = variationSeed ?? Math.floor(Math.random() * 2147483647);

    // 2. Fetch product image (page resolves the selected gallery index into imageUrl before sending)
    const imageUrl = productData.imageUrl;
    const productResponse = await fetch(imageUrl);
    if (!productResponse.ok) {
      throw new Error(`Failed to fetch product image: ${productResponse.status}`);
    }
    const productImageBuffer = Buffer.from(await productResponse.arrayBuffer());

    // 3. Generate via Gemini (reference images are loaded inside generateMarketingAsset)
    const generatedBuffer = await generateMarketingAsset({
      productImageBuffer,
      brand: brandParams,
      product: productData,
      customPrompt,
    });

    // 4. Return result
    return NextResponse.json<GenerateResponse>({
      success: true,
      originalImageUrl: imageUrl,
      finalImageBase64: generatedBuffer.toString("base64"),
      panels: [generatedBuffer.toString("base64")],
      variationSeed: seed,
    });
  } catch (error) {
    console.error("Generate error:", error);
    let message = error instanceof Error ? error.message : "An unexpected error occurred.";
    if (message.includes("RESOURCE_EXHAUSTED") || message.includes("quota")) {
      message = "Gemini API quota exceeded. This model requires a paid Google AI Studio plan. Enable billing at aistudio.google.com and retry.";
    }
    return NextResponse.json<GenerateResponse>(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
