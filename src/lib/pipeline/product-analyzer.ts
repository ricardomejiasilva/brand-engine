import { ProductData } from "@/types";
import { ProductAnalysis, ProductCategory, ProductOrientation, ProductDimensions } from "./types";

const CATEGORY_KEYWORDS: Record<ProductCategory, string[]> = {
  mug:       ["mug", "coffee mug"],
  cup:       ["cup", "cappuccino cup", "espresso cup", "teacup"],
  bowl:      ["bowl", "soup bowl", "cereal bowl", "salad bowl", "nappie"],
  plate:     ["plate", "dinner plate", "dessert plate", "bread plate"],
  platter:   ["platter", "serving platter", "tray platter"],
  ramekin:   ["ramekin", "souffle", "sauce cup"],
  pitcher:   ["pitcher", "creamer", "carafe"],
  flatware:  ["fork", "knife", "spoon", "flatware", "silverware", "cutlery"],
  glass:     ["glass", "tumbler", "goblet", "wine glass", "pint glass"],
  tray:      ["tray", "serving tray"],
  serving:   ["serving", "tureen", "gravy boat"],
  storage:   ["container", "storage", "bin", "jar", "canister"],
  equipment: ["refrigerator", "freezer", "oven", "range", "fryer", "mixer", "blender", "slicer", "warmer", "cooler"],
  chair:     ["chair", "stool", "bar stool", "barstool", "seating", "high chair", "booster"],
  table:     ["table", "dining table", "folding table"],
  furniture: ["furniture", "booth", "bench", "stand", "rack", "shelf", "cart"],
  other:     [],
};

const MATERIAL_KEYWORDS = [
  "stoneware", "porcelain", "melamine", "glass", "crystal",
  "ceramic", "bone china", "earthenware", "vitrified",
  "stainless steel", "aluminum", "cast iron", "plastic",
  "wood", "bamboo", "acacia", "steel", "powder-coated",
];

const FLAG_PATTERNS: Record<string, RegExp> = {
  dishwasherSafe:    /dishwasher[\s-]*safe/i,
  microwaveSafe:     /microwave[\s-]*safe/i,
  ovenSafe:          /oven[\s-]*safe/i,
  stackable:         /stackable/i,
  nsf:               /\bnsf\b/i,
  leadFree:          /lead[\s-]*free/i,
  durableStoneware:  /durable\s+stoneware/i,
};

function detectCategory(title: string, specs: Record<string, string>): ProductCategory {
  const text = `${title} ${Object.values(specs).join(" ")}`.toLowerCase();

  const scored: { cat: ProductCategory; score: number }[] = [];
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === "other") continue;
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) score += kw.split(" ").length;
    }
    if (score > 0) scored.push({ cat: cat as ProductCategory, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.cat ?? "other";
}

function detectMaterial(title: string, description: string, specs: Record<string, string>): string | undefined {
  const text = `${title} ${description} ${Object.values(specs).join(" ")}`.toLowerCase();
  return MATERIAL_KEYWORDS.find((m) => text.includes(m));
}

function parseCapacity(specs: Record<string, string>, description: string): string | undefined {
  const text = `${Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join(" ")} ${description}`;
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz\.?(?:\s*capacity)?/i)
    || text.match(/(\d+(?:\.\d+)?)\s*(?:qt|quart)s?/i)
    || text.match(/capacity[:\s]*(\d+(?:\.\d+)?)\s*oz/i);
  return match ? match[0].trim() : undefined;
}

function parseDimensions(specs: Record<string, string>): ProductDimensions {
  const dims: ProductDimensions = {};

  for (const [key, val] of Object.entries(specs)) {
    const k = key.toLowerCase();
    if (k.includes("width") || k === "top diameter" || k === "diameter") {
      dims.width = val;
    } else if (k.includes("height") || k === "overall height") {
      dims.height = val;
    } else if (k.includes("depth") || k.includes("length")) {
      dims.depth = val;
    }
  }

  return dims;
}

function detectFlags(title: string, description: string, features: Record<string, string>): ProductAnalysis["flags"] {
  const text = `${title} ${description} ${Object.keys(features).join(" ")} ${Object.values(features).join(" ")}`;
  const flags: ProductAnalysis["flags"] = {
    dishwasherSafe: false,
    microwaveSafe: false,
    ovenSafe: false,
    stackable: false,
    nsf: false,
    leadFree: false,
    durableStoneware: false,
  };

  for (const [key, pattern] of Object.entries(FLAG_PATTERNS)) {
    (flags as Record<string, boolean>)[key] = pattern.test(text);
  }

  return flags;
}

function inferOrientation(category: ProductCategory): ProductOrientation {
  switch (category) {
    case "bowl":
    case "plate":
    case "platter":
    case "tray":
      return "wide";
    case "pitcher":
    case "glass":
    case "chair":
    case "table":
    case "equipment":
      return "tall";
    default:
      return "compact";
  }
}

function inferFocalHints(category: ProductCategory): ProductAnalysis["focal_hints"] {
  const zones: ProductAnalysis["focal_hints"]["avoid_zones"] = [];

  switch (category) {
    case "mug":
    case "cup":
      zones.push("right-edge");
      break;
    case "pitcher":
      zones.push("right-edge", "top-edge");
      break;
    case "bowl":
    case "plate":
      zones.push("top-edge");
      break;
    case "chair":
    case "table":
    case "furniture":
      zones.push("top-edge", "bottom-edge");
      break;
  }

  return { avoid_zones: zones };
}

export function analyzeProduct(product: ProductData): ProductAnalysis {
  const category = detectCategory(product.title, product.specs);

  return {
    category,
    orientation: inferOrientation(category),
    material: detectMaterial(product.title, product.description, product.specs),
    capacity: parseCapacity(product.specs, product.description),
    dimensions: parseDimensions(product.specs),
    flags: detectFlags(product.title, product.description, product.featureDetails),
    focal_hints: inferFocalHints(category),
  };
}
