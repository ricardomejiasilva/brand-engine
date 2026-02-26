import * as cheerio from "cheerio";
import { ProductData } from "@/types";

const ALLOWED_HOST = "www.webstaurantstore.com";

export function validateWebstaurantUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === ALLOWED_HOST;
  } catch {
    return false;
  }
}

export async function scrapeProduct(url: string): Promise<ProductData> {
  if (!validateWebstaurantUrl(url)) {
    throw new Error("Only WebstaurantStore URLs are supported.");
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Title
  const title =
    $('h1[data-testid="itemTitle"]').text().trim() ||
    $("h1").first().text().trim();

  // Brand — first word of the title (WebstaurantStore titles start with brand)
  const brand = title.split(/\s+/)[0] || "";

  // Gallery images — collect all product images at full resolution
  const seenIds = new Set<string>();
  const galleryImages: string[] = [];

  function normalizeUrl(raw: string): string {
    if (!raw) return "";
    if (raw.startsWith("//")) return `https:${raw}`;
    if (raw.startsWith("/")) return `https://${ALLOWED_HOST}${raw}`;
    return raw;
  }

  // Upgrade any product image URL to /large/ resolution
  function toLarge(url: string): string {
    return url.replace(
      /\/images\/products\/(?:small|medium|extra_large|thumb|tiny)\//,
      "/images/products/large/"
    );
  }

  // Deduplicate by the filename (last path segment) so different sizes
  // of the same image don't both appear
  function pushImage(raw: string | undefined) {
    if (!raw) return;
    const url = toLarge(normalizeUrl(raw.trim()));
    if (!url) return;
    const filename = url.split("/").pop() || url;
    if (!seenIds.has(filename)) {
      seenIds.add(filename);
      galleryImages.push(url);
    }
  }

  // Scoped to the product gallery area only
  // The main image has id="GalleryImage", and gallery thumbnails
  // share the same parent container or are siblings to it
  pushImage($("#GalleryImage").attr("src") || $("#GalleryImage").attr("data-src"));

  // Gallery thumbnail buttons/links that reference other angles of this product
  // These are typically inside the same gallery wrapper, with data-src for lazy loading
  $('[data-testid="gallery"] img, [class*="gallery"] img, [class*="Gallery"] img').each((_, el) => {
    pushImage($(el).attr("data-src") || $(el).attr("src"));
  });

  // Also check for thumbnail images near the #GalleryImage
  $("#GalleryImage").closest("div").parent().find("img").each((_, el) => {
    pushImage($(el).attr("data-src") || $(el).attr("src"));
  });

  // Fallback: og:image meta
  if (galleryImages.length === 0) {
    pushImage($('meta[property="og:image"]').attr("content"));
  }

  const fullImageUrl = galleryImages[0] || "";

  // Price
  const price =
    $('[data-testid="price"]').first().text().trim() ||
    $(".price-main .price").first().text().trim() ||
    $('[itemprop="price"]').attr("content") ||
    "";

  // Item # and MFR # — extract the code from text like "Item number Item #: 929ww180x"
  const rawItemText = $('[data-testid="itemNumber"]').text() ||
    $("span:contains('Item #')").parent().text() || "";
  const itemMatch = rawItemText.match(/Item\s*#:?\s*([A-Za-z0-9\-]+)/i);
  const itemNumber = itemMatch ? itemMatch[1].trim() : "";

  const rawMfrText = $('[data-testid="mfrNumber"]').text() ||
    $("span:contains('MFR #')").parent().text() || "";
  const mfrMatch = rawMfrText.match(/MFR\s*#:?\s*([A-Za-z0-9\-]+)/i);
  const mfrNumber = mfrMatch ? mfrMatch[1].trim() : "";

  // UPC
  let upc = "";
  $("*:contains('UPC Code')").each((_, el) => {
    const text = $(el).text().trim();
    const match = text.match(/UPC\s*Code\s*:\s*(\d+)/i);
    if (match) upc = match[1];
  });

  // Rating and review count
  const ratingText =
    $('[data-testid="rating"]').attr("aria-label") ||
    $('[aria-label*="out of 5 stars"]').first().attr("aria-label") ||
    "";
  const ratingMatch = ratingText.match(/([\d.]+)\s*out\s*of\s*5/);
  const rating = ratingMatch ? ratingMatch[1] : "";

  const reviewCountText =
    $('a[href*="reviews"]').first().text().trim() ||
    $("span:contains('reviews')").first().text().trim() ||
    "";
  const reviewCountMatch = reviewCountText.match(/(\d+)/);
  const reviewCount = reviewCountMatch ? reviewCountMatch[1] : "";

  // Bullet-point description from Product Overview
  const descriptionParts: string[] = [];
  $(
    '[data-testid="itemDescription"] li, .description li, #ProductOverview li, .product-overview li'
  ).each((_, el) => {
    const text = $(el).text().trim();
    if (text) descriptionParts.push(text);
  });
  const description =
    descriptionParts.length > 0
      ? descriptionParts.join(". ")
      : $('[data-testid="itemDescription"], .description, #ProductOverview')
          .first()
          .text()
          .trim();

  // Feature details — rich heading + paragraph sections
  // Some pages use h3 + p pairs (e.g. "Efficient Results" -> paragraph)
  // Others use a single "Details" section with a long paragraph
  const featureDetails: Record<string, string> = {};

  $("h3").each((_, heading) => {
    const h3 = $(heading);
    const headingText = h3.text().trim();
    const nextP = h3.next("p");
    if (nextP.length && headingText) {
      const paragraphText = nextP.text().trim();
      if (paragraphText) {
        featureDetails[headingText] = paragraphText;
      }
    }
  });

  // Long-form details section (e.g. "Carlisle 4011500 Details")
  $("h2").each((_, heading) => {
    const h2 = $(heading);
    const text = h2.text().trim();
    if (text.toLowerCase().includes("details")) {
      const detailBlock = h2.next("div, p, section");
      if (detailBlock.length) {
        const detailText = detailBlock.text().trim();
        if (detailText && detailText.length > 30) {
          featureDetails["Details"] = detailText;
        }
      }
    }
  });

  // Specs — <dl> with <dt>/<dd> pairs inside #specifications-group
  const specs: Record<string, string> = {};
  $(
    '[data-testid="specifications-group"] dt, #specifications-group dt'
  ).each((_, dt) => {
    const key = $(dt).text().trim();
    const dd = $(dt).next("dd");
    const value = dd.text().trim();
    if (key && value) {
      specs[key] = value;
    }
  });

  if (!title) {
    throw new Error("Could not extract product title from the page.");
  }

  return {
    title,
    brand,
    imageUrl: fullImageUrl,
    galleryImages,
    price,
    itemNumber,
    mfrNumber,
    upc,
    rating,
    reviewCount,
    description: description || "No description available.",
    featureDetails,
    specs,
  };
}
