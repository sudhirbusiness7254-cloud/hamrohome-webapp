import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// High-resolution SVG of Bazzaro brand icon
// 512x512, squircle with gradient, bold 'B' with commerce sparkle
const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="45%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.28" />
    </filter>
    <filter id="bShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#7c2d12" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Base squircle with shadow -->
  <rect x="24" y="24" width="464" height="464" rx="116" fill="url(#bgGrad)" filter="url(#shadow)" />
  
  <!-- Subtle glass sheen overlay -->
  <rect x="24" y="24" width="464" height="232" rx="116" fill="url(#sheen)" />

  <!-- Inner border ring -->
  <rect x="28" y="28" width="456" height="456" rx="112" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.3" />

  <!-- Iconic bold 'B' letter mark -->
  <g filter="url(#bShadow)" fill="#ffffff">
    <!-- Main stem + top/bottom bowls of B -->
    <path d="M 160 116
             L 280 116
             C 340 116, 376 142, 376 190
             C 376 226, 350 250, 314 260
             C 362 272, 392 302, 392 346
             C 392 402, 344 436, 276 436
             L 160 436
             Z
             M 232 178
             L 232 244
             L 272 244
             C 298 244, 314 234, 314 211
             C 314 188, 298 178, 272 178
             Z
             M 232 308
             L 232 374
             L 276 374
             C 304 374, 322 362, 322 341
             C 322 320, 304 308, 276 308
             Z" />
  </g>

  <!-- Marketplace sparkle / star in top right -->
  <path d="M 408 80
           C 408 98, 422 112, 440 112
           C 422 112, 408 126, 408 144
           C 408 126, 394 112, 376 112
           C 394 112, 408 98, 408 80 Z"
        fill="#ffffff" opacity="0.95" />
</svg>`;

async function main() {
  const publicDir = path.join(process.cwd(), "public");
  const appDir = path.join(process.cwd(), "src", "app");

  await mkdir(publicDir, { recursive: true });
  await mkdir(appDir, { recursive: true });

  const svgBuffer = Buffer.from(svgLogo);

  // 1. Write SVGs
  await writeFile(path.join(publicDir, "icon.svg"), svgBuffer);
  await writeFile(path.join(publicDir, "favicon.svg"), svgBuffer);
  await writeFile(path.join(appDir, "icon.svg"), svgBuffer);

  // 2. Generate PNG sizes
  const p16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const p32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const p48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  const p180 = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  const p192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();
  const p512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();

  await writeFile(path.join(publicDir, "favicon-16x16.png"), p16);
  await writeFile(path.join(publicDir, "favicon-32x32.png"), p32);
  await writeFile(path.join(publicDir, "favicon.png"), p32);
  await writeFile(path.join(publicDir, "apple-touch-icon.png"), p180);
  await writeFile(path.join(publicDir, "icon-192.png"), p192);
  await writeFile(path.join(publicDir, "icon-512.png"), p512);

  // In modern browsers, a 32x32 PNG file served as favicon.ico works universally
  await writeFile(path.join(publicDir, "favicon.ico"), p32);
  await writeFile(path.join(appDir, "favicon.ico"), p32);
  await writeFile(path.join(appDir, "apple-icon.png"), p180);

  // 3. Web Manifest for PWA and mobile / Google Chrome new tab bookmarks
  const manifest = {
    name: "Bazzaro — Nepal Multi-Vendor Marketplace",
    short_name: "Bazzaro",
    description: "Nepal's trusted multi-vendor marketplace. Shop electronics, fashion, groceries and more from verified local sellers.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#f59e0b",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };

  await writeFile(path.join(publicDir, "site.webmanifest"), JSON.stringify(manifest, null, 2));

  console.log("Favicon and logo icons successfully generated!");
}

main().catch(console.error);
