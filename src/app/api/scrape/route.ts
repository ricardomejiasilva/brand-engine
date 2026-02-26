import { NextRequest, NextResponse } from "next/server";
import { scrapeProduct, validateWebstaurantUrl } from "@/lib/scraper";
import { ScrapeResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json<ScrapeResponse>(
        { success: false, error: "A valid URL is required." },
        { status: 400 }
      );
    }

    if (!validateWebstaurantUrl(url)) {
      return NextResponse.json<ScrapeResponse>(
        { success: false, error: "Only WebstaurantStore URLs are supported." },
        { status: 400 }
      );
    }

    const data = await scrapeProduct(url);

    console.log("[scrape]", url);
    console.log("[scrape] brand:", data.brand);
    console.log("[scrape] title:", data.title);
    console.log("[scrape] price:", data.price);
    console.log("[scrape] item#:", data.itemNumber, "| mfr#:", data.mfrNumber);
    console.log("[scrape] upc:", data.upc);
    console.log("[scrape] rating:", data.rating, `(${data.reviewCount} reviews)`);
    console.log("[scrape] imageUrl:", data.imageUrl);
    console.log("[scrape] galleryImages:", data.galleryImages);
    console.log("[scrape] description:", data.description);
    console.log("[scrape] featureDetails:", JSON.stringify(data.featureDetails, null, 2));
    console.log("[scrape] specs:", JSON.stringify(data.specs, null, 2));

    return NextResponse.json<ScrapeResponse>({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json<ScrapeResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
