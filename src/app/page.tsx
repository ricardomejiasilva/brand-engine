"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BrandParameters,
  ProductData,
  ScrapeResponse,
  GenerateResponse,
} from "@/types";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [brands, setBrands] = useState<BrandParameters[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [scraping, setScraping] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [outputMode, setOutputMode] = useState<"single" | "stacked">("single");

  async function fetchBrands() {
    const supabase = createClient();
    const { data } = await supabase
      .from("brand_parameters")
      .select("*")
      .order("brand_name");

    if (data) {
      setBrands(data as BrandParameters[]);
    }
  }

  useEffect(() => {
    fetchBrands();
  }, []);

  async function handleScrape() {
    setError("");
    setProductData(null);
    setResult(null);
    setSelectedImage(0);
    setScraping(true);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data: ScrapeResponse = await res.json();

      if (!data.success || !data.data) {
        setError(data.error || "Failed to scrape product.");
        return;
      }

      setProductData(data.data);
    } catch {
      setError("Network error while scraping.");
    } finally {
      setScraping(false);
    }
  }

  async function handleGenerate(seed?: number) {
    if (!productData || !selectedBrand) return;

    setError("");
    setResult(null);
    setGenerating(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productData: {
            ...productData,
            imageUrl: productData.galleryImages[selectedImage] || productData.imageUrl,
          },
          brandName: selectedBrand,
          customPrompt: customPrompt || undefined,
          outputMode,
          variationSeed: seed,
        }),
      });

      const data: GenerateResponse = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to generate image.");
        return;
      }

      setResult(data);
    } catch {
      setError("Network error while generating.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              BrandEngine
            </h1>
            <p className="mt-1 text-sm text-foreground/60">
              Automated marketing asset creation for e-commerce products
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/brands"
              className="rounded-lg border border-foreground/15 px-4 py-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
            >
              Manage Brands ({brands.length})
            </Link>
          </div>
        </div>

        {/* Input Section */}
        <div className="rounded-xl border border-foreground/10 bg-foreground/2 p-6 mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="url"
                className="block text-sm font-medium text-foreground/80 mb-1.5"
              >
                Product URL
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.webstaurantstore.com/..."
                className="w-full rounded-lg border border-foreground/15 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
            </div>
            <button
              onClick={handleScrape}
              disabled={!url || scraping}
              className="rounded-lg bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {scraping ? "Scraping..." : "Scrape Product"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Product Data */}
        {productData && (
          <div className="rounded-xl border border-foreground/10 bg-foreground/2 p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Extracted Product
            </h2>
            <div className="flex flex-col gap-6 md:flex-row">
              {productData.galleryImages.length > 0 && (
                <div className="shrink-0 flex flex-col gap-2 w-48">
                  <button
                    onClick={() => setGalleryOpen(true)}
                    className="relative cursor-zoom-in"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={productData.galleryImages[selectedImage]}
                      alt={productData.title}
                      className="h-48 w-48 rounded-lg border border-foreground/10 object-contain bg-white"
                    />
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      Selected for output
                    </span>
                  </button>
                  {productData.galleryImages.length > 1 && (
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() =>
                          setSelectedImage(
                            (selectedImage - 1 + productData.galleryImages.length) %
                              productData.galleryImages.length
                          )
                        }
                        className="rounded-full border border-foreground/15 hover:bg-foreground/5 w-7 h-7 flex items-center justify-center text-sm text-foreground/50"
                      >
                        &#8249;
                      </button>
                      <span className="text-xs text-foreground/40">
                        {selectedImage + 1} / {productData.galleryImages.length}
                      </span>
                      <button
                        onClick={() =>
                          setSelectedImage(
                            (selectedImage + 1) % productData.galleryImages.length
                          )
                        }
                        className="rounded-full border border-foreground/15 hover:bg-foreground/5 w-7 h-7 flex items-center justify-center text-sm text-foreground/50"
                      >
                        &#8250;
                      </button>
                    </div>
                  )}
                  {productData.galleryImages.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto max-w-[12rem] pb-1">
                      {productData.galleryImages.map((imgUrl, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedImage(i)}
                          className={`shrink-0 rounded border bg-white overflow-hidden ${
                            i === selectedImage
                              ? "border-foreground/40 ring-1 ring-foreground/20"
                              : "border-foreground/10 hover:border-foreground/30"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt={`${productData.title} ${i + 1}`}
                            className="h-9 w-9 object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h3 className="font-medium text-foreground">
                    {productData.title}
                  </h3>
                  {productData.price && (
                    <span className="text-sm font-semibold text-foreground/80">
                      {productData.price}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/50">
                  {productData.brand && <span>Brand: {productData.brand}</span>}
                  {productData.itemNumber && <span>Item #: {productData.itemNumber}</span>}
                  {productData.mfrNumber && <span>MFR #: {productData.mfrNumber}</span>}
                  {productData.upc && <span>UPC: {productData.upc}</span>}
                  {productData.rating && (
                    <span>
                      {productData.rating}/5
                      {productData.reviewCount && ` (${productData.reviewCount} reviews)`}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-foreground/60 line-clamp-3">
                  {productData.description}
                </p>
                {Object.keys(productData.featureDetails).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs font-medium text-foreground/50 cursor-pointer hover:text-foreground/70">
                      Feature Details ({Object.keys(productData.featureDetails).length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {Object.entries(productData.featureDetails).map(([heading, body]) => (
                        <div key={heading} className="text-xs">
                          <span className="font-medium text-foreground/70">{heading}:</span>{" "}
                          <span className="text-foreground/50">{body}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {Object.keys(productData.specs).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(productData.specs).slice(0, 8).map(([key, val]) => (
                      <span key={key} className="inline-flex items-center rounded-md bg-foreground/5 px-2.5 py-1 text-xs text-foreground/70">
                        <span className="font-medium">{key}:</span>&nbsp;{val}
                      </span>
                    ))}
                    {Object.keys(productData.specs).length > 8 && (
                      <span className="inline-flex items-center rounded-md bg-foreground/5 px-2.5 py-1 text-xs text-foreground/40">
                        +{Object.keys(productData.specs).length - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Generation Controls */}
            <div className="mt-6 border-t border-foreground/10 pt-6 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1 max-w-xs">
                  <label htmlFor="brand" className="block text-sm font-medium text-foreground/80 mb-1.5">
                    Select Brand
                  </label>
                  <select
                    id="brand"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full rounded-lg border border-foreground/15 bg-background px-4 py-2.5 text-sm text-foreground focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                  >
                    <option value="">Choose a brand...</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.brand_name}>{b.brand_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOutputMode(outputMode === "single" ? "stacked" : "single")}
                    className="rounded-lg border border-foreground/15 px-4 py-2.5 text-sm text-foreground/60 hover:text-foreground transition-colors"
                  >
                    {outputMode === "single" ? "Single" : "Stacked"}
                  </button>
                  <button
                    onClick={() => handleGenerate()}
                    disabled={!selectedBrand || generating}
                    className="rounded-lg bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {generating ? "Generating..." : "Generate"}
                  </button>
                </div>
              </div>

              {/* Custom Prompt */}
              <div>
                <label className="block text-xs text-foreground/50 mb-1.5">Creative Direction (optional)</label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. 'make it minimal', 'emphasize dimensions', 'editorial feel', 'focus on durability'..."
                  rows={2}
                  className="w-full rounded-lg border border-foreground/15 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20 resize-none"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["Minimal", "Editorial", "Bold", "Premium", "Technical"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomPrompt((prev) => prev ? `${prev}, ${preset.toLowerCase()}` : preset.toLowerCase())}
                      className="rounded-md border border-foreground/10 px-2.5 py-1 text-xs text-foreground/50 hover:text-foreground hover:border-foreground/30 transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {generating && (
          <div className="mb-8 flex items-center justify-center rounded-xl border border-foreground/10 bg-foreground/2 py-20">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
              <p className="text-sm text-foreground/60">Generating marketing asset...</p>
              <p className="mt-1 text-xs text-foreground/40">This may take 15-30 seconds</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && result.success && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Generated Assets</h2>
                {result.marketingCopy && (
                  <p className="text-sm text-foreground/60 italic mt-1">
                    &ldquo;{result.marketingCopy}&rdquo;
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {result.variationSeed != null && (
                  <span className="text-xs text-foreground/30 font-mono">seed: {result.variationSeed}</span>
                )}
                <button
                  onClick={() => handleGenerate()}
                  disabled={generating}
                  className="rounded-lg border border-foreground/15 px-4 py-2 text-sm text-foreground/60 hover:text-foreground transition-colors disabled:opacity-40"
                >
                  Regenerate
                </button>
              </div>
            </div>

            {/* Stacked or single display */}
            {result.stackedImageBase64 ? (
              <div className="rounded-xl border border-foreground/10 overflow-hidden">
                <div className="bg-foreground/5 px-4 py-2.5 text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Stacked Output ({result.panels?.length ?? 0} panels)
                </div>
                <div className="p-4 flex items-center justify-center bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${result.stackedImageBase64}`}
                    alt="Stacked marketing panels"
                    className="max-h-[900px] object-contain"
                  />
                </div>
              </div>
            ) : result.finalImageBase64 ? (
              <div className="rounded-xl border border-foreground/10 overflow-hidden">
                <div className="bg-foreground/5 px-4 py-2.5 text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Final Marketing Image
                </div>
                <div className="p-4 flex items-center justify-center bg-white min-h-[300px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${result.finalImageBase64}`}
                    alt="Final composite marketing image"
                    className="max-h-[600px] object-contain"
                  />
                </div>
              </div>
            ) : null}

            {/* Individual panels */}
            {result.panels && result.panels.length > 1 && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {result.panels.map((panel, i) => (
                  <div key={i} className="rounded-xl border border-foreground/10 overflow-hidden">
                    <div className="bg-foreground/5 px-3 py-2 text-xs font-medium text-foreground/60 uppercase tracking-wider">
                      Panel {i + 1}
                    </div>
                    <div className="p-2 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${panel}`}
                        alt={`Panel ${i + 1}`}
                        className="w-full object-contain"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Download */}
            <div className="mt-6 flex justify-end gap-3">
              {result.stackedImageBase64 && (
                <a
                  href={`data:image/png;base64,${result.stackedImageBase64}`}
                  download="brand-engine-stacked.png"
                  className="rounded-lg border border-foreground/15 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                >
                  Download Stacked
                </a>
              )}
              {result.finalImageBase64 && (
                <a
                  href={`data:image/png;base64,${result.finalImageBase64}`}
                  download="brand-engine-output.png"
                  className="rounded-lg border border-foreground/15 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                >
                  Download Image
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Gallery Modal */}
      {galleryOpen && productData && productData.galleryImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setGalleryOpen(false)}
        >
          <div
            className="relative flex flex-col items-center gap-4 max-w-3xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setGalleryOpen(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-2xl"
            >
              &times;
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productData.galleryImages[selectedImage]}
              alt={productData.title}
              className="max-h-[70vh] w-auto rounded-lg object-contain bg-white"
            />
            {productData.galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto max-w-full pb-2">
                {productData.galleryImages.map((imgUrl, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`shrink-0 rounded border bg-white overflow-hidden ${
                      i === selectedImage
                        ? "border-white ring-2 ring-white/50"
                        : "border-white/20 hover:border-white/50"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={`${productData.title} ${i + 1}`}
                      className="h-16 w-16 object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
