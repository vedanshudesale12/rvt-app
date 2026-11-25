import { mkdir } from "node:fs/promises";
import sharp from "sharp";

await mkdir("public/icons", { recursive: true });
const mark = "public/brand/rvt-mark.png";
for (const size of [192, 512, 180, 32]) {
  const name = size === 180 ? "public/icons/apple-touch-icon.png" : size === 32 ? "public/icons/favicon-32.png" : `public/icons/icon-${size}.png`;
  await sharp(mark).resize(size, size).png().toFile(name);
}
console.log("icons written");
