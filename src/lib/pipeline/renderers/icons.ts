import sharp from "sharp";
import { createCanvas } from "@napi-rs/canvas";
import { IconCalloutSpec, BrandRules, OUTPUT_SIZE } from "../types";
import { resolveIcons, colorizeSvg } from "../icon-registry";

const ICON_RENDER_SIZE = 64;

async function svgToBuffer(svgContent: string): Promise<Buffer> {
  return sharp(Buffer.from(svgContent)).resize(ICON_RENDER_SIZE, ICON_RENDER_SIZE).png().toBuffer();
}

function drawFallbackIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  key: string,
  primaryColor: string,
  secondaryColor: string,
) {
  const r = ICON_RENDER_SIZE / 2;
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  const initials = key
    .replace(/([A-Z])/g, " $1")
    .trim()
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
  ctx.fillStyle = secondaryColor;
  ctx.font = `bold 22px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials, cx, cy);
}

export async function renderIcons(
  icons: IconCalloutSpec[],
  rules: BrandRules,
): Promise<Buffer> {
  if (icons.length === 0) {
    return sharp({
      create: { width: OUTPUT_SIZE, height: OUTPUT_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).png().toBuffer();
  }

  const resolved = resolveIcons(icons.map((ic) => ic.icon_key));
  const resolvedMap = new Map(resolved.map((r) => [r.key, r]));

  const overlays: sharp.OverlayOptions[] = [];

  const labelCanvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const labelCtx = labelCanvas.getContext("2d");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (labelCtx as any).clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  for (const icon of icons) {
    const cx = Math.round(OUTPUT_SIZE * (icon.x_pct / 100));
    const cy = Math.round(OUTPUT_SIZE * (icon.y_pct / 100));
    const entry = resolvedMap.get(icon.icon_key);

    if (entry?.svgContent) {
      const colorized = colorizeSvg(entry.svgContent, rules.colors.primary);
      const buf = await svgToBuffer(colorized);
      overlays.push({
        input: buf,
        left: Math.max(0, cx - ICON_RENDER_SIZE / 2),
        top: Math.max(0, cy - ICON_RENDER_SIZE / 2),
      });
    } else {
      drawFallbackIcon(
        labelCtx as unknown as CanvasRenderingContext2D,
        cx,
        cy,
        icon.icon_key,
        rules.colors.primary,
        rules.colors.secondary,
      );
    }

    const label =
      icon.label || icon.icon_key.replace(/([A-Z])/g, " $1").trim();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = labelCtx as any;
    ctx.fillStyle = rules.colors.primary;
    ctx.font = `bold 13px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const maxLabelW = 120;
    const labelWords = label.split(" ");
    const labelLines: string[] = [];
    let currentLine = "";
    for (const w of labelWords) {
      const test = currentLine ? `${currentLine} ${w}` : w;
      if (ctx.measureText(test).width > maxLabelW && currentLine) {
        labelLines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) labelLines.push(currentLine);

    const labelTop = cy + ICON_RENDER_SIZE / 2 + 6;
    for (let i = 0; i < labelLines.length; i++) {
      ctx.fillText(labelLines[i], cx, labelTop + i * 16);
    }
  }

  const labelBuf = Buffer.from(labelCanvas.toBuffer("image/png"));

  const base = sharp({
    create: {
      width: OUTPUT_SIZE,
      height: OUTPUT_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).png();

  const allOverlays: sharp.OverlayOptions[] = [
    ...overlays,
    { input: labelBuf, left: 0, top: 0 },
  ];

  return base.composite(allOverlays).toBuffer();
}
