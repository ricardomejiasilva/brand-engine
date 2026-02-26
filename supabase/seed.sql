-- Brand Parameters table
CREATE TABLE IF NOT EXISTS brand_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT UNIQUE NOT NULL,
  font_family TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  background_vibe_description TEXT NOT NULL,
  surface_material TEXT NOT NULL,
  custom_parameters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed data
INSERT INTO brand_parameters (brand_name, font_family, primary_color, background_vibe_description, surface_material)
VALUES
  (
    'Acopa',
    'Georgia',
    '#8B4513',
    'A rustic farmhouse table setting with warm golden lighting, earthy tones, and natural textures. Cozy and inviting atmosphere reminiscent of a countryside kitchen.',
    'reclaimed wood'
  ),
  (
    'Vigor',
    'Arial Black',
    '#2F4F4F',
    'An industrial commercial kitchen environment with stainless steel surfaces, cool blue-white lighting, and a professional, no-nonsense atmosphere.',
    'brushed stainless steel'
  ),
  (
    'Choice',
    'Helvetica',
    '#1A1A2E',
    'A clean, modern restaurant prep area with white marble countertops, bright even lighting, and a minimalist professional setting.',
    'white marble'
  )
ON CONFLICT (brand_name) DO NOTHING;
