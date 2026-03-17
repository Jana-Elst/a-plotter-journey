// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
import { defineConfig } from 'astro/config'

export default defineConfig({
	site: 'https://www.janaelst.be/',
	base: '/a-plotter-journey',
	integrations: [mdx(), sitemap()],
})
