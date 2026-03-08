import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCreative } from "@/lib/ai/text-generator";
import { compositeImage } from "@/lib/compositor";
import { BrandParameters, GenerateRequest, GenerateResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { productData, brandName }: GenerateRequest = await request.json();

    if (!productData || !brandName) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: "productData and brandName are required." },
        { status: 400 }
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
        {
          success: false,
          error: `Brand "${brandName}" not found: ${brandError?.message || "No data"}`,
        },
        { status: 404 }
      );
    }

    const brandParams = brand as BrandParameters;

    const { marketingCopy, layout } = await generateCreative(
      productData,
      brandParams
    );

    const { finalImage, backgroundImage } = await compositeImage(
      productData.imageUrl,
      marketingCopy,
      brandParams,
      layout
    );

    return NextResponse.json<GenerateResponse>({
      success: true,
      originalImageUrl: productData.imageUrl,
      backgroundImageBase64: backgroundImage.toString("base64"),
      finalImageBase64: finalImage.toString("base64"),
      marketingCopy,
    });
  } catch (error) {
    console.error("Generate error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json<GenerateResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
