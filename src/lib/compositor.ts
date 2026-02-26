import sharp from "sharp";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import path from "path";
import { BrandParameters } from "@/types";

const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 800;

function registerBrandFont(brand: BrandParameters): string {
  const fontPath = path.join(
    process.cwd(),
    "public",
    "fonts",
    `${brand.font_family}.ttf`
  );

  try {
    GlobalFonts.registerFromPath(fontPath, brand.font_family);
    return brand.font_family;
  } catch {
    // Fall back to the font family name directly (system font)
    return brand.font_family;
  }
}

function renderTextOverlay(
  text: string,
  brand: BrandParameters,
  fontFamily: string
): Buffer {
  const canvas = createCanvas(OUTPUT_WIDTH, OUTPUT_HEIGHT);
  const ctx = canvas.getContext("2d");

  // Transparent background
  ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  const fontSize = 42;
  ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const maxWidth = OUTPUT_WIDTH - 120;
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.3;
  const totalTextHeight = lines.length * lineHeight;
  const paddingY = 20;
  const paddingX = 40;
  const bannerHeight = totalTextHeight + paddingY * 2;
  const bannerY = OUTPUT_HEIGHT - bannerHeight - 40;

  // Semi-transparent banner background
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  const bannerWidth = maxWidth + paddingX * 2;
  const bannerX = (OUTPUT_WIDTH - bannerWidth) / 2;
  const radius = 12;

  ctx.beginPath();
  ctx.moveTo(bannerX + radius, bannerY);
  ctx.lineTo(bannerX + bannerWidth - radius, bannerY);
  ctx.quadraticCurveTo(bannerX + bannerWidth, bannerY, bannerX + bannerWidth, bannerY + radius);
  ctx.lineTo(bannerX + bannerWidth, bannerY + bannerHeight - radius);
  ctx.quadraticCurveTo(bannerX + bannerWidth, bannerY + bannerHeight, bannerX + bannerWidth - radius, bannerY + bannerHeight);
  ctx.lineTo(bannerX + radius, bannerY + bannerHeight);
  ctx.quadraticCurveTo(bannerX, bannerY + bannerHeight, bannerX, bannerY + bannerHeight - radius);
  ctx.lineTo(bannerX, bannerY + radius);
  ctx.quadraticCurveTo(bannerX, bannerY, bannerX + radius, bannerY);
  ctx.closePath();
  ctx.fill();

  // Draw text
  ctx.fillStyle = brand.primary_color;
  const textStartY = bannerY + paddingY;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], OUTPUT_WIDTH / 2, textStartY + i * lineHeight);
  }

  return Buffer.from(canvas.toBuffer("image/png"));
}

export interface CompositeResult {
  finalImage: Buffer;
  backgroundImage: Buffer;
}

export async function compositeImage(
  productImageUrl: string,
  backgroundBuffer: Buffer,
  marketingCopy: string,
  brand: BrandParameters
): Promise<CompositeResult> {
  // 1. Fetch and process the product image
  const productResponse = await fetch(productImageUrl);
  if (!productResponse.ok) {
    throw new Error(`Failed to fetch product image: ${productResponse.status}`);
  }
  const productArrayBuffer = await productResponse.arrayBuffer();
  const productBuffer = Buffer.from(productArrayBuffer);

  // Resize product image to fit within the center of the canvas
  const productMaxWidth = Math.round(OUTPUT_WIDTH * 0.45);
  const productMaxHeight = Math.round(OUTPUT_HEIGHT * 0.6);
  const resizedProduct = await sharp(productBuffer)
    .resize(productMaxWidth, productMaxHeight, { fit: "inside" })
    .png()
    .toBuffer();

  const productMeta = await sharp(resizedProduct).metadata();
  const productW = productMeta.width || productMaxWidth;
  const productH = productMeta.height || productMaxHeight;

  // 2. Resize background to target dimensions
  const resizedBackground = await sharp(backgroundBuffer)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "cover" })
    .png()
    .toBuffer();

  // 3. Composite product onto background (centered)
  const productLeft = Math.round((OUTPUT_WIDTH - productW) / 2);
  const productTop = Math.round((OUTPUT_HEIGHT - productH) / 2) - 30;

  // 4. Render text overlay
  const fontFamily = registerBrandFont(brand);
  const textOverlay = renderTextOverlay(marketingCopy, brand, fontFamily);

  // 5. Final composite: background + product + text
  const finalImage = await sharp(resizedBackground)
    .composite([
      {
        input: resizedProduct,
        left: productLeft,
        top: Math.max(0, productTop),
      },
      {
        input: textOverlay,
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();

  return {
    finalImage,
    backgroundImage: resizedBackground,
  };
}
