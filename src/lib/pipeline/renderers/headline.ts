import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import path from "path";
import { HeadlineSpec, BrandRules, OUTPUT_SIZE } from "../types";

export function registerFont(family: string): string {
  const fontPath = path.join(process.cwd(), "public", "fonts", `${family}.ttf`);
  try {
    GlobalFonts.registerFromPath(fontPath, family);
  } catch {
    // falls back to system font
  }
  return family;
}

export function renderHeadline(spec: HeadlineSpec, rules: BrandRules): Buffer {
  const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const headingFamily = registerFont(rules.typography.heading_family);
  const style = rules.typography.heading_style;
  ctx.font = `${style} ${spec.font_size}px "${headingFamily}", serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = spec.align;
  ctx.fillStyle = spec.color;

  const maxWidth = OUTPUT_SIZE * (spec.width_pct / 100);
  const x = OUTPUT_SIZE * (spec.x_pct / 100) + (spec.align === "center" ? maxWidth / 2 : 0);
  let y = OUTPUT_SIZE * (spec.y_pct / 100);

  // Eyebrow text
  if (spec.eyebrow) {
    const eyebrowSize = Math.round(spec.font_size * 0.45);
    const bodyFamily = registerFont(rules.typography.body_family);
    ctx.font = `${rules.typography.body_style} ${eyebrowSize}px "${bodyFamily}", sans-serif`;
    ctx.fillStyle = spec.color;
    ctx.globalAlpha = 0.7;
    ctx.fillText(spec.eyebrow, x, y);
    ctx.globalAlpha = 1;
    y += eyebrowSize * 1.8;
  }

  // Divider above
  if (spec.divider_above?.enabled) {
    const divW = OUTPUT_SIZE * (spec.divider_above.width_pct / 100);
    const divX = spec.align === "right" ? x - divW : x;
    ctx.strokeStyle = spec.divider_above.color;
    ctx.lineWidth = spec.divider_above.thickness;
    const divY = y - spec.divider_above.offset;
    ctx.beginPath();
    ctx.moveTo(divX, divY);
    ctx.lineTo(divX + divW, divY);
    ctx.stroke();
  }

  // Word-wrap and render headline text
  ctx.font = `${style} ${spec.font_size}px "${headingFamily}", serif`;
  ctx.fillStyle = spec.color;

  const words = spec.text.split(" ");
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

  const lineHeight = spec.font_size * spec.line_height;
  const renderLines = lines.slice(0, spec.max_lines);
  for (let i = 0; i < renderLines.length; i++) {
    ctx.fillText(renderLines[i], x, y + i * lineHeight);
  }

  // Divider below
  if (spec.divider_below?.enabled) {
    const divW = OUTPUT_SIZE * (spec.divider_below.width_pct / 100);
    const divX = spec.align === "right" ? x - divW : x;
    const divY = y + renderLines.length * lineHeight + spec.divider_below.offset;
    ctx.strokeStyle = spec.divider_below.color;
    ctx.lineWidth = spec.divider_below.thickness;
    ctx.beginPath();
    ctx.moveTo(divX, divY);
    ctx.lineTo(divX + divW, divY);
    ctx.stroke();
  }

  return Buffer.from(canvas.toBuffer("image/png"));
}
