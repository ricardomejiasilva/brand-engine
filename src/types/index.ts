import type { TemplateFamily, DesignTone, ShadowIntensity, CopyTone, AccentLineStyle, BadgeShape } from "@/lib/pipeline/types";

export type TextPosition = "upper-left" | "upper-right" | "lower-left" | "lower-right";
export type ProductAlignment = "left" | "center" | "right";
export type TextStyle = "italic bold" | "italic" | "bold" | "normal";

/** @deprecated Use Scene-based pipeline types instead */
export interface LayoutSpec {
  split_position: number;
  split_skew: number;
  text_position: TextPosition;
  product_alignment: ProductAlignment;
  product_scale: number;
  font_size: number;
}

export interface BrandParameters {
  id: string;
  brand_name: string;
  font_family: string;
  heading_font_family?: string;
  body_font_family?: string;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  text_style: TextStyle;
  background_vibe_description: string;
  surface_material: string;
  logo_url?: string;
  design_tone?: DesignTone;
  shadow_intensity?: ShadowIntensity;
  copy_tone?: CopyTone;
  accent_line_style?: AccentLineStyle;
  badge_style?: BadgeShape;
  allowed_template_families?: TemplateFamily[];
  custom_parameters: Record<string, string>;
  created_at: string;
}

export interface ProductData {
  title: string;
  brand: string;
  imageUrl: string;
  galleryImages: string[];
  price: string;
  itemNumber: string;
  mfrNumber: string;
  upc: string;
  rating: string;
  reviewCount: string;
  description: string;
  featureDetails: Record<string, string>;
  specs: Record<string, string>;
}

export interface ScrapeRequest {
  url: string;
}

export interface ScrapeResponse {
  success: boolean;
  data?: ProductData;
  error?: string;
}

export interface GenerateRequest {
  productData: ProductData;
  brandName: string;
  customPrompt?: string;
  outputMode?: "single" | "stacked";
  variationSeed?: number;
}

export interface GenerateResponse {
  success: boolean;
  originalImageUrl?: string;
  backgroundImageBase64?: string;
  finalImageBase64?: string;
  panels?: string[];
  stackedImageBase64?: string;
  marketingCopy?: string;
  variationSeed?: number;
  error?: string;
}
