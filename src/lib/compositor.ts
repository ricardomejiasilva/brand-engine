import sharp from "sharp";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import path from "path";
import {
  BrandParameters,
  LayoutSpec,
  TextPosition,
  ProductAlignment,
} from "@/types";

const OUTPUT_SIZE = 1409;

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
    return brand.font_family;
  }
}

async function removeWhiteBackground(imageBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const threshold = 235;
  const softEdge = 20;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const minChannel = Math.min(r, g, b);

    if (minChannel >= threshold) {
      data[i + 3] = 0;
    } else if (minChannel >= threshold - softEdge) {
      const opacity = Math.round(
        ((threshold - minChannel) / softEdge) * 255
      );
      data[i + 3] = Math.min(data[i + 3], opacity);
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

function renderBrandedBackground(
  brand: BrandParameters,
  layout: LayoutSpec
): Buffer {
  const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const ctx = canvas.getContext("2d");

  const split = layout.split_position / 100;
  const skew = (layout.split_skew ?? 0) / 100;

  ctx.fillStyle = brand.secondary_color;
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  ctx.fillStyle = brand.primary_color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(OUTPUT_SIZE * (split + skew), 0);
  ctx.lineTo(OUTPUT_SIZE * (split - skew), OUTPUT_SIZE);
  ctx.lineTo(0, OUTPUT_SIZE);
  ctx.closePath();
  ctx.fill();

  return Buffer.from(canvas.toBuffer("image/png"));
}

function getTextCoords(
  position: TextPosition,
  lineCount: number,
  lineHeight: number
): { x: number; y: number; align: CanvasTextAlign } {
  const margin = 70;

  switch (position) {
    case "upper-right":
      return { x: OUTPUT_SIZE - margin, y: margin, align: "right" };
    case "lower-left":
      return {
        x: margin,
        y: OUTPUT_SIZE - margin - lineCount * lineHeight,
        align: "left",
      };
    case "lower-right":
      return {
        x: OUTPUT_SIZE - margin,
        y: OUTPUT_SIZE - margin - lineCount * lineHeight,
        align: "right",
      };
    case "upper-left":
    default:
      return { x: margin, y: margin, align: "left" };
  }
}

function renderTextOverlay(
  text: string,
  brand: BrandParameters,
  layout: LayoutSpec,
  fontFamily: string
): Buffer {
  const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const fontSize = layout.font_size;
  const style = brand.text_style ?? "italic bold";
  ctx.font = `${style} ${fontSize}px "${fontFamily}", serif`;
  ctx.textBaseline = "top";

  const maxWidth = OUTPUT_SIZE * 0.4;
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

  const lineHeight = fontSize * 1.4;
  const { x, y, align } = getTextCoords(
    layout.text_position,
    lines.length,
    lineHeight
  );
  ctx.textAlign = align;

  ctx.fillStyle = brand.secondary_color;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }

  return Buffer.from(canvas.toBuffer("image/png"));
}

function getProductLeft(
  alignment: ProductAlignment,
  productW: number,
  split: number
): number {
  const splitPx = OUTPUT_SIZE * (split / 100);

  switch (alignment) {
    case "left":
      return Math.round(splitPx / 2 - productW / 2);
    case "center":
      return Math.round((OUTPUT_SIZE - productW) / 2);
    case "right":
    default:
      return Math.round(splitPx + (OUTPUT_SIZE - splitPx) / 2 - productW / 2);
  }
}

export interface CompositeResult {
  finalImage: Buffer;
  backgroundImage: Buffer;
}

export async function compositeImage(
  productImageUrl: string,
  marketingCopy: string,
  brand: BrandParameters,
  layout: LayoutSpec
): Promise<CompositeResult> {
  const productResponse = await fetch(productImageUrl);
  if (!productResponse.ok) {
    throw new Error(`Failed to fetch product image: ${productResponse.status}`);
  }
  const productArrayBuffer = await productResponse.arrayBuffer();
  const productBuffer = Buffer.from(productArrayBuffer);

  const transparentProduct = await removeWhiteBackground(productBuffer);

  const scale = (layout.product_scale ?? 75) / 100;
  const productMaxSize = Math.round(OUTPUT_SIZE * scale);
  const resizedProduct = await sharp(transparentProduct)
    .resize(productMaxSize, productMaxSize, { fit: "inside" })
    .png()
    .toBuffer();

  const productMeta = await sharp(resizedProduct).metadata();
  const productW = productMeta.width || productMaxSize;
  const productH = productMeta.height || productMaxSize;

  const backgroundPng = renderBrandedBackground(brand, layout);
  const background = await sharp(backgroundPng).png().toBuffer();

  const productLeft = getProductLeft(
    layout.product_alignment,
    productW,
    layout.split_position
  );
  const productTop = Math.round((OUTPUT_SIZE - productH) / 2);

  const fontFamily = registerBrandFont(brand);
  const textOverlay = renderTextOverlay(marketingCopy, brand, layout, fontFamily);

  const finalImage = await sharp(background)
    .composite([
      {
        input: resizedProduct,
        left: Math.max(0, productLeft),
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
    backgroundImage: background,
  };
}
