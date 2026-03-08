"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BrandParameters,
  ProductData,
  ScrapeResponse,
  GenerateResponse,
} from "@/types";

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
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandParameters | null>(null);
  const [brandForm, setBrandForm] = useState({
    brand_name: "",
    font_family: "",
    primary_color: "#000000",
    secondary_color: "#ffffff",
    text_style: "italic bold" as string,
    background_vibe_description: "",
    surface_material: "",
  });
  const [customParams, setCustomParams] = useState<{ key: string; value: string }[]>([]);
  const [brandSaving, setBrandSaving] = useState(false);

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

  function resetBrandForm() {
    setBrandForm({
      brand_name: "",
      font_family: "",
      primary_color: "#000000",
      secondary_color: "#ffffff",
      text_style: "italic bold",
      background_vibe_description: "",
      surface_material: "",
    });
    setCustomParams([]);
    setEditingBrand(null);
  }

  function startEditBrand(brand: BrandParameters) {
    setEditingBrand(brand);
    setBrandForm({
      brand_name: brand.brand_name,
      font_family: brand.font_family,
      primary_color: brand.primary_color,
      secondary_color: brand.secondary_color || "#ffffff",
      text_style: brand.text_style ?? "italic bold",
      background_vibe_description: brand.background_vibe_description,
      surface_material: brand.surface_material,
    });
    const cp = brand.custom_parameters || {};
    setCustomParams(Object.entries(cp).map(([key, value]) => ({ key, value })));
  }

  async function handleSaveBrand() {
    setBrandSaving(true);
    try {
      const custom_parameters: Record<string, string> = {};
      for (const { key, value } of customParams) {
        if (key.trim()) custom_parameters[key.trim()] = value;
      }

      const method = editingBrand ? "PUT" : "POST";
      const body = editingBrand
        ? { id: editingBrand.id, ...brandForm, custom_parameters }
        : { ...brandForm, custom_parameters };

      const res = await fetch("/api/brands", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save brand.");
        return;
      }

      resetBrandForm();
      await fetchBrands();
    } catch {
      setError("Network error saving brand.");
    } finally {
      setBrandSaving(false);
    }
  }

  async function handleDeleteBrand(id: string) {
    try {
      const res = await fetch("/api/brands", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete brand.");
        return;
      }

      await fetchBrands();
    } catch {
      setError("Network error deleting brand.");
    }
  }

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

  async function handleGenerate() {
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
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            BrandEngine
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Automated marketing asset creation for e-commerce products
          </p>
        </div>

        {/* Brand Library */}
        <div className="rounded-xl border border-foreground/10 bg-foreground/2 mb-8">
          <button
            onClick={() => setBrandsOpen(!brandsOpen)}
            className="w-full flex items-center justify-between p-4 text-sm font-medium text-foreground/80 hover:text-foreground"
          >
            <span>Brand Library ({brands.length})</span>
            <span className="text-foreground/40">{brandsOpen ? "−" : "+"}</span>
          </button>

          {brandsOpen && (
            <div className="border-t border-foreground/10 p-6">
              {/* Existing brands */}
              {brands.length > 0 && (
                <div className="space-y-3 mb-6">
                  {brands.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-start justify-between gap-4 rounded-lg border border-foreground/10 p-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-full border border-foreground/10"
                            style={{ backgroundColor: b.primary_color }}
                          />
                          <span
                            className="inline-block w-3 h-3 rounded-full border border-foreground/10"
                            style={{ backgroundColor: b.secondary_color }}
                          />
                          <span className="font-medium text-sm text-foreground">
                            {b.brand_name}
                          </span>
                          <span className="text-xs text-foreground/40">
                            {b.font_family}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-foreground/50 line-clamp-1">
                          {b.background_vibe_description}
                        </p>
                        <span className="text-xs text-foreground/40">
                          Surface: {b.surface_material}
                        </span>
                        {b.custom_parameters && Object.keys(b.custom_parameters).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {Object.entries(b.custom_parameters).map(([k, v]) => (
                              <span
                                key={k}
                                className="inline-flex items-center rounded bg-foreground/5 px-1.5 py-0.5 text-[10px] text-foreground/50"
                              >
                                <span className="font-medium">{k}:</span>&nbsp;{v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => startEditBrand(b)}
                          className="text-xs text-foreground/50 hover:text-foreground"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBrand(b.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add / Edit form */}
              <div className="border-t border-foreground/10 pt-5">
                <h3 className="text-sm font-medium text-foreground/80 mb-3">
                  {editingBrand ? `Edit "${editingBrand.brand_name}"` : "Add Brand"}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-foreground/50 mb-1">
                      Brand Name
                    </label>
                    <input
                      value={brandForm.brand_name}
                      onChange={(e) =>
                        setBrandForm({ ...brandForm, brand_name: e.target.value })
                      }
                      placeholder="e.g. Acopa"
                      className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/50 mb-1">
                      Font Family
                    </label>
                    <input
                      value={brandForm.font_family}
                      onChange={(e) =>
                        setBrandForm({ ...brandForm, font_family: e.target.value })
                      }
                      placeholder="e.g. Georgia"
                      className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/50 mb-1">
                      Primary Color
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={brandForm.primary_color}
                        onChange={(e) =>
                          setBrandForm({ ...brandForm, primary_color: e.target.value })
                        }
                        className="h-9 w-9 rounded border border-foreground/15 bg-background cursor-pointer"
                      />
                      <input
                        value={brandForm.primary_color}
                        onChange={(e) =>
                          setBrandForm({ ...brandForm, primary_color: e.target.value })
                        }
                        className="flex-1 rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground font-mono focus:border-foreground/40 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/50 mb-1">
                      Secondary Color
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={brandForm.secondary_color}
                        onChange={(e) =>
                          setBrandForm({ ...brandForm, secondary_color: e.target.value })
                        }
                        className="h-9 w-9 rounded border border-foreground/15 bg-background cursor-pointer"
                      />
                      <input
                        value={brandForm.secondary_color}
                        onChange={(e) =>
                          setBrandForm({ ...brandForm, secondary_color: e.target.value })
                        }
                        className="flex-1 rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground font-mono focus:border-foreground/40 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/50 mb-1">
                      Surface Material
                    </label>
                    <input
                      value={brandForm.surface_material}
                      onChange={(e) =>
                        setBrandForm({ ...brandForm, surface_material: e.target.value })
                      }
                      placeholder="e.g. reclaimed wood"
                      className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/50 mb-1">
                      Text Style
                    </label>
                    <select
                      value={brandForm.text_style}
                      onChange={(e) =>
                        setBrandForm({ ...brandForm, text_style: e.target.value })
                      }
                      className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground focus:border-foreground/40 focus:outline-none"
                    >
                      <option value="italic bold">Italic Bold</option>
                      <option value="italic">Italic</option>
                      <option value="bold">Bold</option>
                      <option value="normal">Normal</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-foreground/50 mb-1">
                      Background Vibe Description
                    </label>
                    <textarea
                      value={brandForm.background_vibe_description}
                      onChange={(e) =>
                        setBrandForm({
                          ...brandForm,
                          background_vibe_description: e.target.value,
                        })
                      }
                      placeholder="Describe the brand's visual atmosphere for AI image generation..."
                      rows={2}
                      className="w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Custom Parameters */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-foreground/50">
                        Custom Parameters
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomParams([...customParams, { key: "", value: "" }])
                        }
                        className="text-xs text-foreground/50 hover:text-foreground"
                      >
                        + Add
                      </button>
                    </div>
                    {customParams.length === 0 && (
                      <p className="text-xs text-foreground/30 italic">
                        No custom parameters. Click &quot;+ Add&quot; to create one.
                      </p>
                    )}
                    <div className="space-y-2">
                      {customParams.map((param, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input
                            value={param.key}
                            onChange={(e) => {
                              const updated = [...customParams];
                              updated[i] = { ...updated[i], key: e.target.value };
                              setCustomParams(updated);
                            }}
                            placeholder="Key"
                            className="w-1/3 rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none"
                          />
                          <input
                            value={param.value}
                            onChange={(e) => {
                              const updated = [...customParams];
                              updated[i] = { ...updated[i], value: e.target.value };
                              setCustomParams(updated);
                            }}
                            placeholder="Value"
                            className="flex-1 rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setCustomParams(customParams.filter((_, j) => j !== i))
                            }
                            className="text-xs text-red-400 hover:text-red-300 shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleSaveBrand}
                    disabled={brandSaving || !brandForm.brand_name}
                    className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {brandSaving
                      ? "Saving..."
                      : editingBrand
                        ? "Update Brand"
                        : "Add Brand"}
                  </button>
                  {editingBrand && (
                    <button
                      onClick={resetBrandForm}
                      className="rounded-lg border border-foreground/15 px-4 py-2 text-sm text-foreground/60 hover:text-foreground"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
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
                  {/* Main image — click to open modal */}
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
                  {/* Arrows + counter */}
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
                  {/* Thumbnails */}
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
                  {productData.itemNumber && (
                    <span>Item #: {productData.itemNumber}</span>
                  )}
                  {productData.mfrNumber && (
                    <span>MFR #: {productData.mfrNumber}</span>
                  )}
                  {productData.upc && <span>UPC: {productData.upc}</span>}
                  {productData.rating && (
                    <span>
                      {productData.rating}/5
                      {productData.reviewCount &&
                        ` (${productData.reviewCount} reviews)`}
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
                      {Object.entries(productData.featureDetails).map(
                        ([heading, body]) => (
                          <div key={heading} className="text-xs">
                            <span className="font-medium text-foreground/70">
                              {heading}:
                            </span>{" "}
                            <span className="text-foreground/50">{body}</span>
                          </div>
                        )
                      )}
                    </div>
                  </details>
                )}
                {Object.keys(productData.specs).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(productData.specs)
                      .slice(0, 8)
                      .map(([key, val]) => (
                        <span
                          key={key}
                          className="inline-flex items-center rounded-md bg-foreground/5 px-2.5 py-1 text-xs text-foreground/70"
                        >
                          <span className="font-medium">{key}:</span>&nbsp;
                          {val}
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

            {/* Brand Selection & Generate */}
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end border-t border-foreground/10 pt-6">
              <div className="flex-1 max-w-xs">
                <label
                  htmlFor="brand"
                  className="block text-sm font-medium text-foreground/80 mb-1.5"
                >
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
                    <option key={b.id} value={b.brand_name}>
                      {b.brand_name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleGenerate}
                disabled={!selectedBrand || generating}
                className="rounded-lg bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generating ? "Generating..." : "Generate Image"}
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {generating && (
          <div className="mb-8 flex items-center justify-center rounded-xl border border-foreground/10 bg-foreground/2 py-20">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
              <p className="text-sm text-foreground/60">
                Generating marketing asset...
              </p>
              <p className="mt-1 text-xs text-foreground/40">
                This may take 15-30 seconds
              </p>
            </div>
          </div>
        )}

        {/* Results - 3 Column Display */}
        {result && result.success && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              Generated Assets
            </h2>
            {result.marketingCopy && (
              <p className="text-sm text-foreground/60 mb-6 italic">
                &ldquo;{result.marketingCopy}&rdquo;
              </p>
            )}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Original Product */}
              <div className="rounded-xl border border-foreground/10 overflow-hidden">
                <div className="bg-foreground/5 px-4 py-2.5 text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Original Product
                </div>
                <div className="p-4 flex items-center justify-center bg-white min-h-[300px]">
                  {result.originalImageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={result.originalImageUrl}
                      alt="Original product"
                      className="max-h-72 object-contain"
                    />
                  )}
                </div>
              </div>

              {/* AI Background */}
              <div className="rounded-xl border border-foreground/10 overflow-hidden">
                <div className="bg-foreground/5 px-4 py-2.5 text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Brand Background
                </div>
                <div className="p-4 flex items-center justify-center bg-white min-h-[300px]">
                  {result.backgroundImageBase64 && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`data:image/png;base64,${result.backgroundImageBase64}`}
                      alt="AI-generated background"
                      className="max-h-72 object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Final Composite */}
              <div className="rounded-xl border border-foreground/10 overflow-hidden">
                <div className="bg-foreground/5 px-4 py-2.5 text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Final Marketing Image
                </div>
                <div className="p-4 flex items-center justify-center bg-white min-h-[300px]">
                  {result.finalImageBase64 && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`data:image/png;base64,${result.finalImageBase64}`}
                      alt="Final composite marketing image"
                      className="max-h-72 object-contain"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Download */}
            {result.finalImageBase64 && (
              <div className="mt-6 flex justify-end">
                <a
                  href={`data:image/png;base64,${result.finalImageBase64}`}
                  download="brand-engine-output.png"
                  className="rounded-lg border border-foreground/15 px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                >
                  Download Final Image
                </a>
              </div>
            )}
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
            {/* Close button */}
            <button
              onClick={() => setGalleryOpen(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-2xl"
            >
              &times;
            </button>

            {/* Large image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productData.galleryImages[selectedImage]}
              alt={productData.title}
              className="max-h-[70vh] w-auto rounded-lg object-contain bg-white"
            />

            {/* Scrollable thumbnails */}
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
