import { ProductAnalysis, BrandRules, CreativePlan, Scene, TemplateFamily, BackgroundSpec, ProductPlacement, HeadlineSpec, LogoSpec, BadgeSpec, IconCalloutSpec, DimensionSpec, DimensionLine, StackStyle, SCENE_DENSITY } from "./types";

interface PlannerInput {
  analysis: ProductAnalysis;
  rules: BrandRules;
  seed: number;
  outputMode: "single" | "stacked";
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// --- Background Presets ---

interface BackgroundPreset extends BackgroundSpec {
  label: string;
}

const HERO_BG_PRESETS: BackgroundPreset[] = [
  { label: "wide-primary",   type: "split-vertical", primary_ratio: 65, skew: 0 },
  { label: "narrow-primary", type: "split-vertical", primary_ratio: 35, skew: 0 },
  { label: "balanced-skew",  type: "split-vertical", primary_ratio: 45, skew: 5 },
  { label: "heavy-primary",  type: "split-vertical", primary_ratio: 70, skew: 3 },
  { label: "panel-left",     type: "panel-left",     primary_ratio: 40, skew: 0 },
  { label: "panel-right",    type: "panel-right",    primary_ratio: 40, skew: 0 },
];

const FEATURE_BG_PRESETS: BackgroundPreset[] = [
  { label: "full-secondary", type: "full-bleed",     primary_ratio: 0,  skew: 0 },
  { label: "band-bottom",    type: "band-bottom",    primary_ratio: 75, skew: 0, accent_band: { position: "bottom", height_pct: 25, color: "primary" } },
  { label: "light-split",    type: "split-vertical", primary_ratio: 0,  skew: 0 },
];

const DIMENSION_BG_PRESETS: BackgroundPreset[] = [
  { label: "clean-white",    type: "full-bleed",  primary_ratio: 0,  skew: 0 },
  { label: "bottom-band",    type: "band-bottom", primary_ratio: 75, skew: 0, accent_band: { position: "bottom", height_pct: 20, color: "primary" } },
];

// --- Product Placement Presets ---
// Products are placed on the RIGHT side of the canvas so the left zone is free for text.

interface PlacementPreset {
  x_pct: number;
  y_pct: number;
  width_pct: number;
}

function placementPresetsForOrientation(orientation: string): PlacementPreset[] {
  switch (orientation) {
    case "wide":
      return [
        { x_pct: 68, y_pct: 48, width_pct: 58 },
        { x_pct: 65, y_pct: 46, width_pct: 56 },
        { x_pct: 70, y_pct: 50, width_pct: 54 },
      ];
    case "tall":
      return [
        { x_pct: 70, y_pct: 50, width_pct: 48 },
        { x_pct: 68, y_pct: 50, width_pct: 50 },
        { x_pct: 72, y_pct: 48, width_pct: 46 },
      ];
    default:
      return [
        { x_pct: 68, y_pct: 48, width_pct: 55 },
        { x_pct: 65, y_pct: 50, width_pct: 58 },
        { x_pct: 70, y_pct: 48, width_pct: 52 },
        { x_pct: 72, y_pct: 50, width_pct: 50 },
      ];
  }
}

// --- Text Zone Calculation ---
// Computes a text placement that is guaranteed not to overlap the product.

interface TextPreset {
  x_pct: number;
  y_pct: number;
  width_pct: number;
  align: "left" | "right" | "center";
}

function computeTextZone(placement: PlacementPreset, rand: () => number): TextPreset {
  const margin = 5;
  const safeGap = 4;
  // Products are always on the right; text goes on the left clear zone.
  const productLeftEdgePct = placement.x_pct - placement.width_pct / 2;
  const textX = margin;
  const textWidth = Math.max(22, productLeftEdgePct - safeGap - textX);
  const textY = pick([8, 33, 58], rand);
  return { x_pct: textX, y_pct: textY, width_pct: textWidth, align: "left" };
}

// --- Scene Builders ---

function buildHeroScene(input: PlannerInput, rand: () => number): Scene {
  const { analysis, rules } = input;
  const bg = pick(HERO_BG_PRESETS.filter((p) => {
    if (p.type === "panel-left" && analysis.focal_hints.avoid_zones.includes("left-edge")) return false;
    if (p.type === "panel-right" && analysis.focal_hints.avoid_zones.includes("right-edge")) return false;
    return true;
  }), rand) ?? HERO_BG_PRESETS[0];

  const placementPresets = placementPresetsForOrientation(analysis.orientation);
  const placement = pick(placementPresets, rand);
  const text = computeTextZone(placement, rand);

  const shadow = rules.shadows;

  return {
    template_family: "hero-split",
    purpose: "hero",
    background: { type: bg.type, primary_ratio: bg.primary_ratio, skew: bg.skew, accent_band: bg.accent_band },
    product: {
      ...placement,
      anchor: "center",
      rotation_deg: 0,
      shadow: {
        enabled: true,
        blur: shadow.blur,
        opacity: shadow.opacity,
        offset_y: 15,
        scale_x: 0.85,
      },
    },
    headline: {
      text: "",
      ...text,
      font_size: clamp(38 + Math.floor(rand() * 10), 34, 52),
      line_height: 1.3,
      max_lines: 4,
      color: rules.colors.secondary,
      divider_above: rules.lines.style !== "none" ? { enabled: true, width_pct: 15, thickness: rules.lines.thickness, color: rules.colors.secondary, offset: 12 } : undefined,
      divider_below: rules.lines.style !== "none" ? { enabled: true, width_pct: 15, thickness: rules.lines.thickness, color: rules.colors.secondary, offset: 12 } : undefined,
    },
    logo: {
      placement: "top-right",
      scale: 0.12,
      clear_space: rules.spacing.margin,
    },
    badges: [],
    icons: [],
  };
}

function buildFeatureScene(input: PlannerInput, rand: () => number): Scene {
  const { analysis, rules } = input;
  const bg = pick(FEATURE_BG_PRESETS, rand);
  const density = SCENE_DENSITY["feature-badge"];

  const badges: BadgeSpec[] = [];
  if (analysis.capacity && density.max_badges > 0) {
    badges.push({
      text: analysis.capacity,
      x_pct: 70 + Math.floor(rand() * 10),
      y_pct: 45 + Math.floor(rand() * 15),
      size: 120,
      shape: rules.badges.shape === "none" ? "circle" : (rules.badges.shape === "square" ? "pill" : rules.badges.shape as "circle" | "pill"),
      fill: rules.badges.fill,
      text_color: rules.badges.text_color,
      font_size: 22,
    });
  }

  const icons: IconCalloutSpec[] = [];
  const flagKeys = Object.entries(analysis.flags)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const iconCount = Math.min(flagKeys.length, density.max_icons);
  const iconSpacing = 100 / (iconCount + 1);
  for (let i = 0; i < iconCount; i++) {
    icons.push({
      icon_key: flagKeys[i],
      label: flagKeys[i].replace(/([A-Z])/g, " $1").trim(),
      x_pct: iconSpacing * (i + 1),
      y_pct: 88,
    });
  }

  return {
    template_family: "feature-badge",
    purpose: "feature",
    background: { type: bg.type, primary_ratio: bg.primary_ratio, skew: bg.skew, accent_band: bg.accent_band },
    product: {
      x_pct: 50,
      y_pct: 40,
      width_pct: 70,
      anchor: "center",
      rotation_deg: 0,
      shadow: { enabled: true, blur: rules.shadows.blur, opacity: rules.shadows.opacity, offset_y: 12, scale_x: 0.9 },
    },
    headline: analysis.material ? {
      text: "",
      x_pct: 5,
      y_pct: 5,
      width_pct: 40,
      align: "left",
      font_size: 28,
      line_height: 1.3,
      max_lines: 2,
      color: rules.colors.primary,
    } : undefined,
    logo: {
      placement: "top-left",
      scale: 0.12,
      clear_space: rules.spacing.margin,
    },
    badges,
    icons,
  };
}

function buildDimensionScene(input: PlannerInput, rand: () => number): Scene {
  const { analysis, rules } = input;
  const bg = pick(DIMENSION_BG_PRESETS, rand);
  const density = SCENE_DENSITY["dimension-spec"];

  const dimensionLines: DimensionLine[] = [];
  if (analysis.dimensions.width) {
    dimensionLines.push({
      orientation: "horizontal",
      start_pct: { x: 20, y: 25 },
      end_pct: { x: 80, y: 25 },
      label: analysis.dimensions.width,
      label_position: "center",
    });
  }
  if (analysis.dimensions.height) {
    dimensionLines.push({
      orientation: "vertical",
      start_pct: { x: 82, y: 30 },
      end_pct: { x: 82, y: 80 },
      label: analysis.dimensions.height,
      label_position: "center",
    });
  }

  const icons: IconCalloutSpec[] = [];
  const flagKeys = Object.entries(analysis.flags).filter(([, v]) => v).map(([k]) => k);
  const iconCount = Math.min(flagKeys.length, density.max_icons);
  const iconSpacing = 100 / (iconCount + 1);
  for (let i = 0; i < iconCount; i++) {
    icons.push({
      icon_key: flagKeys[i],
      label: flagKeys[i].replace(/([A-Z])/g, " $1").trim(),
      x_pct: iconSpacing * (i + 1),
      y_pct: 92,
    });
  }

  return {
    template_family: "dimension-spec",
    purpose: "dimension",
    background: { type: bg.type, primary_ratio: bg.primary_ratio, skew: bg.skew, accent_band: bg.accent_band },
    product: {
      x_pct: 50,
      y_pct: 50,
      width_pct: 60,
      anchor: "center",
      rotation_deg: 0,
      shadow: { enabled: true, blur: rules.shadows.blur * 0.7, opacity: rules.shadows.opacity * 0.7, offset_y: 10, scale_x: 0.85 },
    },
    logo: {
      placement: pick(["top-right", "top-left"] as const, rand),
      scale: 0.10,
      clear_space: rules.spacing.margin,
    },
    badges: [],
    icons,
    dimensions: dimensionLines.length > 0 ? { lines: dimensionLines } : undefined,
  };
}

// --- Main Planner ---

function selectSceneTypes(analysis: ProductAnalysis, rules: BrandRules, outputMode: "single" | "stacked"): TemplateFamily[] {
  const allowed = new Set(rules.allowed_templates);
  const scenes: TemplateFamily[] = [];

  const heroChoice: TemplateFamily = allowed.has("hero-split") ? "hero-split" : "hero-minimal";
  scenes.push(heroChoice);

  if (outputMode === "single") return scenes;

  const hasFeatureData = analysis.capacity || analysis.material ||
    Object.values(analysis.flags).some(Boolean);
  if (hasFeatureData && allowed.has("feature-badge")) {
    scenes.push("feature-badge");
  }

  const hasDimensions = analysis.dimensions.width || analysis.dimensions.height;
  if (hasDimensions && allowed.has("dimension-spec")) {
    scenes.push("dimension-spec");
  }

  return scenes;
}

export function createDeterministicPlan(input: PlannerInput): CreativePlan {
  const rand = seededRandom(input.seed);
  const sceneTypes = selectSceneTypes(input.analysis, input.rules, input.outputMode);

  const scenes: Scene[] = [];
  for (const family of sceneTypes) {
    switch (family) {
      case "hero-split":
      case "hero-minimal":
        scenes.push(buildHeroScene(input, rand));
        break;
      case "feature-badge":
        scenes.push(buildFeatureScene(input, rand));
        break;
      case "dimension-spec":
        scenes.push(buildDimensionScene(input, rand));
        break;
    }
  }

  const stackStyle: StackStyle | undefined = input.outputMode === "stacked" ? {
    dominant_background: "secondary",
    accent_style: input.rules.lines.style,
    logo_treatment: input.rules.logo.default_placement,
    copy_tone: input.rules.copy_tone,
  } : undefined;

  return {
    rationale: `Deterministic plan for ${input.analysis.category} (${input.analysis.orientation}). Seed: ${input.seed}.`,
    scenes,
    output_mode: input.outputMode,
    stack_style: stackStyle,
  };
}
