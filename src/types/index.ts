export interface BrandParameters {
  id: string;
  brand_name: string;
  font_family: string;
  primary_color: string;
  background_vibe_description: string;
  surface_material: string;
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
}

export interface GenerateResponse {
  success: boolean;
  originalImageUrl?: string;
  backgroundImageBase64?: string;
  finalImageBase64?: string;
  marketingCopy?: string;
  error?: string;
}
