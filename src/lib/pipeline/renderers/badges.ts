import { createCanvas } from "@napi-rs/canvas";
import { BadgeSpec, OUTPUT_SIZE } from "../types";

export function renderBadges(badges: BadgeSpec[]): Buffer {
  const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  for (const badge of badges) {
    const cx = OUTPUT_SIZE * (badge.x_pct / 100);
    const cy = OUTPUT_SIZE * (badge.y_pct / 100);
    const r = badge.size / 2;

    if (badge.shape === "circle") {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = badge.fill;
      ctx.fill();
    } else {
      const pillW = badge.size * 1.6;
      const pillH = badge.size;
      const pillR = pillH / 2;
      ctx.beginPath();
      ctx.moveTo(cx - pillW / 2 + pillR, cy - pillH / 2);
      ctx.lineTo(cx + pillW / 2 - pillR, cy - pillH / 2);
      ctx.arc(cx + pillW / 2 - pillR, cy, pillR, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(cx - pillW / 2 + pillR, cy + pillH / 2);
      ctx.arc(cx - pillW / 2 + pillR, cy, pillR, Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = badge.fill;
      ctx.fill();
    }

    ctx.fillStyle = badge.text_color;
    ctx.font = `bold ${badge.font_size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const words = badge.text.split(" ");
    if (words.length <= 2) {
      ctx.fillText(badge.text, cx, cy);
    } else {
      const lineH = badge.font_size * 1.2;
      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(" ");
      const line2 = words.slice(mid).join(" ");
      ctx.fillText(line1, cx, cy - lineH / 2);
      ctx.fillText(line2, cx, cy + lineH / 2);
    }
  }

  return Buffer.from(canvas.toBuffer("image/png"));
}
