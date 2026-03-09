import { Scene, CreativePlan, OUTPUT_SIZE, SCENE_DENSITY } from "./types";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rectOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function validateScene(scene: Scene): Scene {
  const fixed = { ...scene };
  const density = SCENE_DENSITY[scene.template_family];

  // Clamp product placement
  fixed.product = {
    ...fixed.product,
    x_pct: clamp(fixed.product.x_pct, 10, 90),
    y_pct: clamp(fixed.product.y_pct, 10, 90),
    width_pct: clamp(fixed.product.width_pct, 30, 85),
    rotation_deg: clamp(fixed.product.rotation_deg, -5, 5),
  };

  // Clamp headline if present
  if (fixed.headline) {
    fixed.headline = {
      ...fixed.headline,
      x_pct: clamp(fixed.headline.x_pct, 2, 80),
      y_pct: clamp(fixed.headline.y_pct, 2, 90),
      width_pct: clamp(fixed.headline.width_pct, 15, 50),
      font_size: clamp(fixed.headline.font_size, 20, 60),
      max_lines: clamp(fixed.headline.max_lines, 1, 6),
    };

    if (!density.has_headline) {
      fixed.headline = undefined;
    }
  }

  // Clamp logo
  if (fixed.logo) {
    fixed.logo = {
      ...fixed.logo,
      scale: clamp(fixed.logo.scale, 0.05, 0.25),
      clear_space: clamp(fixed.logo.clear_space, 20, 120),
    };
    if (!density.has_logo) {
      fixed.logo = undefined;
    }
  }

  // Enforce badge density limit
  if (fixed.badges.length > density.max_badges) {
    fixed.badges = fixed.badges.slice(0, density.max_badges);
  }
  fixed.badges = fixed.badges.map((b) => ({
    ...b,
    x_pct: clamp(b.x_pct, 5, 95),
    y_pct: clamp(b.y_pct, 5, 95),
    size: clamp(b.size, 60, 180),
    font_size: clamp(b.font_size, 14, 32),
  }));

  // Enforce icon density limit
  if (fixed.icons.length > density.max_icons) {
    fixed.icons = fixed.icons.slice(0, density.max_icons);
  }
  fixed.icons = fixed.icons.map((ic) => ({
    ...ic,
    x_pct: clamp(ic.x_pct, 5, 95),
    y_pct: clamp(ic.y_pct, 5, 95),
  }));

  // Remove dimensions if not allowed
  if (!density.has_dimensions) {
    fixed.dimensions = undefined;
  }

  // Check headline/product overlap and fix if needed
  if (fixed.headline) {
    const productRect = {
      x: (fixed.product.x_pct / 100) * OUTPUT_SIZE - (fixed.product.width_pct / 100 * OUTPUT_SIZE) / 2,
      y: (fixed.product.y_pct / 100) * OUTPUT_SIZE - (fixed.product.width_pct / 100 * OUTPUT_SIZE) / 2,
      w: (fixed.product.width_pct / 100) * OUTPUT_SIZE,
      h: (fixed.product.width_pct / 100) * OUTPUT_SIZE,
    };

    const headlineRect = {
      x: (fixed.headline.x_pct / 100) * OUTPUT_SIZE,
      y: (fixed.headline.y_pct / 100) * OUTPUT_SIZE,
      w: (fixed.headline.width_pct / 100) * OUTPUT_SIZE,
      h: fixed.headline.font_size * fixed.headline.line_height * fixed.headline.max_lines,
    };

    if (rectOverlap(productRect, headlineRect)) {
      if (fixed.product.x_pct > 50) {
        fixed.headline.x_pct = clamp(fixed.headline.x_pct, 2, 35);
      } else {
        fixed.headline.x_pct = clamp(60, 60, 80);
      }
    }
  }

  return fixed;
}

export function validatePlan(plan: CreativePlan): CreativePlan {
  return {
    ...plan,
    scenes: plan.scenes.map(validateScene),
  };
}
