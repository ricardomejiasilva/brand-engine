import { BrandParameters } from "@/types";
import {
  BrandRules,
  DesignTone,
  ShadowIntensity,
  CopyTone,
  AccentLineStyle,
  BadgeShape,
  TemplateFamily,
} from "./types";

const ALL_TEMPLATES: TemplateFamily[] = [
  "hero-split", "hero-minimal", "feature-badge",
  "dimension-spec", "icon-strip", "editorial",
];

const SPACING: Record<DesignTone, { margin: number; padding: number }> = {
  premium:    { margin: 80, padding: 60 },
  editorial:  { margin: 70, padding: 50 },
  commercial: { margin: 60, padding: 40 },
  technical:  { margin: 50, padding: 35 },
  minimal:    { margin: 90, padding: 70 },
};

const SHADOW_CONFIG: Record<ShadowIntensity, { blur: number; opacity: number }> = {
  subtle:   { blur: 20, opacity: 0.15 },
  moderate: { blur: 35, opacity: 0.25 },
  strong:   { blur: 50, opacity: 0.40 },
};

const LINE_THICKNESS: Record<AccentLineStyle, number> = {
  thin: 1,
  medium: 2,
  none: 0,
};

export function deriveBrandRules(brand: BrandParameters): BrandRules {
  const designTone: DesignTone = brand.design_tone ?? "commercial";
  const shadowIntensity: ShadowIntensity = brand.shadow_intensity ?? "moderate";
  const copyTone: CopyTone = brand.copy_tone ?? "balanced";
  const accentLineStyle: AccentLineStyle = brand.accent_line_style ?? "thin";
  const badgeShape: BadgeShape = brand.badge_style ?? "circle";

  return {
    colors: {
      primary: brand.primary_color,
      secondary: brand.secondary_color,
      accent: brand.accent_color ?? brand.primary_color,
    },
    typography: {
      heading_family: brand.heading_font_family ?? brand.font_family,
      body_family: brand.body_font_family ?? brand.font_family,
      heading_style: brand.text_style ?? "italic bold",
      body_style: "normal",
    },
    spacing: SPACING[designTone],
    lines: {
      thickness: LINE_THICKNESS[accentLineStyle],
      style: accentLineStyle,
    },
    shadows: {
      intensity: shadowIntensity,
      ...SHADOW_CONFIG[shadowIntensity],
    },
    badges: {
      shape: badgeShape,
      fill: brand.accent_color ?? brand.primary_color,
      text_color: brand.secondary_color,
    },
    logo: {
      url: brand.logo_url,
      min_scale: 0.08,
      max_scale: 0.18,
      default_placement: "top-right",
    },
    allowed_templates: brand.allowed_template_families ?? ALL_TEMPLATES,
    copy_tone: copyTone,
    design_tone: designTone,
  };
}
