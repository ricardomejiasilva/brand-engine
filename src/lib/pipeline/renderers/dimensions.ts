import { createCanvas } from "@napi-rs/canvas";
import { DimensionSpec, OUTPUT_SIZE } from "../types";

const LINE_COLOR = "#333333";
const BADGE_BG = "#222222";
const BADGE_TEXT = "#ffffff";
const BADGE_RADIUS = 28;
const TICK_SIZE = 8;

export function renderDimensions(spec: DimensionSpec): Buffer {
  const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  for (const line of spec.lines) {
    const sx = OUTPUT_SIZE * (line.start_pct.x / 100);
    const sy = OUTPUT_SIZE * (line.start_pct.y / 100);
    const ex = OUTPUT_SIZE * (line.end_pct.x / 100);
    const ey = OUTPUT_SIZE * (line.end_pct.y / 100);

    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    // Main line
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Endpoint ticks
    if (line.orientation === "horizontal") {
      ctx.beginPath();
      ctx.moveTo(sx, sy - TICK_SIZE);
      ctx.lineTo(sx, sy + TICK_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex, ey - TICK_SIZE);
      ctx.lineTo(ex, ey + TICK_SIZE);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(sx - TICK_SIZE, sy);
      ctx.lineTo(sx + TICK_SIZE, sy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex - TICK_SIZE, ey);
      ctx.lineTo(ex + TICK_SIZE, ey);
      ctx.stroke();
    }

    // Label badge
    let labelX: number, labelY: number;
    switch (line.label_position) {
      case "start":
        labelX = sx;
        labelY = sy;
        break;
      case "end":
        labelX = ex;
        labelY = ey;
        break;
      case "center":
      default:
        labelX = (sx + ex) / 2;
        labelY = (sy + ey) / 2;
        break;
    }

    ctx.fillStyle = BADGE_BG;
    ctx.beginPath();
    ctx.arc(labelX, labelY, BADGE_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = BADGE_TEXT;
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(line.label, labelX, labelY);
  }

  return Buffer.from(canvas.toBuffer("image/png"));
}
