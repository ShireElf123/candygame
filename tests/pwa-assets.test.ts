import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type ManifestIcon = { src: string; sizes: string; type: string; purpose?: string };
type WebManifest = { start_url: string; scope: string; icons: ManifestIcon[] };

const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8')) as WebManifest;
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('PWA icon assets', () => {
  it.each([192, 512] as const)('declares and ships a valid %i pixel PNG icon', size => {
    const iconPath = `./jam-shift-icon-${size}.png`;
    const icon = manifest.icons.find(candidate => candidate.src === iconPath);
    const bytes = readFileSync(new URL(`../public/jam-shift-icon-${size}.png`, import.meta.url));

    expect(icon).toMatchObject({ src: iconPath, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' });
    expect(bytes.subarray(0, 8)).toEqual(pngSignature);
    expect(bytes.readUInt32BE(16)).toBe(size);
    expect(bytes.readUInt32BE(20)).toBe(size);
  });

  it('keeps the iOS touch icon and all install icons in the offline shell', () => {
    const appleIcon = readFileSync(new URL('../public/jam-shift-icon-180.png', import.meta.url));
    expect(indexHtml).toContain('rel="apple-touch-icon" sizes="180x180" href="./jam-shift-icon-180.png"');
    expect(appleIcon.subarray(0, 8)).toEqual(pngSignature);
    expect(appleIcon.readUInt32BE(16)).toBe(180);
    expect(appleIcon.readUInt32BE(20)).toBe(180);
    expect(serviceWorker).toContain("const CACHE_NAME = 'jam-shift-shell-v7'");
    expect(serviceWorker).toContain('...PRECACHE_ASSETS.map(asset => new URL(asset, APP_BASE).href)');
    expect(viteConfig).toContain('serviceWorkerPrecachePlugin()');
    for (const size of [180, 192, 512]) expect(serviceWorker).toContain(`./jam-shift-icon-${size}.png`);
  });

  it('uses in-scope relative launch and cache paths', () => {
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    expect(manifest.icons.some(icon => icon.type === 'image/svg+xml' && icon.sizes === 'any')).toBe(true);
  });
});
