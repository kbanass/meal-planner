import { defineConfig } from '@vite-pwa/assets-generator/config';

// The source icon is full-bleed on the theme colour with the plate inside the
// maskable safe zone, so no padding is added.
const resizeOptions = { background: '#2f6f4f' };

export default defineConfig({
  preset: {
    transparent: { sizes: [192, 512], padding: 0, resizeOptions },
    maskable: { sizes: [512], padding: 0, resizeOptions },
    apple: { sizes: [180], padding: 0, resizeOptions },
  },
  images: ['public/icons/icon.svg'],
});
