import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET all brands
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_parameters")
    .select("*")
    .order("brand_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST create a new brand
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    brand_name, font_family, primary_color, secondary_color,
    text_style, background_vibe_description, surface_material,
  } = body;

  if (!brand_name || !font_family || !primary_color || !secondary_color || !background_vibe_description || !surface_material) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_parameters")
    .insert({
      brand_name, font_family, primary_color, secondary_color,
      text_style: text_style ?? "italic bold",
      background_vibe_description, surface_material,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PUT update an existing brand
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Brand id is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_parameters")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE a brand
export async function DELETE(request: NextRequest) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "Brand id is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("brand_parameters")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
