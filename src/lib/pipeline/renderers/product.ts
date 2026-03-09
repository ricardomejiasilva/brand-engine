import sharp from "sharp";
import { ProductPlacement, OUTPUT_SIZE } from "../types";

export async function removeWhiteBackground(imageBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const threshold = 248;
  const softEdge = 8;

  function pixelIndex(x: number, y: number) {
    return (y * width + x) * channels;
  }

  function isBackground(x: number, y: number): boolean {
    const i = pixelIndex(x, y);
    return (
      data[i]     >= threshold - softEdge &&
      data[i + 1] >= threshold - softEdge &&
      data[i + 2] >= threshold - softEdge
    );
  }

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  function enqueue(x: number, y: number) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx] || !isBackground(x, y)) return;
    visited[idx] = 1;
    queue.push(x, y);
  }

  for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y++) { enqueue(0, y); enqueue(width - 1, y); }

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!visited[y * width + x]) continue;
      const i = pixelIndex(x, y);
      const minChannel = Math.min(data[i], data[i + 1], data[i + 2]);
      if (minChannel >= threshold) {
        data[i + 3] = 0;
      } else {
        const opacity = Math.round(((minChannel - (threshold - softEdge)) / softEdge) * 255);
        data[i + 3] = Math.min(data[i + 3], Math.max(0, opacity));
      }
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

export async function renderProductLayer(
  imageBuffer: Buffer,
  placement: ProductPlacement,
): Promise<{ buffer: Buffer; left: number; top: number }> {
  const transparent = await removeWhiteBackground(imageBuffer);

  const maxSize = Math.round(OUTPUT_SIZE * (placement.width_pct / 100));
  const resized = await sharp(transparent)
    .resize(maxSize, maxSize, { fit: "inside" })
    .png()
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const w = meta.width || maxSize;
  const h = meta.height || maxSize;

  const centerX = Math.round(OUTPUT_SIZE * (placement.x_pct / 100));
  const centerY = Math.round(OUTPUT_SIZE * (placement.y_pct / 100));
  const left = Math.max(0, Math.min(OUTPUT_SIZE - w, centerX - Math.round(w / 2)));
  const top = Math.max(0, Math.min(OUTPUT_SIZE - h, centerY - Math.round(h / 2)));

  return { buffer: resized, left, top };
}

export async function renderDropShadow(
  productBuffer: Buffer,
  placement: ProductPlacement,
  productLeft: number,
  productTop: number,
): Promise<{ buffer: Buffer; left: number; top: number } | null> {
  if (!placement.shadow.enabled) return null;

  const { createCanvas } = await import("@napi-rs/canvas");

  const meta = await sharp(productBuffer).metadata();
  const w = meta.width || 100;
  const h = meta.height || 100;

  // Shadow ellipse: width matches product footprint, height is a thin sliver
  const shadowW = Math.round(w * placement.shadow.scale_x * 1.1);
  const shadowH = Math.round(h * 0.12);
  const canvas = createCanvas(shadowW, shadowH);
  const ctx = canvas.getContext("2d");

  const cx = shadowW / 2;
  const cy = shadowH / 2;
  const rx = shadowW / 2;
  const ry = shadowH / 2;

  const alpha = placement.shadow.opacity;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  gradient.addColorStop(0,   `rgba(0, 0, 0, ${alpha})`);
  gradient.addColorStop(0.5, `rgba(0, 0, 0, ${alpha * 0.45})`);
  gradient.addColorStop(1,   `rgba(0, 0, 0, 0)`);

  // Clip to ellipse first, then flood-fill with the radial gradient
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, shadowW, shadowH);
  ctx.restore();

  const shadowBuffer = Buffer.from(canvas.toBuffer("image/png"));

  // Center shadow under the product; sit it at the very bottom of the product bounding box
  const shadowLeft = productLeft + Math.round((w - shadowW) / 2);
  const shadowTop  = productTop + h - Math.round(shadowH * 0.5) + placement.shadow.offset_y;

  return {
    buffer: shadowBuffer,
    left: Math.max(0, shadowLeft),
    top:  Math.max(0, shadowTop),
  };
}
