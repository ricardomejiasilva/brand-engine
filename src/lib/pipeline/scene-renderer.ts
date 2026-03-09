import sharp from "sharp";
import { Scene, BrandRules, OUTPUT_SIZE } from "./types";
import { renderBackground } from "./renderers/background";
import { renderProductLayer, renderDropShadow } from "./renderers/product";
import { renderHeadline } from "./renderers/headline";
import { renderLogoLayer } from "./renderers/logo";
import { renderBadges } from "./renderers/badges";
import { renderIcons } from "./renderers/icons";
import { renderDimensions } from "./renderers/dimensions";

export async function renderScene(
  scene: Scene,
  rules: BrandRules,
  productImageBuffer: Buffer,
  brandName?: string,
): Promise<Buffer> {
  const layers: sharp.OverlayOptions[] = [];

  // 1. Background
  const bgBuffer = renderBackground(scene.background, rules);

  // 2. Product shadow + product
  const productResult = await renderProductLayer(productImageBuffer, scene.product);
  const shadowResult = await renderDropShadow(
    productResult.buffer,
    scene.product,
    productResult.left,
    productResult.top,
  );

  if (shadowResult) {
    layers.push({
      input: shadowResult.buffer,
      left: Math.max(0, shadowResult.left),
      top: Math.max(0, shadowResult.top),
    });
  }

  layers.push({
    input: productResult.buffer,
    left: productResult.left,
    top: productResult.top,
  });

  // 3. Headline
  if (scene.headline && scene.headline.text) {
    const headlineBuffer = renderHeadline(scene.headline, rules);
    layers.push({ input: headlineBuffer, left: 0, top: 0 });
  }

  // 4. Logo
  if (scene.logo) {
    const logoResult = await renderLogoLayer(scene.logo, rules.logo.url, brandName);
    if (logoResult) {
      layers.push({
        input: logoResult.buffer,
        left: logoResult.left,
        top: logoResult.top,
      });
    }
  }

  // 5. Badges
  if (scene.badges.length > 0) {
    const badgesBuffer = renderBadges(scene.badges);
    layers.push({ input: badgesBuffer, left: 0, top: 0 });
  }

  // 6. Icons
  if (scene.icons.length > 0) {
    const iconsBuffer = await renderIcons(scene.icons, rules);
    layers.push({ input: iconsBuffer, left: 0, top: 0 });
  }

  // 7. Dimensions
  if (scene.dimensions && scene.dimensions.lines.length > 0) {
    const dimBuffer = renderDimensions(scene.dimensions);
    layers.push({ input: dimBuffer, left: 0, top: 0 });
  }

  // Composite all layers
  const result = await sharp(bgBuffer)
    .resize(OUTPUT_SIZE, OUTPUT_SIZE)
    .composite(layers)
    .png()
    .toBuffer();

  return result;
}
