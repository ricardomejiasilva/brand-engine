"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { BrandParameters } from "@/types";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

type DesignTone = "premium" | "commercial" | "technical" | "editorial" | "minimal";
type ShadowIntensity = "subtle" | "moderate" | "strong";
type CopyTone = "elevated" | "practical" | "balanced";
type AccentLineStyle = "thin" | "medium" | "none";
type BadgeShape = "circle" | "pill" | "square" | "none";

const TEMPLATE_FAMILIES = [
  { key: "hero-split", label: "Hero Split" },
  { key: "hero-minimal", label: "Hero Minimal" },
  { key: "feature-badge", label: "Feature Badge" },
  { key: "dimension-spec", label: "Dimension Spec" },
  { key: "icon-strip", label: "Icon Strip" },
  { key: "editorial", label: "Editorial" },
];

interface BrandForm {
  brand_name: string;
  font_family: string;
  heading_font_family: string;
  body_font_family: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_style: string;
  background_vibe_description: string;
  surface_material: string;
  logo_url: string;
  design_tone: DesignTone;
  shadow_intensity: ShadowIntensity;
  copy_tone: CopyTone;
  accent_line_style: AccentLineStyle;
  badge_style: BadgeShape;
  allowed_template_families: string[];
}

const DEFAULT_FORM: BrandForm = {
  brand_name: "",
  font_family: "",
  heading_font_family: "",
  body_font_family: "",
  primary_color: "#000000",
  secondary_color: "#ffffff",
  accent_color: "",
  text_style: "italic bold",
  background_vibe_description: "",
  surface_material: "",
  logo_url: "",
  design_tone: "commercial",
  shadow_intensity: "moderate",
  copy_tone: "balanced",
  accent_line_style: "thin",
  badge_style: "circle",
  allowed_template_families: TEMPLATE_FAMILIES.map((t) => t.key),
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandParameters[]>([]);
  const [editingBrand, setEditingBrand] = useState<BrandParameters | null>(null);
  const [form, setForm] = useState<BrandForm>({ ...DEFAULT_FORM });
  const [customParams, setCustomParams] = useState<{ key: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchBrands() {
    const supabase = createClient();
    const { data } = await supabase.from("brand_parameters").select("*").order("brand_name");
    if (data) setBrands(data as BrandParameters[]);
  }

  useEffect(() => { fetchBrands(); }, []);

  function resetForm() {
    setForm({ ...DEFAULT_FORM });
    setCustomParams([]);
    setEditingBrand(null);
  }

  function startEdit(brand: BrandParameters) {
    setEditingBrand(brand);
    setForm({
      brand_name: brand.brand_name,
      font_family: brand.font_family,
      heading_font_family: brand.heading_font_family ?? "",
      body_font_family: brand.body_font_family ?? "",
      primary_color: brand.primary_color,
      secondary_color: brand.secondary_color || "#ffffff",
      accent_color: brand.accent_color ?? "",
      text_style: brand.text_style ?? "italic bold",
      background_vibe_description: brand.background_vibe_description,
      surface_material: brand.surface_material,
      logo_url: brand.logo_url ?? "",
      design_tone: brand.design_tone ?? "commercial",
      shadow_intensity: brand.shadow_intensity ?? "moderate",
      copy_tone: brand.copy_tone ?? "balanced",
      accent_line_style: brand.accent_line_style ?? "thin",
      badge_style: brand.badge_style ?? "circle",
      allowed_template_families: brand.allowed_template_families ?? TEMPLATE_FAMILIES.map((t) => t.key),
    });
    const cp = brand.custom_parameters || {};
    setCustomParams(Object.entries(cp).map(([key, value]) => ({ key, value })));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const custom_parameters: Record<string, string> = {};
      for (const { key, value } of customParams) {
        if (key.trim()) custom_parameters[key.trim()] = value;
      }

      const payload: Record<string, unknown> = {
        ...form,
        custom_parameters,
        heading_font_family: form.heading_font_family || null,
        body_font_family: form.body_font_family || null,
        accent_color: form.accent_color || null,
        logo_url: form.logo_url || null,
      };

      if (editingBrand) payload.id = editingBrand.id;

      const res = await fetch("/api/brands", {
        method: editingBrand ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save brand.");
        return;
      }

      resetForm();
      await fetchBrands();
    } catch {
      setError("Network error saving brand.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
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

  function toggleTemplate(key: string) {
    setForm((prev) => {
      const current = prev.allowed_template_families;
      return {
        ...prev,
        allowed_template_families: current.includes(key)
          ? current.filter((k) => k !== key)
          : [...current, key],
      };
    });
  }

  const input = "w-full rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/40 focus:outline-none";
  const label = "block text-xs text-foreground/50 mb-1";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Brand Library</h1>
            <p className="mt-1 text-sm text-foreground/60">Manage brand identities and design rules</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/" className="rounded-lg border border-foreground/15 px-4 py-2 text-sm text-foreground/60 hover:text-foreground transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Brand List */}
        {brands.length > 0 && (
          <div className="space-y-3 mb-8">
            {brands.map((b) => (
              <div key={b.id} className="flex items-start justify-between gap-4 rounded-xl border border-foreground/10 p-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block w-4 h-4 rounded-full border border-foreground/10" style={{ backgroundColor: b.primary_color }} />
                    <span className="inline-block w-4 h-4 rounded-full border border-foreground/10" style={{ backgroundColor: b.secondary_color }} />
                    {b.accent_color && <span className="inline-block w-4 h-4 rounded-full border border-foreground/10" style={{ backgroundColor: b.accent_color }} />}
                    <span className="font-semibold text-foreground">{b.brand_name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-foreground/50">
                    <span>{b.font_family}</span>
                    {b.design_tone && <span className="rounded bg-foreground/5 px-1.5 py-0.5">{b.design_tone}</span>}
                    {b.copy_tone && <span className="rounded bg-foreground/5 px-1.5 py-0.5">{b.copy_tone}</span>}
                    {b.shadow_intensity && <span className="rounded bg-foreground/5 px-1.5 py-0.5">shadow: {b.shadow_intensity}</span>}
                  </div>
                  <p className="mt-1 text-xs text-foreground/40 line-clamp-1">{b.background_vibe_description}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(b)} className="text-xs text-foreground/50 hover:text-foreground">Edit</button>
                  <button onClick={() => handleDelete(b.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form */}
        <div className="rounded-xl border border-foreground/10 bg-foreground/2 p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">
            {editingBrand ? `Edit "${editingBrand.brand_name}"` : "Add Brand"}
          </h2>

          {/* Core Identity */}
          <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-3">Identity</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-6">
            <div>
              <label className={label}>Brand Name</label>
              <input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} placeholder="e.g. Acopa" className={input} />
            </div>
            <div>
              <label className={label}>Logo URL</label>
              <input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://... or public/logos/brand.png" className={input} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Background Vibe Description</label>
              <textarea value={form.background_vibe_description} onChange={(e) => setForm({ ...form, background_vibe_description: e.target.value })} placeholder="Describe the brand's visual atmosphere..." rows={2} className={input + " resize-none"} />
            </div>
            <div>
              <label className={label}>Surface Material</label>
              <input value={form.surface_material} onChange={(e) => setForm({ ...form, surface_material: e.target.value })} placeholder="e.g. reclaimed wood" className={input} />
            </div>
          </div>

          {/* Typography */}
          <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-3">Typography</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
            <div>
              <label className={label}>Font Family (fallback)</label>
              <input value={form.font_family} onChange={(e) => setForm({ ...form, font_family: e.target.value })} placeholder="e.g. Georgia" className={input} />
            </div>
            <div>
              <label className={label}>Heading Font</label>
              <input value={form.heading_font_family} onChange={(e) => setForm({ ...form, heading_font_family: e.target.value })} placeholder="Optional override" className={input} />
            </div>
            <div>
              <label className={label}>Body Font</label>
              <input value={form.body_font_family} onChange={(e) => setForm({ ...form, body_font_family: e.target.value })} placeholder="Optional override" className={input} />
            </div>
            <div>
              <label className={label}>Text Style</label>
              <select value={form.text_style} onChange={(e) => setForm({ ...form, text_style: e.target.value })} className={input}>
                <option value="italic bold">Italic Bold</option>
                <option value="italic">Italic</option>
                <option value="bold">Bold</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          {/* Colors */}
          <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-3">Colors</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
            {(["primary_color", "secondary_color", "accent_color"] as const).map((field) => (
              <div key={field}>
                <label className={label}>{field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form[field] || "#000000"} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="h-9 w-9 rounded border border-foreground/15 bg-background cursor-pointer" />
                  <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className={input + " font-mono flex-1"} placeholder={field === "accent_color" ? "Optional" : ""} />
                </div>
              </div>
            ))}
          </div>

          {/* Design Rules */}
          <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-3">Design Rules</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
            <div>
              <label className={label}>Design Tone</label>
              <select value={form.design_tone} onChange={(e) => setForm({ ...form, design_tone: e.target.value as DesignTone })} className={input}>
                <option value="premium">Premium</option>
                <option value="commercial">Commercial</option>
                <option value="technical">Technical</option>
                <option value="editorial">Editorial</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
            <div>
              <label className={label}>Shadow Intensity</label>
              <select value={form.shadow_intensity} onChange={(e) => setForm({ ...form, shadow_intensity: e.target.value as ShadowIntensity })} className={input}>
                <option value="subtle">Subtle</option>
                <option value="moderate">Moderate</option>
                <option value="strong">Strong</option>
              </select>
            </div>
            <div>
              <label className={label}>Copy Tone</label>
              <select value={form.copy_tone} onChange={(e) => setForm({ ...form, copy_tone: e.target.value as CopyTone })} className={input}>
                <option value="elevated">Elevated</option>
                <option value="practical">Practical</option>
                <option value="balanced">Balanced</option>
              </select>
            </div>
            <div>
              <label className={label}>Accent Lines</label>
              <select value={form.accent_line_style} onChange={(e) => setForm({ ...form, accent_line_style: e.target.value as AccentLineStyle })} className={input}>
                <option value="thin">Thin</option>
                <option value="medium">Medium</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <label className={label}>Badge Style</label>
              <select value={form.badge_style} onChange={(e) => setForm({ ...form, badge_style: e.target.value as BadgeShape })} className={input}>
                <option value="circle">Circle</option>
                <option value="pill">Pill</option>
                <option value="square">Square</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>

          {/* Allowed Templates */}
          <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-3">Allowed Templates</h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {TEMPLATE_FAMILIES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => toggleTemplate(t.key)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  form.allowed_template_families.includes(t.key)
                    ? "border-foreground/30 bg-foreground/10 text-foreground"
                    : "border-foreground/10 text-foreground/30 hover:text-foreground/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Custom Parameters */}
          <h3 className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-3">Custom Parameters</h3>
          <div className="mb-6">
            {customParams.length === 0 && (
              <p className="text-xs text-foreground/30 italic mb-2">No custom parameters.</p>
            )}
            <div className="space-y-2 mb-2">
              {customParams.map((param, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={param.key} onChange={(e) => { const u = [...customParams]; u[i] = { ...u[i], key: e.target.value }; setCustomParams(u); }} placeholder="Key" className={input + " w-1/3"} />
                  <input value={param.value} onChange={(e) => { const u = [...customParams]; u[i] = { ...u[i], value: e.target.value }; setCustomParams(u); }} placeholder="Value" className={input + " flex-1"} />
                  <button type="button" onClick={() => setCustomParams(customParams.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:text-red-300 shrink-0">Remove</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setCustomParams([...customParams, { key: "", value: "" }])} className="text-xs text-foreground/50 hover:text-foreground">+ Add Parameter</button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t border-foreground/10 pt-4">
            <button onClick={handleSave} disabled={saving || !form.brand_name} className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? "Saving..." : editingBrand ? "Update Brand" : "Add Brand"}
            </button>
            {editingBrand && (
              <button onClick={resetForm} className="rounded-lg border border-foreground/15 px-5 py-2.5 text-sm text-foreground/60 hover:text-foreground">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
