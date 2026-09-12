import { defineConfig } from "astro/config";
import searchDb from "./src/lib/search/integration";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: 'https://patcheados.org',
  integrations: [searchDb(), sitemap()],
});
