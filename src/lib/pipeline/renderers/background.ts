import { createCanvas } from "@napi-rs/canvas";
import { BackgroundSpec, BrandRules, OUTPUT_SIZE } from "../types";

export function renderBackground(spec: BackgroundSpec, rules: BrandRules): Buffer {
  const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const ctx = canvas.getContext("2d");
  const { primary, secondary, accent } = rules.colors;

  ctx.fillStyle = secondary;
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const ratio = spec.primary_ratio / 100;
  const skew = (spec.skew ?? 0) / 100;

  switch (spec.type) {
    case "split-vertical": {
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(OUTPUT_SIZE * (ratio + skew), 0);
      ctx.lineTo(OUTPUT_SIZE * (ratio - skew), OUTPUT_SIZE);
      ctx.lineTo(0, OUTPUT_SIZE);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "split-diagonal": {
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(OUTPUT_SIZE, 0);
      ctx.lineTo(OUTPUT_SIZE * (1 - ratio), OUTPUT_SIZE);
      ctx.lineTo(0, OUTPUT_SIZE);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "panel-left": {
      const panelWidth = OUTPUT_SIZE * ratio;
      ctx.fillStyle = primary;
      ctx.fillRect(0, 0, panelWidth, OUTPUT_SIZE);
      break;
    }
    case "panel-right": {
      const panelWidth = OUTPUT_SIZE * ratio;
      ctx.fillStyle = primary;
      ctx.fillRect(OUTPUT_SIZE - panelWidth, 0, panelWidth, OUTPUT_SIZE);
      break;
    }
    case "full-bleed": {
      ctx.fillStyle = ratio > 50 ? primary : secondary;
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      break;
    }
    case "framed": {
      const inset = rules.spacing.margin;
      ctx.fillStyle = primary;
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.fillStyle = secondary;
      ctx.fillRect(inset, inset, OUTPUT_SIZE - inset * 2, OUTPUT_SIZE - inset * 2);
      break;
    }
    case "band-bottom":
    default: {
      ctx.fillStyle = secondary;
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      break;
    }
  }

  if (spec.accent_band) {
    const bandH = OUTPUT_SIZE * (spec.accent_band.height_pct / 100);
    const bandY = spec.accent_band.position === "bottom" ? OUTPUT_SIZE - bandH : 0;
    const bandColor = spec.accent_band.color === "primary" ? primary
      : spec.accent_band.color === "accent" ? accent
      : secondary;

    ctx.fillStyle = bandColor;
    ctx.fillRect(0, bandY, OUTPUT_SIZE, bandH);
  }

  return Buffer.from(canvas.toBuffer("image/png"));
}
