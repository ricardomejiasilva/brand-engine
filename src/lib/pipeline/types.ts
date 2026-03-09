export const OUTPUT_SIZE = 1409;

// --- Template & Layout Enums ---

export type TemplateFamily =
  | "hero-split"
  | "hero-minimal"
  | "feature-badge"
  | "dimension-spec"
  | "icon-strip"
  | "editorial";

export type BackgroundType =
  | "split-vertical"
  | "split-diagonal"
  | "panel-left"
  | "panel-right"
  | "band-bottom"
  | "full-bleed"
  | "framed";

export type DesignTone = "premium" | "commercial" | "technical" | "editorial" | "minimal";
export type ShadowIntensity = "subtle" | "moderate" | "strong";
export type CopyTone = "elevated" | "practical" | "balanced";
export type AccentLineStyle = "thin" | "medium" | "none";
export type BadgeShape = "circle" | "pill" | "square" | "none";
export type LogoPlacement = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type TextAlign = "left" | "center" | "right";

// --- Scene Component Specs ---

export interface BackgroundSpec {
  type: BackgroundType;
  primary_ratio: number;
  skew: number;
  accent_band?: {
    position: "top" | "bottom";
    height_pct: number;
    color: "primary" | "secondary" | "accent";
  };
}

export interface ShadowSpec {
  enabled: boolean;
  blur: number;
  opacity: number;
  offset_y: number;
  scale_x: number;
}

export interface ProductPlacement {
  x_pct: number;
  y_pct: number;
  width_pct: number;
  anchor: "center" | "top-center" | "bottom-center";
  rotation_deg: number;
  shadow: ShadowSpec;
}

export interface DividerLine {
  enabled: boolean;
  width_pct: number;
  thickness: number;
  color: string;
  offset: number;
}

export interface HeadlineSpec {
  text: string;
  x_pct: number;
  y_pct: number;
  width_pct: number;
  align: TextAlign;
  font_size: number;
  line_height: number;
  max_lines: number;
  color: string;
  eyebrow?: string;
  divider_above?: DividerLine;
  divider_below?: DividerLine;
}

export interface LogoSpec {
  placement: LogoPlacement;
  scale: number;
  clear_space: number;
}

export interface BadgeSpec {
  text: string;
  x_pct: number;
  y_pct: number;
  size: number;
  shape: "circle" | "pill";
  fill: string;
  text_color: string;
  font_size: number;
}

export interface IconCalloutSpec {
  icon_key: string;
  label: string;
  x_pct: number;
  y_pct: number;
}

export interface DimensionLine {
  orientation: "horizontal" | "vertical";
  start_pct: { x: number; y: number };
  end_pct: { x: number; y: number };
  label: string;
  label_position: "start" | "center" | "end";
}

export interface DimensionSpec {
  lines: DimensionLine[];
}

// --- Scene ---

export interface Scene {
  template_family: TemplateFamily;
  purpose: "hero" | "feature" | "dimension" | "utility";
  background: BackgroundSpec;
  product: ProductPlacement;
  headline?: HeadlineSpec;
  logo?: LogoSpec;
  badges: BadgeSpec[];
  icons: IconCalloutSpec[];
  dimensions?: DimensionSpec;
}

// --- Creative Plan ---

export interface StackStyle {
  dominant_background: "primary" | "secondary";
  accent_style: AccentLineStyle;
  logo_treatment: LogoPlacement;
  copy_tone: CopyTone;
}

export interface CreativePlan {
  rationale: string;
  scenes: Scene[];
  output_mode: "single" | "stacked";
  stack_style?: StackStyle;
}

// --- Product Analysis ---

export type ProductOrientation = "wide" | "tall" | "compact";

export type ProductCategory =
  | "mug" | "cup" | "bowl" | "plate" | "platter"
  | "ramekin" | "pitcher" | "flatware" | "glass"
  | "tray" | "serving" | "storage" | "equipment"
  | "chair" | "table" | "furniture" | "other";

export interface ProductDimensions {
  width?: string;
  height?: string;
  depth?: string;
}

export interface ProductAnalysis {
  category: ProductCategory;
  orientation: ProductOrientation;
  material?: string;
  capacity?: string;
  dimensions: ProductDimensions;
  flags: {
    dishwasherSafe: boolean;
    microwaveSafe: boolean;
    ovenSafe: boolean;
    stackable: boolean;
    nsf: boolean;
    leadFree: boolean;
    durableStoneware: boolean;
  };
  focal_hints: {
    avoid_zones: ("left-edge" | "right-edge" | "top-edge" | "bottom-edge")[];
  };
}

// --- Brand Rules (derived from BrandParameters) ---

export interface BrandRules {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  typography: {
    heading_family: string;
    body_family: string;
    heading_style: string;
    body_style: string;
  };
  spacing: {
    margin: number;
    padding: number;
  };
  lines: {
    thickness: number;
    style: AccentLineStyle;
  };
  shadows: {
    intensity: ShadowIntensity;
    blur: number;
    opacity: number;
  };
  badges: {
    shape: BadgeShape;
    fill: string;
    text_color: string;
  };
  logo: {
    url?: string;
    min_scale: number;
    max_scale: number;
    default_placement: LogoPlacement;
  };
  allowed_templates: TemplateFamily[];
  copy_tone: CopyTone;
  design_tone: DesignTone;
}

// --- Scene Density Limits ---

export interface SceneDensityBudget {
  max_badges: number;
  max_icons: number;
  max_accent_systems: number;
  has_headline: boolean;
  has_logo: boolean;
  has_dimensions: boolean;
}

export const SCENE_DENSITY: Record<TemplateFamily, SceneDensityBudget> = {
  "hero-split": { max_badges: 0, max_icons: 0, max_accent_systems: 2, has_headline: true, has_logo: true, has_dimensions: false },
  "hero-minimal": { max_badges: 0, max_icons: 0, max_accent_systems: 1, has_headline: true, has_logo: true, has_dimensions: false },
  "feature-badge": { max_badges: 1, max_icons: 3, max_accent_systems: 1, has_headline: true, has_logo: true, has_dimensions: false },
  "dimension-spec": { max_badges: 0, max_icons: 3, max_accent_systems: 0, has_headline: false, has_logo: true, has_dimensions: true },
  "icon-strip": { max_badges: 0, max_icons: 4, max_accent_systems: 1, has_headline: true, has_logo: false, has_dimensions: false },
  "editorial": { max_badges: 1, max_icons: 0, max_accent_systems: 2, has_headline: true, has_logo: true, has_dimensions: false },
};
