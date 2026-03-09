import path from "path";
import fs from "fs";

export interface IconEntry {
  key: string;
  label: string;
  svgContent: string;
}

const LUCIDE_DIR = path.join(
  process.cwd(),
  "node_modules",
  "lucide-static",
  "icons",
);

const ICON_MAP: Record<string, { label: string; lucide: string }> = {
  dishwasherSafe: { label: "Dishwasher Safe", lucide: "washing-machine" },
  microwaveSafe: { label: "Microwave Safe", lucide: "zap" },
  ovenSafe: { label: "Oven Safe", lucide: "flame" },
  durableStoneware: { label: "Durable Stoneware", lucide: "shield-check" },
  stackable: { label: "Stackable", lucide: "layers" },
  nsf: { label: "NSF Listed", lucide: "badge-check" },
  leadFree: { label: "Lead Free", lucide: "leaf" },
  freezerSafe: { label: "Freezer Safe", lucide: "snowflake" },
  recycled: { label: "Recycled Material", lucide: "recycle" },
  handWash: { label: "Hand Wash", lucide: "hand" },
  temperatureResistant: { label: "Temp. Resistant", lucide: "thermometer" },
  commercial: { label: "Commercial Grade", lucide: "award" },
  bpaFree: { label: "BPA Free", lucide: "circle-check" },
  scratchResistant: { label: "Scratch Resistant", lucide: "shield-check" },
  waterproof: { label: "Waterproof", lucide: "droplet" },
};

const CUSTOM_ICON_DIR = path.join(process.cwd(), "public", "icons");
const CUSTOM_EXTS = [".svg", ".png"];

function readLucideSvg(name: string): string | null {
  const filePath = path.join(LUCIDE_DIR, `${name}.svg`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

function findCustomIconFile(filename: string): string | null {
  for (const ext of CUSTOM_EXTS) {
    const p = path.join(CUSTOM_ICON_DIR, `${filename}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function resolveIcons(flagKeys: string[]): IconEntry[] {
  const entries: IconEntry[] = [];

  for (const key of flagKeys) {
    const mapping = ICON_MAP[key];
    if (!mapping) continue;

    const customPath = findCustomIconFile(key);
    if (customPath?.endsWith(".svg")) {
      const svg = fs.readFileSync(customPath, "utf-8");
      entries.push({ key, label: mapping.label, svgContent: svg });
      continue;
    }

    const svg = readLucideSvg(mapping.lucide);
    if (svg) {
      entries.push({ key, label: mapping.label, svgContent: svg });
    }
  }

  return entries;
}

export function getAvailableIconKeys(): string[] {
  return Object.keys(ICON_MAP);
}

export function colorizeSvg(svg: string, color: string): string {
  return svg
    .replace(/stroke="currentColor"/g, `stroke="${color}"`)
    .replace(/fill="none"/g, `fill="none"`)
    .replace(/width="24"/g, `width="64"`)
    .replace(/height="24"/g, `height="64"`)
    .replace(/viewBox="0 0 24 24"/g, `viewBox="0 0 24 24"`);
}
