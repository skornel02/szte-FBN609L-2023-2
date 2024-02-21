import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: 'https://skornel02.github.io',
  base: '/szte-FBN609L-2023-2',
  markdown: {
    gfm: true,
    syntaxHighlight: 'prism',
  },
  integrations: [
    tailwind(),
  ],
});