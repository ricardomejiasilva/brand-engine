-- Brand Parameters table
CREATE TABLE IF NOT EXISTS brand_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT UNIQUE NOT NULL,
  font_family TEXT NOT NULL,
  heading_font_family TEXT,
  body_font_family TEXT,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL DEFAULT '#ffffff',
  accent_color TEXT,
  text_style TEXT DEFAULT 'italic bold',
  background_vibe_description TEXT NOT NULL,
  surface_material TEXT NOT NULL,
  logo_url TEXT,
  design_tone TEXT DEFAULT 'commercial',
  shadow_intensity TEXT DEFAULT 'moderate',
  copy_tone TEXT DEFAULT 'balanced',
  accent_line_style TEXT DEFAULT 'thin',
  badge_style TEXT DEFAULT 'circle',
  allowed_template_families JSONB DEFAULT '["hero-split","hero-minimal","feature-badge","dimension-spec","icon-strip","editorial"]'::jsonb,
  custom_parameters JSONB DEFAULT '{}'::jsonb,
  sample_image_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns if table already exists (safe migration)
DO $$ BEGIN
  ALTER TABLE brand_parameters ADD COLUMN IF NOT EXISTS heading_font_family TEXT;
  ALTER TABLE brand_parameters ADD COLUMN IF NOT EXISTS body_font_family TEXT;
  ALTER TABLE brand_parameters ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#ffffff';
  ALTER TABLE brand_parameters ADD COLUMN IF NOT EXISTS accent_color TEXT;
  ALTER TABLE brand_parameters ADD COLUMN IF NOT EXISTS text_style TEXT DEFAULT 'italic bold';
  ALTER TABLE brand_parameters ADD COLUMN IF NOT EXISTS logo_url TEXT;
  ALTER TABLE brand_parameters ADD COLUMN IF NOT EXISTS design_tone TEXT DEFAULT 'commercial';
  ALTER TABLE brand_parameters ADD COLUMN IF NOT EXISTS shadow_intensity TEXT DEFAULT 'moderate';
  ALTER TABLE brand_parameters ADD COLUMN IF NOT EXISTS copy_tone TEXT DEFAULT 'balanced';
  ALTER TABLE brand_parameters ADD COLUMN IF NOT EXISTS accent_line_style TEXT DEFAULT 'thin';
  ALTER TABLE brand_parameters ADD COLUMN IF NOT EXISTS badge_style TEXT DEFAULT 'circle';
  ALTER TABLE brand_parameters ADD COLUMN IF NOT EXISTS allowed_template_families JSONB DEFAULT '["hero-split","hero-minimal","feature-badge","dimension-spec","icon-strip","editorial"]'::jsonb;
  ALTER TABLE brand_parameters ADD COLUMN IF NOT EXISTS sample_image_urls JSONB DEFAULT '[]'::jsonb;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Seed data
INSERT INTO brand_parameters (brand_name, font_family, primary_color, secondary_color, background_vibe_description, surface_material, logo_url, design_tone, copy_tone, sample_image_urls)
VALUES
  (
    'Acopa',
    'Georgia',
    '#00A0E3',
    '#ffffff',
    'Clean, modern product photography with solid color blocks. Professional catalog aesthetic with bold brand presence.',
    'clean white',
    '/logos/acopa.png',
    'premium',
    'elevated',
    '["/brand-samples/acopa/acopa-sample-1.png","/brand-samples/acopa/acopa-sample-2.png","/brand-samples/acopa/acopa-sample-3.png"]'::jsonb
  ),
  (
    'Vigor',
    'Arial Black',
    '#2F4F4F',
    '#ffffff',
    'An industrial commercial kitchen environment with stainless steel surfaces, cool blue-white lighting, and a professional, no-nonsense atmosphere.',
    'brushed stainless steel',
    'commercial',
    'practical'
  ),
  (
    'Choice',
    'Helvetica',
    '#1A1A2E',
    '#ffffff',
    'A clean, modern restaurant prep area with white marble countertops, bright even lighting, and a minimalist professional setting.',
    'white marble',
    'minimal',
    'balanced'
  )
ON CONFLICT (brand_name) DO NOTHING;

-- Backfill sample images for existing Acopa row
UPDATE brand_parameters
SET sample_image_urls = '["/brand-samples/acopa/acopa-sample-1.png","/brand-samples/acopa/acopa-sample-2.png","/brand-samples/acopa/acopa-sample-3.png"]'::jsonb
WHERE brand_name = 'Acopa' AND (sample_image_urls IS NULL OR sample_image_urls = '[]'::jsonb);
