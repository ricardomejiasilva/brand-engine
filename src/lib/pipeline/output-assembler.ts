import sharp from "sharp";
import { OUTPUT_SIZE } from "./types";

export interface AssemblyResult {
  panels: Buffer[];
  finalImage: Buffer;
  stackedImage?: Buffer;
}

export async function assembleOutput(
  panelBuffers: Buffer[],
  mode: "single" | "stacked",
): Promise<AssemblyResult> {
  if (panelBuffers.length === 0) {
    throw new Error("No panels to assemble.");
  }

  const panels = panelBuffers;
  const finalImage = panels[0];

  if (mode === "single" || panels.length === 1) {
    return { panels, finalImage };
  }

  const totalHeight = OUTPUT_SIZE * panels.length;

  const composites: sharp.OverlayOptions[] = panels.map((buf, i) => ({
    input: buf,
    left: 0,
    top: i * OUTPUT_SIZE,
  }));

  const stackedImage = await sharp({
    create: {
      width: OUTPUT_SIZE,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  return { panels, finalImage, stackedImage };
}
