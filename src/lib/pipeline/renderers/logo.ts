import sharp from "sharp";
import fs from "fs";
import path from "path";
import { LogoSpec, OUTPUT_SIZE } from "../types";

const LOGO_DIR = path.join(process.cwd(), "public", "logos");
const LOGO_EXTS = [".png", ".svg", ".jpg", ".jpeg", ".webp"];

function findLogoFile(brandName: string): string | null {
  const slug = brandName.toLowerCase().replace(/\s+/g, "-");
  for (const ext of LOGO_EXTS) {
    const p = path.join(LOGO_DIR, `${slug}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function renderLogoLayer(
  spec: LogoSpec,
  logoUrl?: string,
  brandName?: string,
): Promise<{ buffer: Buffer; left: number; top: number } | null> {
  let logoBuffer: Buffer | null = null;

  if (logoUrl?.startsWith("http")) {
    try {
      const res = await fetch(logoUrl);
      if (res.ok) logoBuffer = Buffer.from(await res.arrayBuffer());
    } catch { /* fall through */ }
  } else if (logoUrl) {
    const resolved = logoUrl.startsWith("/")
      ? path.join(process.cwd(), "public", logoUrl)
      : logoUrl;
    if (fs.existsSync(resolved)) logoBuffer = fs.readFileSync(resolved);
  }

  if (!logoBuffer && brandName) {
    const found = findLogoFile(brandName);
    if (found) logoBuffer = fs.readFileSync(found);
  }

  if (!logoBuffer) return null;

  const maxDim = Math.round(OUTPUT_SIZE * spec.scale);
  const resized = await sharp(logoBuffer)
    .resize(maxDim, maxDim, { fit: "inside" })
    .png()
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const w = meta.width || maxDim;
  const h = meta.height || maxDim;
  const margin = spec.clear_space;

  let left: number;
  let top: number;

  switch (spec.placement) {
    case "top-left":
      left = margin;
      top = margin;
      break;
    case "top-right":
      left = OUTPUT_SIZE - w - margin;
      top = margin;
      break;
    case "bottom-left":
      left = margin;
      top = OUTPUT_SIZE - h - margin;
      break;
    case "bottom-right":
      left = OUTPUT_SIZE - w - margin;
      top = OUTPUT_SIZE - h - margin;
      break;
  }

  return { buffer: resized, left, top };
}
