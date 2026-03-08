# BrandEngine

Automated marketing asset creation for e-commerce products. Scrape a product page, select a brand, and generate a ready-to-use marketing image with AI-driven copy and layout.

## How It Works

1. **Scrape** -- Paste a WebstaurantStore product URL. The app extracts the title, images, price, specs, and feature details using Cheerio.
2. **Select a Brand** -- Pick from your brand library. Each brand defines its colors, font, text style, and vibe.
3. **Generate** -- The AI (Google Gemini) produces a marketing hook and decides the best layout (color split, text placement, product position, font size) for that specific product. The compositor then:
   - Removes the white background from the product image
   - Draws a two-tone diagonal background using the brand's primary and secondary colors
   - Places the product and overlays the marketing text
4. **Download** -- Get a 1409x1409 PNG ready for social media or catalogs.

## Architecture

```
src/
├── app/
│   ├── page.tsx                  # Dashboard UI (scrape, brand library, generate, results)
│   └── api/
│       ├── scrape/route.ts       # Product scraping endpoint
│       ├── generate/route.ts     # Orchestrates AI + compositor pipeline
│       └── brands/route.ts       # CRUD for brand parameters
├── lib/
│   ├── scraper.ts                # Cheerio-based product scraper
│   ├── ai/
│   │   ├── text-generator.ts     # Gemini: marketing copy + layout spec
│   │   └── image-generator.ts    # Gemini: AI image generation (unused in current flow)
│   ├── compositor.ts             # Sharp + Canvas: bg removal, background, text overlay, composite
│   └── supabase/
│       ├── client.ts             # Browser Supabase client
│       └── server.ts             # Server Supabase client
└── types/index.ts                # Shared TypeScript interfaces
```

## Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Styling**: Tailwind CSS 4
- **AI**: Google Gemini (`gemini-2.5-flash`) via `@google/genai`
- **Database**: Supabase (brand parameters storage)
- **Image Processing**: Sharp + @napi-rs/canvas
- **Scraping**: Cheerio

## Setup

### Environment Variables

Create a `.env.local` file:

```
GOOGLE_GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Supabase Schema

The `brand_parameters` table needs these columns:

| Column | Type | Default |
|--------|------|---------|
| `id` | uuid | `gen_random_uuid()` |
| `brand_name` | text | |
| `font_family` | text | |
| `primary_color` | text | |
| `secondary_color` | text | `'#ffffff'` |
| `text_style` | text | `'italic bold'` |
| `background_vibe_description` | text | |
| `surface_material` | text | |
| `custom_parameters` | jsonb | `'{}'` |
| `created_at` | timestamptz | `now()` |

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Brand Parameters

Each brand defines its visual identity:

| Field | Purpose |
|-------|---------|
| **Primary Color** | Main brand color (fills the angled panel) |
| **Secondary Color** | Contrast color (fills the other panel, used for text) |
| **Font Family** | TTF file name in `public/fonts/` or system font |
| **Text Style** | Italic Bold, Italic, Bold, or Normal |
| **Background Vibe** | Description used by AI for copy tone |
| **Surface Material** | Not used in current graphic flow, reserved for future photographic mode |

Layout decisions (split position, text placement, product alignment, font size) are made by the AI per product to create the best composition for each item.
